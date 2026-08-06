/**
 * Politique d'authentification.
 *
 * Ces regles sont pures et testables sans base : c'est ce qui permet de
 * verifier le verrouillage progressif sans creer cinq sessions reelles ni
 * attendre quinze minutes.
 *
 * IMPORTANT : implementation de premiere partie (mot de passe + session
 * serveur). Elle n'est PAS equivalente a un fournisseur d'identite eprouve —
 * le MFA n'est pas implemente, et le README le dit sans detour. Toute cette
 * politique est destinee a etre remplacee par un fournisseur OIDC.
 */

export const SESSION_TTL_MS = 12 * 3600 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

/** Verrouillage progressif : au-dela de ce seuil, le compte est bloque temporairement. */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface LockoutState {
  readonly failedLoginCount: number;
  readonly lockedUntil: Date | null;
}

/** Un compte est verrouille tant que l'echeance n'est pas passee. */
export function isLocked(state: LockoutState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

/**
 * Etat suivant apres un echec d'authentification. Le verrou se declenche au
 * seuil, et se prolonge a chaque nouvel echec au-dela : un attaquant qui
 * insiste ne raccourcit jamais son attente.
 */
export function afterFailedAttempt(state: LockoutState, now: Date): LockoutState {
  const failedLoginCount = state.failedLoginCount + 1;
  return {
    failedLoginCount,
    lockedUntil:
      failedLoginCount >= MAX_FAILED_LOGINS
        ? new Date(now.getTime() + LOCK_DURATION_MS)
        : null,
  };
}

/** Etat apres une authentification reussie : le compteur repart de zero. */
export const CLEARED_LOCKOUT: LockoutState = { failedLoginCount: 0, lockedUntil: null };

/** Un compteur a zero et aucun verrou : rien a reecrire en base. */
export function needsLockoutReset(state: LockoutState): boolean {
  return state.failedLoginCount > 0 || state.lockedUntil !== null;
}

/** Un jeton a usage unique n'est valide que s'il existe ET n'a pas expire. */
export function isTokenUsable(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && expiresAt.getTime() >= now.getTime();
}
