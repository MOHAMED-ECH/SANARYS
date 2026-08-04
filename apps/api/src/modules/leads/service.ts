import { createHash } from "node:crypto";
import type { PrismaClient } from "@sanarys/db";
import type { CreateLeadRequest } from "@sanarys/schemas";

/**
 * Cycle de vie commercial d'un lead. Meme sans CRM connecte, un lead cree est
 * toujours consultable dans la file interne (/staff/leads) : statut, priorite,
 * proprietaire, historique et prochaine action.
 */

export const buildDedupeKey = (email: string, companyName: string) =>
  createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${companyName.trim().toLowerCase()}`)
    .digest("hex");

/** Delai de prise en charge cible : moins de 2 heures ouvrees (KPI du cahier des charges). */
const FIRST_CONTACT_TARGET_MS = 2 * 3600 * 1000;

export interface ScoringFacts {
  totalHeadcount?: number | undefined;
  numberOfCompanies?: number | undefined;
  riskLevel?: string | undefined;
  hasSimulation: boolean;
  auditInterest?: boolean | undefined;
}

/**
 * Score simple et explicable (pas de modele statistique) : il sert a prioriser
 * la file commerciale, jamais a ecarter automatiquement un prospect.
 */
export type LeadPriorityValue = "LOW" | "MEDIUM" | "HIGH";

export const priorityFromScore = (score: number): LeadPriorityValue =>
  score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

export function scoreLead(facts: ScoringFacts): { score: number; priority: LeadPriorityValue } {
  let score = 0;

  if (facts.hasSimulation) score += 25;
  if (facts.auditInterest) score += 20;

  const headcount = facts.totalHeadcount ?? 0;
  if (headcount >= 500) score += 25;
  else if (headcount >= 150) score += 15;
  else if (headcount >= 50) score += 8;

  const companies = facts.numberOfCompanies ?? 0;
  if (companies >= 5) score += 15;
  else if (companies >= 3) score += 8;

  if (facts.riskLevel === "HIGH") score += 15;
  else if (facts.riskLevel === "MEDIUM") score += 7;

  return { score, priority: priorityFromScore(score) };
}

export class LeadService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Cree ou met a jour un lead (dedoublonnage par email + entreprise).
   * Un second envoi enrichit le lead existant au lieu d'en creer un doublon.
   */
  async createOrUpdate(payload: CreateLeadRequest) {
    const dedupeKey = buildDedupeKey(payload.contactEmail, payload.companyName);

    let scoringFacts: ScoringFacts = { hasSimulation: Boolean(payload.simulationId) };

    if (payload.simulationId) {
      const simulation = await this.prisma.simulation.findUnique({
        where: { id: payload.simulationId },
      });
      const input = (simulation?.inputJson ?? {}) as Record<string, Record<string, unknown>>;
      scoringFacts = {
        hasSimulation: true,
        totalHeadcount: input.companies?.totalHeadcount as number | undefined,
        numberOfCompanies: input.companies?.numberOfCompanies as number | undefined,
        riskLevel: input.activity?.riskLevel as string | undefined,
        auditInterest: input.expectations?.auditInterest as boolean | undefined,
      };
    }

    const { score } = scoreLead(scoringFacts);
    const consentTimestamp = payload.consentMarketing ? new Date() : null;

    const existing = await this.prisma.lead.findUnique({ where: { dedupeKey } });

    // Une re-soumission moins renseignee (ex. formulaire de contact simple apres
    // une simulation complete) ne doit jamais degrader un lead deja qualifie.
    const effectiveScore = Math.max(score, existing?.score ?? 0);
    const priority = priorityFromScore(effectiveScore);

    const lead = await this.prisma.lead.upsert({
      where: { dedupeKey },
      create: {
        dedupeKey,
        contactName: payload.contactName,
        contactRole: payload.contactRole ?? null,
        companyName: payload.companyName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone ?? null,
        preferredChannel: payload.preferredChannel ?? null,
        industrialZoneId: payload.industrialZoneId ?? null,
        source: payload.source ?? null,
        campaign: payload.campaign ?? null,
        consentMarketing: payload.consentMarketing,
        consentTimestamp,
        consentVersion: payload.consentVersion,
        simulationId: payload.simulationId ?? null,
        score: effectiveScore,
        priority,
        nextActionAt: new Date(Date.now() + FIRST_CONTACT_TARGET_MS),
      },
      update: {
        contactName: payload.contactName,
        ...(payload.contactRole ? { contactRole: payload.contactRole } : {}),
        ...(payload.contactPhone ? { contactPhone: payload.contactPhone } : {}),
        ...(payload.preferredChannel ? { preferredChannel: payload.preferredChannel } : {}),
        ...(payload.industrialZoneId ? { industrialZoneId: payload.industrialZoneId } : {}),
        ...(payload.simulationId ? { simulationId: payload.simulationId } : {}),
        score: effectiveScore,
        priority,
        ...(payload.consentMarketing
          ? { consentMarketing: true, consentTimestamp, consentVersion: payload.consentVersion }
          : {}),
      },
    });

    await this.prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        type: existing ? "LEAD_UPDATED" : "LEAD_CREATED",
        message: existing
          ? "Nouvelle soumission rattachée au lead existant (dédoublonnage)."
          : `Lead créé depuis ${payload.source ?? "le site public"}.`,
      },
    });

    return { lead, isNew: !existing };
  }
}
