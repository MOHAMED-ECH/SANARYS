/**
 * Plan de marquage (cahier des charges, section 21.2).
 *
 * Regle stricte : liste blanche d'evenements ET de proprietes. Aucune donnee
 * identifiante (email, telephone, nom), aucun texte libre, aucune donnee de
 * sante ne transite ici. Toute propriete hors liste blanche est ecartee.
 *
 * C'est une regle metier de protection des donnees, pas un detail de transport :
 * elle vit dans le domaine, se teste sans base ni serveur HTTP, et reste vraie
 * quel que soit l'appelant.
 */

export const ALLOWED_EVENTS: Record<string, readonly string[]> = {
  view_solution: ["service", "langue", "secteur"],
  start_simulation: ["source", "campagne", "variante"],
  complete_step: ["step_id", "duree", "erreurs"],
  view_result: ["scenario", "modules"],
  request_audit: ["type_organisation", "zone"],
  book_meeting: ["canal", "delai"],
  download_resource: ["asset_id", "theme"],
  portal_login: ["organisation_type", "succes"],
  report_view: ["report_type", "periode"],
  ticket_created: ["categorie", "criticite"],
};

/**
 * Ne conserve que les proprietes explicitement autorisees pour cet evenement.
 * Retourne `null` si l'evenement lui-meme est hors plan de marquage.
 */
export function sanitizeEventProperties(
  name: string,
  properties: Record<string, unknown>,
): Record<string, unknown> | null {
  const allowed = ALLOWED_EVENTS[name];
  if (!allowed) return null;

  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in properties) {
      result[key] = properties[key];
    }
  }
  return result;
}
