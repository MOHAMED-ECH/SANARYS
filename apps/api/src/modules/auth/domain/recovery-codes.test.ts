import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  RECOVERY_CODE_COUNT,
  RECOVERY_CODE_LENGTH,
  formatRecoveryCode,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from "./recovery-codes.js";

describe("codes de secours", () => {
  it("produit le nombre attendu, a la bonne longueur", () => {
    const codes = generateRecoveryCodes(randomBytes);
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    for (const code of codes) {
      expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
    }
  });

  it("n'emploie aucun caractere ambigu a la lecture", () => {
    // Ces codes sont recopies a la main depuis une feuille imprimee : confondre
    // O et 0 ou I et 1 est la premiere cause d'echec de saisie.
    const tous = generateRecoveryCodes(randomBytes, 200).join("");
    expect(tous).not.toMatch(/[O0I1L]/);
  });

  it("ne repete pas un code au sein d'un lot", () => {
    const codes = generateRecoveryCodes(randomBytes, 100);
    expect(new Set(codes).size).toBe(100);
  });

  it("reconnait une saisie quelle que soit sa ponctuation", () => {
    const canonique = normalizeRecoveryCode("A2B3C4D5E6");
    for (const saisie of ["a2b3-c4d5e6", "A2B3 C4D5 E6", "a2b3c4d5e6", " A2B3-C4D5-E6 "]) {
      expect(normalizeRecoveryCode(saisie)).toBe(canonique);
    }
  });

  it("affiche le code en deux groupes lisibles", () => {
    expect(formatRecoveryCode("A2B3C4D5E6")).toBe("A2B3C-4D5E6");
  });

  it("ne penche pas vers le debut de l'alphabet", () => {
    // Un modulo naif sur un octet biaiserait le tirage vers les premieres
    // lettres. Sur un gros echantillon, l'ecart doit rester modeste.
    const echantillon = generateRecoveryCodes(randomBytes, 3000).join("");
    const occurrences = new Map<string, number>();
    for (const caractere of echantillon) {
      occurrences.set(caractere, (occurrences.get(caractere) ?? 0) + 1);
    }

    const comptes = [...occurrences.values()];
    const moyenne = echantillon.length / occurrences.size;
    const ecartMax = Math.max(...comptes.map((c) => Math.abs(c - moyenne)));

    expect(occurrences.size).toBe(31);
    expect(ecartMax).toBeLessThan(moyenne * 0.35);
  });
});
