import { ForbiddenError, NotFoundError } from "../../../shared/errors/domain-error.js";

/**
 * Erreurs metier du portail.
 *
 * `OrganizationNotAccessibleError` est volontairement une erreur "introuvable"
 * et non "interdit" : repondre 403 sur une organisation qui existe, et 404 sur
 * une qui n'existe pas, revient a confirmer l'existence de la premiere. Un
 * utilisateur d'une PME ne doit pas pouvoir cartographier les autres clients
 * en sondant des identifiants.
 */
export class OrganizationNotAccessibleError extends NotFoundError {
  constructor() {
    super("ORGANIZATION_NOT_FOUND", "Organisation introuvable.");
  }
}

/**
 * L'invitation, elle, repond bien 403 : l'utilisateur a deja acces a
 * l'organisation en lecture, l'existence n'est donc plus un secret pour lui.
 * Seul le droit d'inviter lui manque, et le lui dire est utile.
 */
export class InviteNotAllowedError extends ForbiddenError {
  constructor() {
    super("INVITE_NOT_ALLOWED", "Action non autorisée.");
  }
}

/**
 * Document introuvable ou hors perimetre — volontairement indistinguables.
 *
 * Repondre « interdit » sur un document qui existe mais appartient a une autre
 * organisation confirmerait son existence. Un 404 ne dit rien.
 */
export class DocumentNotAccessibleError extends NotFoundError {
  constructor() {
    super("DOCUMENT_NOT_FOUND", "Document introuvable.");
  }
}

/** Rapport inexistant, non publie, ou hors perimetre — indistinguables. */
export class ReportNotAccessibleError extends NotFoundError {
  constructor() {
    super("REPORT_NOT_FOUND", "Rapport introuvable.");
  }
}
