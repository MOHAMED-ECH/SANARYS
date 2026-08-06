import type { Lead, PrismaClient } from "@sanarys/db";
import type { LeadPriorityValue } from "../domain/lead.js";
import type {
  LeadEventType,
  LeadRepository,
  LeadSnapshot,
  UpsertLeadData,
} from "../domain/ports.js";

/**
 * Seul fichier du module leads qui connaisse Prisma (guide, section 10.1).
 * Aucun objet ORM ne franchit cette frontiere : `toSnapshot` est le point de
 * passage oblige.
 */
function toSnapshot(row: Lead): LeadSnapshot {
  return {
    id: row.id,
    status: row.status,
    companyName: row.companyName,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    source: row.source,
    campaign: row.campaign,
    // Le score est facultatif en base (lead importe, lead ancien). Hors du
    // module, l'absence de score se lit comme un score nul : c'est la meme
    // chose pour la priorisation commerciale.
    score: row.score ?? 0,
    priority: row.priority as LeadPriorityValue,
    createdAt: row.createdAt,
  };
}

export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByDedupeKey(dedupeKey: string): Promise<LeadSnapshot | null> {
    const row = await this.prisma.lead.findUnique({ where: { dedupeKey } });
    return row ? toSnapshot(row) : null;
  }

  async findById(id: string): Promise<LeadSnapshot | null> {
    const row = await this.prisma.lead.findUnique({ where: { id } });
    return row ? toSnapshot(row) : null;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.lead.count({ where: { id } })) > 0;
  }

  async upsert(data: UpsertLeadData): Promise<LeadSnapshot> {
    const { submission: s } = data;

    const row = await this.prisma.lead.upsert({
      where: { dedupeKey: data.dedupeKey },
      create: {
        dedupeKey: data.dedupeKey,
        contactName: s.contactName,
        contactRole: s.contactRole ?? null,
        companyName: s.companyName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone ?? null,
        preferredChannel: s.preferredChannel ?? null,
        industrialZoneId: s.industrialZoneId ?? null,
        source: s.source ?? null,
        campaign: s.campaign ?? null,
        consentMarketing: s.consentMarketing,
        consentTimestamp: data.consentTimestamp,
        consentVersion: s.consentVersion,
        simulationId: s.simulationId ?? null,
        score: data.score,
        priority: data.priority,
        nextActionAt: data.nextActionAt,
      },
      // Une mise a jour n'efface jamais un champ deja renseigne avec une valeur
      // vide : seules les informations effectivement fournies sont reportees.
      update: {
        contactName: s.contactName,
        ...(s.contactRole ? { contactRole: s.contactRole } : {}),
        ...(s.contactPhone ? { contactPhone: s.contactPhone } : {}),
        ...(s.preferredChannel ? { preferredChannel: s.preferredChannel } : {}),
        ...(s.industrialZoneId ? { industrialZoneId: s.industrialZoneId } : {}),
        ...(s.simulationId ? { simulationId: s.simulationId } : {}),
        score: data.score,
        priority: data.priority,
        ...(s.consentMarketing
          ? {
              consentMarketing: true,
              consentTimestamp: data.consentTimestamp,
              consentVersion: s.consentVersion,
            }
          : {}),
      },
    });

    return toSnapshot(row);
  }

  async updateCrmSyncStatus(id: string, status: string): Promise<void> {
    await this.prisma.lead.update({ where: { id }, data: { crmSyncStatus: status } });
  }

  async markAuditRequested(id: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id },
      data: { status: "AUDIT_REQUESTED", priority: "HIGH" },
    });
  }

  async appendEvent(event: {
    leadId: string;
    type: LeadEventType;
    message: string;
  }): Promise<void> {
    await this.prisma.leadEvent.create({
      data: { leadId: event.leadId, type: event.type, message: event.message },
    });
  }
}
