import { timingSafeEqual } from "node:crypto";

/**
 * Comparaison a temps constant.
 *
 * Une comparaison naive (`a === b`) s'arrete au premier caractere different :
 * le temps de reponse revele alors combien de caracteres sont corrects, ce qui
 * suffit a reconstruire un jeton caractere par caractere. Utilisee ici pour le
 * jeton anti-CSRF.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // Les longueurs differentes sortent tout de suite : timingSafeEqual les
  // refuse, et la longueur d'un jeton n'est pas un secret.
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
