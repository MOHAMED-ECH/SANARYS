/**
 * Codes de secours du second facteur.
 *
 * Ils existent pour un cas precis : le telephone perdu. Sans eux, activer le
 * MFA revient a accepter qu'un utilisateur puisse se retrouver definitivement
 * dehors, et la seule issue serait une procedure de support manuelle — c'est-a-dire
 * exactement le chemin qu'un attaquant tenterait d'emprunter par ingenierie
 * sociale.
 *
 * Regles :
 *  - un code ne sert qu'une fois ;
 *  - la liste n'est affichee qu'une fois, a l'activation ;
 *  - la base ne stocke que des condensats, comme pour tout jeton.
 */

/** Nombre de codes remis a l'activation. */
export const RECOVERY_CODE_COUNT = 10;

/** Longueur d'un code, hors separateur. */
export const RECOVERY_CODE_LENGTH = 10;

/**
 * Alphabet sans caracteres ambigus : ni O/0, ni I/1/l. Ces codes sont recopies
 * a la main depuis une feuille imprimee, souvent sous stress.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Met un code en forme pour l'affichage : deux groupes separes par un tiret.
 * La saisie, elle, accepte n'importe quelle ponctuation (voir `normalize`).
 */
export function formatRecoveryCode(raw: string): string {
  const middle = Math.floor(raw.length / 2);
  return `${raw.slice(0, middle)}-${raw.slice(middle)}`;
}

/**
 * Forme canonique d'un code saisi : majuscules, sans separateur ni espace.
 * C'est cette forme qui est hachee, de sorte qu'un utilisateur qui recopie
 * « a1b2-c3d4 » ou « A1B2 C3D4 » soit reconnu dans les deux cas.
 */
export function normalizeRecoveryCode(submitted: string): string {
  return submitted.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Genere un lot de codes. Le tirage aleatoire est injecte pour que les tests
 * puissent etre deterministes sans affaiblir la generation reelle.
 */
export function generateRecoveryCodes(
  randomBytes: (size: number) => Buffer,
  count = RECOVERY_CODE_COUNT,
): string[] {
  const codes: string[] = [];

  for (let index = 0; index < count; index += 1) {
    // Le rejet des valeurs hors du plus grand multiple de l'alphabet evite le
    // biais modulo : sans lui, les premieres lettres sortiraient plus souvent.
    let code = "";
    while (code.length < RECOVERY_CODE_LENGTH) {
      const limite = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
      for (const octet of randomBytes(RECOVERY_CODE_LENGTH)) {
        if (code.length >= RECOVERY_CODE_LENGTH) break;
        if (octet < limite) code += ALPHABET[octet % ALPHABET.length];
      }
    }
    codes.push(code);
  }

  return codes;
}
