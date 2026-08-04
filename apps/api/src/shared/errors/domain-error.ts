/**
 * Erreurs de domaine.
 *
 * Regle du guide (section 12.2) : le domaine ne connait pas les codes HTTP.
 * Il exprime ce qui s'est passe metier ; la traduction en statut HTTP se fait
 * uniquement a la frontiere (couche presentation).
 */

/** Categories stables, utilisees par la frontiere pour choisir un statut. */
export type DomainErrorKind =
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
  /** Code stable expose aux clients de l'API, utile pour un traitement automatise. */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly kind = "NOT_FOUND" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class InvalidInputError extends DomainError {
  readonly kind = "INVALID_INPUT" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly kind = "FORBIDDEN" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class UnauthenticatedError extends DomainError {
  readonly kind = "UNAUTHENTICATED" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly kind = "CONFLICT" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class PreconditionFailedError extends DomainError {
  readonly kind = "PRECONDITION_FAILED" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class RateLimitedError extends DomainError {
  readonly kind = "RATE_LIMITED" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class UnavailableError extends DomainError {
  readonly kind = "UNAVAILABLE" as const;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
