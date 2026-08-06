import type { PrismaClient } from "@sanarys/db";
import type { SessionRecord, SessionRepository } from "../domain/ports.js";

/** Sessions serveur revocables. Aucun objet ORM ne franchit cette frontiere. */
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    ip: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const row = await this.prisma.session.create({ data });
    return { id: row.id, userId: row.userId };
  }

  async findActiveByTokenHash(tokenHash: string, now: Date): Promise<SessionRecord | null> {
    const row = await this.prisma.session.findUnique({ where: { tokenHash } });

    // Revoquee ou expiree : traitee comme inexistante, sans distinction.
    if (!row || row.revokedAt || row.expiresAt.getTime() < now.getTime()) return null;

    return { id: row.id, userId: row.userId };
  }

  async revoke(sessionId: string, revokedAt: Date): Promise<void> {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt } });
  }

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
