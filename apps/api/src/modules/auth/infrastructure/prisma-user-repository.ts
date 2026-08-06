import type { PrismaClient } from "@sanarys/db";
import type { LockoutState } from "../domain/credentials.js";
import type {
  AuthenticatableUser,
  UserAccountRepository,
  UserProfile,
} from "../domain/ports.js";

/**
 * Seul fichier du module auth qui connaisse Prisma (guide, section 10.1).
 *
 * Les emails sont normalises ici, a l'entree de la persistance : le domaine
 * n'a pas a savoir qu'on stocke en minuscules.
 */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class PrismaUserAccountRepository implements UserAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAuthenticatableByEmail(email: string): Promise<AuthenticatableUser | null> {
    const row = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      staffRole: row.staffRole,
      passwordHash: row.passwordHash,
      status: row.status,
      mfaEnabled: row.mfaEnabled,
      lockout: { failedLoginCount: row.failedLoginCount, lockedUntil: row.lockedUntil },
    };
  }

  async findProfile(userId: string): Promise<UserProfile | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { organization: true } } },
    });
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      staffRole: row.staffRole,
      memberships: row.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        organizationType: m.organization.type,
        role: m.role,
      })),
    };
  }

  async findIdByEmail(email: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findPasswordHash(userId: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return row?.passwordHash ?? null;
  }

  async updateLockout(userId: string, state: LockoutState): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: state.failedLoginCount, lockedUntil: state.lockedUntil },
    });
  }

  async findByInviteTokenHash(hash: string): Promise<{ id: string; expiresAt: Date | null } | null> {
    const row = await this.prisma.user.findUnique({
      where: { inviteTokenHash: hash },
      select: { id: true, inviteExpiresAt: true },
    });
    return row ? { id: row.id, expiresAt: row.inviteExpiresAt } : null;
  }

  async findByResetTokenHash(hash: string): Promise<{ id: string; expiresAt: Date | null } | null> {
    const row = await this.prisma.user.findUnique({
      where: { resetTokenHash: hash },
      select: { id: true, resetExpiresAt: true },
    });
    return row ? { id: row.id, expiresAt: row.resetExpiresAt } : null;
  }

  async storeInviteToken(userId: string, hash: string, expiresAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { inviteTokenHash: hash, inviteExpiresAt: expiresAt },
    });
  }

  async storeResetToken(userId: string, hash: string, expiresAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { resetTokenHash: hash, resetExpiresAt: expiresAt },
    });
  }

  async activateWithPassword(
    userId: string,
    passwordHash: string,
    activatedAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: "ACTIVE",
        activatedAt,
        // L'invitation est consommee : le jeton ne peut pas etre rejoue.
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });
  }

  async replacePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetExpiresAt: null,
        // Reinitialiser le mot de passe libere aussi un compte verrouille :
        // l'utilisateur legitime ne reste pas bloque par l'attaque subie.
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }
}
