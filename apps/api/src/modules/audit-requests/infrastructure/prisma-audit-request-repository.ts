import type { PrismaClient } from "@sanarys/db";
import type { AuditRequestRecord, AuditRequestRepository } from "../domain/ports.js";

/** Seul fichier du module audit-requests qui connaisse Prisma (guide, section 10.1). */
export class PrismaAuditRequestRepository implements AuditRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    leadId: string;
    preferredDate: Date | null;
    notes: string | null;
  }): Promise<AuditRequestRecord> {
    const row = await this.prisma.auditRequest.create({
      data: {
        leadId: data.leadId,
        preferredDate: data.preferredDate,
        notes: data.notes,
      },
    });

    return { id: row.id, status: row.status, createdAt: row.createdAt };
  }
}
