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

/**
 * Code de second facteur refuse.
 *
 * Message unique pour un code TOTP faux, un code de secours faux et un code
 * de secours deja consomme : distinguer ces cas apprendrait a un attaquant
 * qu'il vient d'utiliser un code valide mais deja servi, donc que sa liste
 * volee est la bonne.
 */
export class InvalidMfaCodeError extends UnauthenticatedError {
  constructor() {
    super("INVALID_MFA_CODE", "Code de vérification invalide ou expiré.");
  }
}

/** Le defi n'existe pas, a expire, ou a deja servi a ouvrir une session. */
export class InvalidMfaChallengeError extends UnauthenticatedError {
  constructor() {
    super("INVALID_MFA_CHALLENGE", "Session de vérification expirée. Reconnectez-vous.");
  }
}

/** Activation demandee alors qu'aucun enrolement n'a ete commence. */
export class MfaNotEnrolledError extends InvalidInputError {
  constructor() {
    super("MFA_NOT_ENROLLED", "Aucun enrôlement en cours. Recommencez la configuration.");
  }
}

export class MfaAlreadyEnabledError extends InvalidInputError {
  constructor() {
    super("MFA_ALREADY_ENABLED", "La vérification en deux étapes est déjà active.");
  }
}
