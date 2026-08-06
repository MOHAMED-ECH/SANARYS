import { ForbiddenError, NotFoundError } from "../../../shared/errors/domain-error.js";

export class StaffLeadNotFoundError extends NotFoundError {
  constructor() {
    super("LEAD_NOT_FOUND", "Lead introuvable.");
  }
}

/**
 * Refus explicite, et non 404 : atteindre la file commerciale suppose deja
 * d'etre authentifie comme personnel SANARYS. Masquer l'existence de la file a
 * ce stade n'apporterait rien, et brouillerait le diagnostic d'un role mal
 * attribue.
 */
export class LeadQueueForbiddenError extends ForbiddenError {
  constructor() {
    super("LEAD_QUEUE_FORBIDDEN", "Accès non autorisé à la file commerciale.");
  }
}
