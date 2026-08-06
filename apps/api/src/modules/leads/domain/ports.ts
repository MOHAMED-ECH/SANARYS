import type { LeadPriorityValue, ScoringFacts } from "./lead.js";

/**
 * Ports du module leads. Aucune de ces interfaces ne mentionne Prisma, un
 * schema SQL ou un CRM particulier (guide, section 5.5).
 */

/** Modele de lecture expose hors du module. Ce n'est jamais un objet ORM. */
export interface LeadSnapshot {
  readonly id: string;
  readonly status: string;
  readonly companyName: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly source: string | null;
  readonly campaign: string | null;
  readonly score: number;
  readonly priority: LeadPriorityValue;
  readonly createdAt: Date;
}

/** Donnees d'un lead soumis, deja validees par la frontiere. */
export interface LeadSubmission {
  readonly contactName: string;
  readonly contactRole?: string | undefined;
  readonly companyName: string;
  readonly contactEmail: string;
  readonly contactPhone?: string | undefined;
  readonly preferredChannel?: string | undefined;
  readonly industrialZoneId?: string | undefined;
  readonly source?: string | undefined;
  readonly campaign?: string | undefined;
  readonly consentMarketing: boolean;
  readonly consentVersion: string;
  readonly simulationId?: string | undefined;
}

export interface UpsertLeadData {
  readonly dedupeKey: string;
  readonly submission: LeadSubmission;
  readonly score: number;
  readonly priority: LeadPriorityValue;
  /** Horodatage du consentement, ou null si le prospect ne l'a pas donne. */
  readonly consentTimestamp: Date | null;
  readonly nextActionAt: Date;
  readonly isUpdate: boolean;
}

export type LeadEventType = "LEAD_CREATED" | "LEAD_UPDATED" | "AUDIT_REQUESTED";

/**
 * Collection d'agregats Lead. L'historique (`LeadEvent`) fait partie de
 * l'agregat : il n'a pas de vie propre hors du lead qui le porte, et se
 * manipule donc par le meme depot (guide, section 7.5).
 */
export interface LeadRepository {
  findByDedupeKey(dedupeKey: string): Promise<LeadSnapshot | null>;
  findById(id: string): Promise<LeadSnapshot | null>;
  exists(id: string): Promise<boolean>;
  upsert(data: UpsertLeadData): Promise<LeadSnapshot>;
  updateCrmSyncStatus(id: string, status: string): Promise<void>;
  markAuditRequested(id: string): Promise<void>;
  appendEvent(event: { leadId: string; type: LeadEventType; message: string }): Promise<void>;
}

/**
 * Faits de scoring tires d'une simulation.
 *
 * Le module leads n'a pas besoin de connaitre la forme d'une simulation : il a
 * besoin de cinq chiffres. Ce port dit exactement cela. Le jour ou le module
 * simulations exposera un modele de lecture dedie, seul l'adaptateur change.
 */
export interface SimulationFactsPort {
  factsFor(simulationId: string): Promise<Omit<ScoringFacts, "hasSimulation"> | null>;
}
