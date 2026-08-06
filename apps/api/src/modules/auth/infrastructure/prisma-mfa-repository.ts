import type { PrismaClient } from "@sanarys/db";
import type {
  MfaChallengeRecord,
  MfaChallengeRepository,
  MfaRepository,
  MfaState,
} from "../domain/ports.js";

/**
 * Persistance du second facteur. Seuls fichiers du module a connaitre Prisma,
 * avec le depot des comptes et celui des sessions.
 */
export class PrismaMfaRepository implements MfaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findState(userId: string): Promise<MfaState | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaSecret: true,
        mfaConfirmedAt: true,
        _count: { select: { recoveryCodes: { where: { usedAt: null } } } },
      },
    });
    if (!row) return null;

    return {
      enabled: row.mfaEnabled,
      secret: row.mfaSecret,
      confirmedAt: row.mfaConfirmedAt,
      remainingRecoveryCodes: row._count.recoveryCodes,
    };
  }

  async storeSecret(userId: string, secret: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });
  }

  async activate(userId: string, confirmedAt: Date, recoveryCodeHashes: string[]): Promise<void> {
    // Transaction : activer le facteur sans deposer les codes de secours
    // laisserait l'utilisateur sans issue en cas de perte du telephone.
    await this.prisma.$transaction([
      this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.mfaRecoveryCode.createMany({
        data: recoveryCodeHashes.map((codeHash) => ({ userId, codeHash })),
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true, mfaConfirmedAt: confirmedAt },
      }),
    ]);
  }

  async deactivate(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.mfaChallenge.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null, mfaConfirmedAt: null },
      }),
    ]);
  }

  async consumeRecoveryCode(userId: string, codeHash: string, usedAt: Date): Promise<boolean> {
    // `updateMany` avec `usedAt: null` dans la clause de filtre rend la
    // consommation atomique : deux requetes simultanees portant le meme code
    // ne peuvent pas reussir toutes les deux, la seconde ne trouvant plus de
    // ligne a mettre a jour.
    const result = await this.prisma.mfaRecoveryCode.updateMany({
      where: { userId, codeHash, usedAt: null },
      data: { usedAt },
    });
    return result.count === 1;
  }
}

export class PrismaMfaChallengeRepository implements MfaChallengeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    ip: string | null;
    expiresAt: Date;
  }): Promise<MfaChallengeRecord> {
    const row = await this.prisma.mfaChallenge.create({ data });
    return { id: row.id, userId: row.userId };
  }

  async findPendingByTokenHash(tokenHash: string, now: Date): Promise<MfaChallengeRecord | null> {
    const row = await this.prisma.mfaChallenge.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });
    return row ?? null;
  }

  async consume(challengeId: string, consumedAt: Date): Promise<void> {
    await this.prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { consumedAt },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.mfaChallenge.deleteMany({ where: { userId } });
  }
}
