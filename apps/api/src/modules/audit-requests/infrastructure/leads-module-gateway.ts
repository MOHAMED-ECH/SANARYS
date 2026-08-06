import type { LeadsModule } from "../../leads/index.js";
import type { AuditLeadSummary, LeadsGateway } from "../domain/ports.js";

/**
 * Passerelle vers le module leads.
 *
 * C'est le seul point de contact entre les deux modules, et il passe par l'API
 * publique de leads — pas par ses tables. Le domaine d'audit-requests, lui, ne
 * connait que l'interface `LeadsGateway` : il ignore jusqu'a l'existence du
 * module leads.
 */
export class LeadsModuleGateway implements LeadsGateway {
  constructor(private readonly leads: LeadsModule) {}

  async markAuditRequested(command: {
    leadId: string;
    message: string;
  }): Promise<AuditLeadSummary> {
    const lead = await this.leads.markLeadAuditRequested.execute(command);
    return { id: lead.id, companyName: lead.companyName };
  }
}
