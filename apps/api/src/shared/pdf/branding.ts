import { color } from "@sanarys/design-tokens";

/**
 * Charte des documents PDF.
 *
 * Elle vit ici, et non dans chaque generateur, parce qu'elle etait recopiee :
 * le recapitulatif de simulation portait encore l'ancien cuivre `#B5652C`,
 * retire des tokens pour insuffisance de contraste. Deux cuivres coexistaient
 * donc entre le site et ses PDF sans que rien ne le signale.
 *
 * Les valeurs viennent des tokens. Un token qui bouge ne peut pas atteindre
 * une constante recopiee — c'est la seule facon d'empecher la derive de
 * recommencer.
 */
export const pdfPalette = {
  navy: color.navy[950],
  petrol: color.petrol[600],
  copper: color.copper[500],
  slate: color.slate[600],
  mist: color.mist[50],
  sand: color.sand[200],
} as const;

/** Coordonnees affichees en pied de page. Une seule source. */
export const PDF_CONTACT = "contact@sanarys.ma · +212 5 22 00 00 00 · Casablanca, Maroc";
