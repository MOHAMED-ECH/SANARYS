/**
 * Registre des visuels du site.
 *
 * Regle de publication, dans le prolongement de `site.ts` : un visuel ne doit
 * jamais laisser croire a une capacite qu'il ne prouve pas. Une photo
 * d'ambulance issue d'une banque d'images, placee a cote de « objectif
 * d'intervention : moins de 10 minutes », suggere un dispositif existant que
 * l'image ne demontre pas.
 *
 * D'ou `origin` : tout visuel qui n'est pas une prise de vue SANARYS porte une
 * mention visible a l'ecran. Ce n'est pas une precaution juridique de facade,
 * c'est la meme exigence que pour les chiffres — on distingue ce qui est
 * constate de ce qui est illustre.
 *
 * Remplacer un visuel par une vraie photo SANARYS : deposer le fichier dans
 * `public/media/`, corriger `src`, `width`, `height`, `alt`, et passer `origin`
 * a "sanarys". La legende disparait alors d'elle-meme.
 */

export type MediaOrigin =
  /** Prise de vue SANARYS, verifiee et autorisee. Aucune mention ajoutee. */
  | "sanarys"
  /** Banque d'images sous licence. Mention « photo d'illustration ». */
  | "stock"
  /** Visuel construit par l'equipe (schema, illustration). Mention « illustration ». */
  | "illustration";

export interface MediaAsset {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /**
   * Texte alternatif. Decrit ce que l'image APPORTE au lecteur qui ne la voit
   * pas, pas ce qu'elle contient litteralement.
   */
  readonly alt: string;
  readonly origin: MediaOrigin;
  /** Auteur ou banque, affiche a cote de la mention quand il est connu. */
  readonly credit?: string;
}

/** Mention affichee sous un visuel qui n'est pas une prise de vue SANARYS. */
export const ORIGIN_NOTICE: Record<Exclude<MediaOrigin, "sanarys">, string> = {
  stock: "Photo d'illustration",
  illustration: "Illustration schématique",
};

/**
 * Emplacements declares.
 *
 * Ils existent avant les fichiers : la mise en page est construite pour les
 * accueillir, et une photo qui arrive ne demande aucun travail de gabarit.
 */
export const MEDIA = {
  /** Bande pleine largeur de l'accueil : la zone vue en coupe. */
  zonePanorama: {
    src: "",
    width: 1600,
    height: 420,
    alt: "Vue schématique d'une zone industrielle : le centre de services partagés sanitaires est implanté au centre, sa couverture rayonne vers les entreprises voisines.",
    origin: "illustration",
  },
} as const satisfies Record<string, MediaAsset>;
