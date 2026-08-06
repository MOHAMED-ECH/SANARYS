import {
  RateLimitedError,
  UnauthenticatedError,
  InvalidInputError,
} from "../../../shared/errors/domain-error.js";

/**
 * Erreurs metier de l'authentification (guide, section 12.2).
 *
 * `InvalidCredentialsError` porte volontairement le meme message que l'email
 * soit inconnu ou le mot de passe faux : la reponse ne doit jamais permettre
 * d'enumerer les comptes existants.
 */
export class InvalidCredentialsError extends UnauthenticatedError {
  constructor() {
    super("INVALID_CREDENTIALS", "Identifiants invalides.");
  }
}

/**
 * Le verrouillage se traduit par un 429 et non par un 401 : c'est une limite
 * de debit sur les tentatives, et la distinction aide un utilisateur legitime
 * a comprendre qu'il doit attendre plutot que retaper son mot de passe.
 */
export class AccountLockedError extends RateLimitedError {
  constructor() {
    super(
      "ACCOUNT_LOCKED",
      "Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans quelques minutes.",
    );
  }
}

export class InvalidInviteError extends InvalidInputError {
  constructor() {
    super("INVALID_INVITE", "Invitation invalide ou expirée.");
  }
}

export class InvalidResetTokenError extends InvalidInputError {
  constructor() {
    super("INVALID_RESET", "Lien de réinitialisation invalide ou expiré.");
  }
}

export class AccountUnavailableError extends UnauthenticatedError {
  constructor() {
    super("ACCOUNT_UNAVAILABLE", "Compte indisponible.");
  }
}
