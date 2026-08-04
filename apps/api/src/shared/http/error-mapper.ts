import type { FastifyReply } from "fastify";
import { DomainError, type DomainErrorKind } from "../errors/domain-error.js";

/**
 * Frontiere entre le domaine et HTTP (guide, section 12.2).
 *
 * C'est le SEUL endroit ou une erreur metier devient un code HTTP. Les cas
 * d'usage et le domaine n'importent jamais Fastify et ne connaissent aucun
 * statut.
 */

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  CONFLICT: 409,
  PRECONDITION_FAILED: 422,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
};

export function statusForDomainError(error: DomainError): number {
  return STATUS_BY_KIND[error.kind];
}

/**
 * Traduit une erreur de domaine en reponse HTTP. Toute autre erreur est
 * propagee : elle releve du gestionnaire global, qui la journalise et renvoie
 * un 500 sans divulguer de detail interne.
 */
export function replyWithDomainError(reply: FastifyReply, error: unknown): FastifyReply | never {
  if (error instanceof DomainError) {
    return reply.code(statusForDomainError(error)).send({
      message: error.message,
      code: error.code,
    });
  }
  throw error;
}
