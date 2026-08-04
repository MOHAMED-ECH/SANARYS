import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import type { PrismaClient } from "@sanarys/db";

/**
 * Service d'authentification.
 *
 * IMPORTANT : implementation de premiere partie (mot de passe + session
 * serveur), volontairement encapsulee derriere cette classe pour pouvoir
 * etre remplacee par un fournisseur OIDC/SSO sans toucher aux routes ni aux
 * pages (cahier des charges section 16.1). Elle n'est PAS equivalente a un
 * fournisseur d'identite eprouve : MFA non implemente a ce stade.
 */

const SESSION_TTL_MS = 12 * 3600 * 1000;
const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

/** Verrouillage progressif : au-dela de ce seuil, le compte est bloque temporairement. */
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const generateToken = () => randomBytes(32).toString("base64url");

export class InvalidCredentialsError extends Error {}
export class AccountLockedError extends Error {}
export class InvalidTokenError extends Error {}

export interface SessionContext {
  sessionId: string;
  userId: string;
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  /**
   * Verifie les identifiants. Le message d'erreur est identique que l'email
   * soit inconnu ou le mot de passe faux : aucune enumeration de comptes.
   */
  async verifyCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.passwordHash || user.status !== "ACTIVE") {
      // Cout constant : on hashe quand meme pour ne pas reveler l'existence du compte.
      await argon2.hash(password).catch(() => undefined);
      throw new InvalidCredentialsError("Identifiants invalides.");
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new AccountLockedError(
        "Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans quelques minutes.",
      );
    }

    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);

    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      throw new InvalidCredentialsError("Identifiants invalides.");
    }

    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    return user;
  }

  /**
   * Cree une session. La rotation est assuree par l'appelant : toute
   * connexion revoque les sessions precedentes du meme utilisateur si
   * demande (deconnexion des autres appareils).
   */
  async createSession(userId: string, meta: { ip?: string; userAgent?: string }) {
    const token = generateToken();
    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return { token, session };
  }

  async resolveSession(token: string): Promise<SessionContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return { sessionId: session.id, userId: session.userId };
  }

  async revokeSession(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /** Deconnecte tous les appareils de l'utilisateur. */
  async revokeAllSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Cree une invitation. Le token en clair n'est retourne qu'une seule fois. */
  async createInvite(userId: string): Promise<string> {
    const token = generateToken();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        inviteTokenHash: hashToken(token),
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
    return token;
  }

  async acceptInvite(token: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { inviteTokenHash: hashToken(token) },
    });

    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt.getTime() < Date.now()) {
      throw new InvalidTokenError("Invitation invalide ou expirée.");
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.hashPassword(password),
        status: "ACTIVE",
        activatedAt: new Date(),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });
  }

  /**
   * Prepare une reinitialisation. Retourne toujours sans erreur meme si le
   * compte n'existe pas : la reponse ne doit pas reveler qui est inscrit.
   */
  async createPasswordReset(email: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return null;

    const token = generateToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: hashToken(token),
        resetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    return token;
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetTokenHash: hashToken(token) },
    });

    if (!user || !user.resetExpiresAt || user.resetExpiresAt.getTime() < Date.now()) {
      throw new InvalidTokenError("Lien de réinitialisation invalide ou expiré.");
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.hashPassword(password),
        resetTokenHash: null,
        resetExpiresAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Changer de mot de passe invalide toutes les sessions existantes.
    await this.revokeAllSessions(user.id);
    return updated;
  }
}

/** Comparaison a temps constant, utilisee pour le jeton anti-CSRF. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
