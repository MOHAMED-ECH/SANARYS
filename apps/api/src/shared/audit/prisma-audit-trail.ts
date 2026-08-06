import type { Prisma, PrismaClient } from "@sanarys/db";
import type { AuditEntry, AuditTrailPort } from "./audit-trail.js";

/** Implementation persistante du journal d'audit. */
export class PrismaAuditTrail implements AuditTrailPort {
  constructor(private readonly prisma: PrismaClient) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        ip: entry.ip ?? null,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
