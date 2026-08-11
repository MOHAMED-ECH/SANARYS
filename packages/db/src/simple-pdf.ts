/**
 * Generateur de PDF minimal, pour le jeu de donnees de demonstration.
 *
 * Pourquoi ne pas reutiliser `@react-pdf/renderer`, deja present dans l'API ?
 * Parce qu'il vit dans `apps/api` et que le seed appartient au paquet `db` :
 * l'y importer creerait une dependance du modele de donnees vers l'application,
 * exactement dans le sens que l'architecture interdit.
 *
 * Ces documents n'ont pas vocation a etre beaux. Ils existent pour qu'un
 * parcours de telechargement puisse etre demontre et teste de bout en bout,
 * avec de vrais octets et un fichier qui s'ouvre reellement. En production,
 * une convention-cadre est un document signe, televerse, jamais fabrique par
 * le code.
 *
 * Le format suit la structure PDF 1.4 la plus simple : un catalogue, une page,
 * une police standard, un flux de texte, et une table de references croisees.
 */

/** Echappe les caracteres que la syntaxe des chaines PDF reserve. */
function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Translitteration ASCII.
 *
 * Les polices standard PDF utilisent un encodage a un octet : « é » y sortirait
 * comme un caractere parasite. Un document de demonstration lisible vaut mieux
 * qu'un document accentue illisible.
 */
function toAscii(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface PdfLine {
  readonly text: string;
  /** Taille en points. 18 pour un titre, 10 pour du corps. */
  readonly size?: number;
  /** Espace ajoute au-dessus de la ligne, en points. */
  readonly spaceBefore?: number;
}

export function buildSimplePdf(lines: readonly PdfLine[]): Buffer {
  const MARGE_GAUCHE = 56;
  const HAUT = 780;

  let curseur = HAUT;
  const instructions: string[] = ["BT"];

  for (const ligne of lines) {
    const size = ligne.size ?? 10;
    curseur -= (ligne.spaceBefore ?? 0) + size + 4;
    instructions.push(
      `/F1 ${size} Tf`,
      `1 0 0 1 ${MARGE_GAUCHE} ${curseur} Tm`,
      `(${escapePdfText(toAscii(ligne.text))}) Tj`,
    );
  }
  instructions.push("ET");

  const flux = instructions.join("\n");

  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(flux, "latin1")} >>\nstream\n${flux}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let corps = "%PDF-1.4\n";
  const decalages: number[] = [];

  objets.forEach((objet, index) => {
    decalages.push(Buffer.byteLength(corps, "latin1"));
    corps += `${index + 1} 0 obj\n${objet}\nendobj\n`;
  });

  const debutXref = Buffer.byteLength(corps, "latin1");
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const decalage of decalages) {
    corps += `${String(decalage).padStart(10, "0")} 00000 n \n`;
  }
  corps += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`;

  return Buffer.from(corps, "latin1");
}
