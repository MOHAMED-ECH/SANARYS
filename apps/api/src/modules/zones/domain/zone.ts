import type { IndustrialZoneSummary } from "./ports.js";

/**
 * Regles de presentation des zones industrielles.
 *
 * Pas d'entite riche ici : une zone est une donnee de reference, sans cycle de
 * vie propre dans ce perimetre. Le domaine se limite donc a la seule regle
 * metier reelle — l'ordre dans lequel les zones sont proposees.
 */

/**
 * Les zones pilotes passent devant : ce sont celles ou un CSPS est deja
 * implante, donc les seules pour lesquelles un prospect obtient une reponse
 * immediate. A statut egal, l'ordre alphabetique par ville rend la liste
 * previsible.
 */
export function orderForPublicListing(
  zones: readonly IndustrialZoneSummary[],
): IndustrialZoneSummary[] {
  return [...zones].sort((a, b) => {
    if (a.isPilot !== b.isPilot) return a.isPilot ? -1 : 1;
    return a.city.localeCompare(b.city, "fr");
  });
}
