/**
 * Ports du module audit-requests.
 *
 * Le module a besoin de deux choses qu'il ne possede pas : persister une
 * demande d'audit, et faire progresser le lead correspondant. La seconde
 * appartient au module leads — elle passe donc par une passerelle explicite,
 * jamais par un acces direct a ses tables (guide, sections 3.3 et 5.5).
 */

export interface AuditRequestRecord {
  readonly id: string;
  readonly status: string;
  readonly createdAt: Date;
}

export interface AuditRequestRepository {
  create(data: {
    leadId: string;
    preferredDate: Date | null;
    notes: string | null;
  }): Promise<AuditRequestRecord>;
}

/** Vue minimale du lead : strictement ce que la demande d'audit doit connaitre. */
export interface AuditLeadSummary {
  readonly id: string;
  readonly companyName: string;
}

export interface LeadsGateway {
  markAuditRequested(command: { leadId: string; message: string }): Promise<AuditLeadSummary>;
}
