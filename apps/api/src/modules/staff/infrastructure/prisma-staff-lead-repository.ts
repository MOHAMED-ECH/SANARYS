import type { Lead, LeadPriority, LeadStatus, PrismaClient } from "@sanarys/db";
import type { LeadCurrentState, LeadUpdate } from "../domain/lead-queue.js";
import type {
  LeadQueueFilter,
  QueuedLead,
  QueuedLeadDetail,
  StaffLeadRepository,
} from "../domain/ports.js";

/** Seul fichier du module staff qui connaisse Prisma (guide, section 10.1). */

type LeadRow = Lead & {
  industrialZone: { name: string } | null;
  _count: { auditRequests: number };
};

function toQueuedLead(row: LeadRow): QueuedLead {
  return {
    id: row.id,
    status: row.status,
    priority: row.priority,
    score: row.score,
    companyName: row.companyName,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    preferredChannel: row.preferredChannel,
    source: row.source,
    zoneName: row.industrialZone?.name ?? null,
    ownerRef: row.ownerRef,
    nextActionAt: row.nextActionAt,
    hasSimulation: Boolean(row.simulationId),
    auditRequestCount: row._count.auditRequests,
    crmSyncStatus: row.crmSyncStatus,
    createdAt: row.createdAt,
  };
}

export class PrismaStaffLeadRepository implements StaffLeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filter: LeadQueueFilter): Promise<{ items: QueuedLead[]; total: number }> {
    const where = {
      ...(filter.status ? { status: filter.status as LeadStatus } : {}),
      ...(filter.priority ? { priority: filter.priority as LeadPriority } : {}),
      ...(filter.overdueAt ? { nextActionAt: { lt: filter.overdueAt } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        // Les leads urgents d'abord, puis les plus recents : c'est l'ordre dans
        // lequel un commercial doit traiter sa file.
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: filter.limit,
        include: { industrialZone: true, _count: { select: { auditRequests: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { items: rows.map(toQueuedLead), total };
  }

  async findDetail(id: string): Promise<QueuedLeadDetail | null> {
    const row = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        industrialZone: true,
        events: { orderBy: { createdAt: "desc" } },
        _count: { select: { auditRequests: true } },
      },
    });

    if (!row) return null;

    return {
      ...toQueuedLead(row),
      consentMarketing: row.consentMarketing,
      consentVersion: row.consentVersion,
      consentTimestamp: row.consentTimestamp,
      simulationId: row.simulationId,
      events: row.events.map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
        actorRef: event.actorRef,
        createdAt: event.createdAt,
      })),
    };
  }

  async findState(id: string): Promise<LeadCurrentState | null> {
    const row = await this.prisma.lead.findUnique({
      where: { id },
      select: { status: true, priority: true },
    });
    return row ? { status: row.status, priority: row.priority } : null;
  }

  async applyUpdate(id: string, update: LeadUpdate): Promise<void> {
    await this.prisma.lead.update({
      where: { id },
      data: {
        ...(update.status ? { status: update.status } : {}),
        ...(update.priority ? { priority: update.priority } : {}),
        // `null` est une valeur voulue (desaffecter, retirer l'echeance) :
        // seul `undefined` signifie "ne pas toucher".
        ...(update.ownerRef !== undefined ? { ownerRef: update.ownerRef } : {}),
        ...(update.nextActionAt !== undefined ? { nextActionAt: update.nextActionAt } : {}),
      },
    });
  }

  async appendHistory(entry: {
    leadId: string;
    type: string;
    message: string;
    actorRef: string;
  }): Promise<void> {
    await this.prisma.leadEvent.create({
      data: {
        leadId: entry.leadId,
        type: entry.type,
        message: entry.message,
        actorRef: entry.actorRef,
      },
    });
  }
}
