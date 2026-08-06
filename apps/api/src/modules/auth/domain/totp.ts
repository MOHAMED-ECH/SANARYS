import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Mots de passe a usage unique bases sur le temps — RFC 6238 (TOTP), qui
 * s'appuie sur la RFC 4226 (HOTP).
 *
 * Implemente ici plutot qu'importe : l'algorithme tient en quarante lignes,
 * il est fige depuis 2011, et les RFC publient des vecteurs de test officiels
 * qui permettent de prouver la conformite plutot que de la supposer. Ajouter
 * une dependance pour cela reviendrait a elargir la surface d'attaque de la
 * chaine d'approvisionnement sans rien gagner.
 *
 * Ce fichier est pur : aucune horloge implicite, aucun acces reseau ou base.
 * L'instant est toujours fourni par l'appelant, ce qui rend la fenetre de
 * tolerance testable sans attendre trente secondes.
 */

/** Duree d'un pas de temps, en secondes. Valeur par defaut de la RFC 6238. */
export const TOTP_STEP_SECONDS = 30;

/** Nombre de chiffres du code affiche. */
export const TOTP_DIGITS = 6;

/**
 * Tolerance de derive d'horloge, exprimee en pas.
 *
 * 1 signifie que le pas precedent et le pas suivant sont acceptes, soit une
 * fenetre de 90 secondes. C'est la recommandation de la RFC : au-dela, on
 * allonge inutilement la duree de validite d'un code intercepte.
 */
export const TOTP_TOLERANCE_STEPS = 1;

export type TotpAlgorithm = "sha1" | "sha256" | "sha512";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode en base32 (RFC 4648, sans remplissage) : c'est le format attendu par
 * les applications d'authentification.
 */
export function toBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/** Decode une chaine base32. Les espaces et le remplissage sont tolerés. */
export function fromBase32(secret: string): Buffer {
  const normalized = secret.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error(`Caractere base32 invalide : ${character}`);
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Code HOTP pour un compteur donne (RFC 4226, section 5.3).
 *
 * La "troncature dynamique" consiste a lire les quatre derniers bits du
 * condensat pour choisir ou lire les quatre octets qui formeront le code :
 * c'est ce qui evite qu'une position fixe ne fuite toujours la meme partie
 * du HMAC.
 */
export function hotp(secret: Buffer, counter: number, options?: {
  digits?: number;
  algorithm?: TotpAlgorithm;
}): string {
  const digits = options?.digits ?? TOTP_DIGITS;
  const algorithm = options?.algorithm ?? "sha1";

  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac(algorithm, secret).update(counterBytes).digest();
  const offset = digest[digest.length - 1]! & 0x0f;

  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

/** Numero de pas de temps correspondant a un instant. */
export function stepFor(now: Date, stepSeconds = TOTP_STEP_SECONDS): number {
  return Math.floor(now.getTime() / 1000 / stepSeconds);
}

/** Code TOTP attendu a un instant donne. */
export function totp(
  secret: Buffer,
  now: Date,
  options?: { digits?: number; algorithm?: TotpAlgorithm; stepSeconds?: number },
): string {
  const step = stepFor(now, options?.stepSeconds ?? TOTP_STEP_SECONDS);
  return hotp(secret, step, {
    digits: options?.digits ?? TOTP_DIGITS,
    algorithm: options?.algorithm ?? "sha1",
  });
}

/**
 * Verifie un code saisi, en tolerant une derive d'horloge.
 *
 * La comparaison est a temps constant : une comparaison naive de chaines
 * s'arrete au premier caractere different et laisse mesurer, par le temps de
 * reponse, combien de chiffres etaient corrects.
 */
export function verifyTotp(
  secret: Buffer,
  submitted: string,
  now: Date,
  options?: { toleranceSteps?: number; digits?: number; algorithm?: TotpAlgorithm },
): boolean {
  const digits = options?.digits ?? TOTP_DIGITS;
  const tolerance = options?.toleranceSteps ?? TOTP_TOLERANCE_STEPS;
  const cleaned = submitted.replace(/\s/g, "");

  if (!new RegExp(`^\\d{${digits}}$`).test(cleaned)) return false;

  const current = stepFor(now);
  const submittedBuffer = Buffer.from(cleaned, "utf8");
  let matched = false;

  // Toutes les fenetres sont parcourues, meme apres une correspondance : sortir
  // au premier succes rendrait le temps de reponse dependant de la fenetre qui
  // a matche, et donc de la derive d'horloge de l'utilisateur.
  for (let offset = -tolerance; offset <= tolerance; offset += 1) {
    const expected = Buffer.from(hotp(secret, current + offset, { digits, ...(options?.algorithm ? { algorithm: options.algorithm } : {}) }), "utf8");
    if (
      expected.length === submittedBuffer.length &&
      timingSafeEqual(expected, submittedBuffer)
    ) {
      matched = true;
    }
  }

  return matched;
}

/**
 * URI `otpauth://` a encoder en QR code pour l'enrolement.
 *
 * L'emetteur apparait deux fois — dans le chemin et en parametre — parce que
 * les applications d'authentification ne lisent pas toutes le meme.
 */
export function otpauthUri(params: {
  secret: string;
  account: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${params.issuer}:${params.account}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
