/**
 * Interface CRM (cahier des charges section 17 - creation/actualisation des leads).
 *
 * STATUT DANS CE BUILD : MOCK. Aucun CRM reel n'est connecte. L'adaptateur no-op
 * journalise le payload et marque le lead "MOCK_SYNCED" en base. La file interne
 * /staff/leads reste la source consultable : un lead cree est TOUJOURS visible
 * quelque part, meme sans CRM.
 */
export interface CrmLeadPayload {
  leadId: string;
  contactName: string;
  companyName: string;
  contactEmail: string;
  source?: string | undefined;
  campaign?: string | undefined;
}

export interface CrmPort {
  /** Retourne le statut de synchronisation a persister sur le lead. */
  syncLead(payload: CrmLeadPayload): Promise<"MOCK_SYNCED" | "SYNCED" | "FAILED">;
}

class NoopCrmAdapter implements CrmPort {
  async syncLead(payload: CrmLeadPayload): Promise<"MOCK_SYNCED"> {
    // eslint-disable-next-line no-console
    console.log(`[crm:mock] would sync lead ${payload.leadId} (${payload.companyName})`);
    return "MOCK_SYNCED";
  }
}

export function createCrmAdapter(kind: "noop" = "noop"): CrmPort {
  switch (kind) {
    case "noop":
    default:
      return new NoopCrmAdapter();
  }
}
