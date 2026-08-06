import { describe, expect, it } from "vitest";
import {
  CLEARED_LOCKOUT,
  LOCK_DURATION_MS,
  MAX_FAILED_LOGINS,
  afterFailedAttempt,
  isLocked,
  isTokenUsable,
  needsLockoutReset,
} from "./credentials.js";

/**
 * La politique de verrouillage se teste ici sans base ni serveur : c'est ce
 * qui permet de couvrir le franchissement du seuil et l'expiration du verrou
 * sans creer cinq sessions reelles ni attendre quinze minutes.
 */

const NOW = new Date("2026-08-06T10:00:00Z");

describe("verrouillage progressif", () => {
  it("ne verrouille pas avant le seuil", () => {
    let state = CLEARED_LOCKOUT;
    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      state = afterFailedAttempt(state, NOW);
      expect(state.lockedUntil).toBeNull();
      expect(isLocked(state, NOW)).toBe(false);
    }
    expect(state.failedLoginCount).toBe(MAX_FAILED_LOGINS - 1);
  });

  it("verrouille exactement au seuil", () => {
    let state = CLEARED_LOCKOUT;
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      state = afterFailedAttempt(state, NOW);
    }
    expect(state.failedLoginCount).toBe(MAX_FAILED_LOGINS);
    expect(isLocked(state, NOW)).toBe(true);
  });

  it("prolonge le verrou a chaque nouvel echec : insister ne raccourcit rien", () => {
    let state = CLEARED_LOCKOUT;
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      state = afterFailedAttempt(state, NOW);
    }
    const first = state.lockedUntil!.getTime();

    const later = new Date(NOW.getTime() + 60_000);
    state = afterFailedAttempt(state, later);

    expect(state.lockedUntil!.getTime()).toBeGreaterThan(first);
  });

  it("libere le compte une fois l'echeance passee", () => {
    let state = CLEARED_LOCKOUT;
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      state = afterFailedAttempt(state, NOW);
    }

    const afterExpiry = new Date(NOW.getTime() + LOCK_DURATION_MS + 1);
    expect(isLocked(state, afterExpiry)).toBe(false);
  });

  it("n'ecrit en base que si l'etat le justifie", () => {
    expect(needsLockoutReset(CLEARED_LOCKOUT)).toBe(false);
    expect(needsLockoutReset({ failedLoginCount: 1, lockedUntil: null })).toBe(true);
    expect(needsLockoutReset({ failedLoginCount: 0, lockedUntil: NOW })).toBe(true);
  });
});

describe("jetons a usage unique", () => {
  it("refuse un jeton sans echeance", () => {
    // Un compte sans invitation en cours a une echeance nulle : le jeton
    // fourni ne correspond alors a rien de valide.
    expect(isTokenUsable(null, NOW)).toBe(false);
  });

  it("refuse un jeton expire", () => {
    expect(isTokenUsable(new Date(NOW.getTime() - 1), NOW)).toBe(false);
  });

  it("accepte un jeton encore valide", () => {
    expect(isTokenUsable(new Date(NOW.getTime() + 1000), NOW)).toBe(true);
  });
});
