import { NotFoundError } from "../../../shared/errors/domain-error.js";

/**
 * Erreurs metier du module leads. Elles disent ce qui s'est passe, jamais quel
 * statut HTTP renvoyer : cette traduction se fait a la frontiere
 * (guide, section 12.2).
 */
export class LeadNotFoundError extends NotFoundError {
  constructor(leadId: string) {
    super("LEAD_NOT_FOUND", `Lead introuvable : ${leadId}.`);
  }
}
