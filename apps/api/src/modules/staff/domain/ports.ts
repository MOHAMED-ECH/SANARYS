import type { LeadCurrentState, LeadUpdate } from "./lead-queue.js";

/** Ports de la file commerciale. Aucune mention de Prisma ni de CRM. */

export interface QueuedLead {
  readonly id: string;
  readonly status: string;
  readonly priority: string;
  readonly score: number | null;
  readonly companyName: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly contactPhone: string | null;
  readonly preferredChannel: string | null;
  readonly source: string | null;
  readonly zoneName: string | null;
  readonly ownerRef: string | null;
  readonly nextActionAt: Date | null;
  readonly hasSimulation: boolean;
  readonly auditRequestCount: number;
  readonly crmSyncStatus: string;
  readonly createdAt: Date;
}

export interface LeadHistoryEntry {
  readonly id: string;
  readonly type: string;
  readonly message: string | null;
  readonly actorRef: string | null;
  readonly createdAt: Date;
}

export interface QueuedLeadDetail extends QueuedLead {
  readonly consentMarketing: boolean;
  readonly consentVersion: string | null;
  readonly consentTimestamp: Date | null;
  readonly simulationId: string | null;
  readonly events: readonly LeadHistoryEntry[];
}

export interface LeadQueueFilter {
  readonly status?: string | undefined;
  readonly priority?: string | undefined;
  /** Ne retenir que les leads dont la prochaine action est en retard. */
  readonly overdueAt?: Date | undefined;
  readonly limit: number;
}

export interface StaffLeadRepository {
  list(filter: LeadQueueFilter): Promise<{ items: QueuedLead[]; total: number }>;
  findDetail(id: string): Promise<QueuedLeadDetail | null>;
  findState(id: string): Promise<LeadCurrentState | null>;
  applyUpdate(id: string, update: LeadUpdate): Promise<void>;
  appendHistory(entry: {
    leadId: string;
    type: string;
    message: string;
    actorRef: string;
  }): Promise<void>;
}
