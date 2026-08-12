import { describe, expect, it } from "vitest";
import { PdfContractRenderer } from "./pdf-contract-renderer.js";

/**
 * Le contrat est un document qui sortira du produit et sera relu par des
 * juristes. Trois proprietes doivent donc tenir sur CHAQUE feuillet, et pas
 * seulement sur le premier : l'identification de SANARYS, la reference du
 * document, et la pagination.
 *
 * Ce test existe parce que le pied de page ne s'affichait pas du tout. Il etait
 * positionne par `bottom`, que ce moteur de rendu ignore silencieusement — rien
 * ne plantait, le bloc etait simplement absent. Seule une lecture du PDF
 * produit pouvait le reveler.
 */

const DONNEES = {
  reference: "CSPS-TEST-0001",
  label: "Convention-cadre de test",
  organizationName: "Groupement de test",
  zoneName: "Zone Industrielle de Test",
  startDate: new Date("2026-01-01"),
  endDate: null,
  modules: ["AMBULANCE", "INFIRMIER"],
  parties: [
    { organizationName: "PME Alpha", sharePercent: 22 },
    { organizationName: "PME Beta", sharePercent: 18 },
  ],
} as const;

/** Texte de chaque page, via le meme lecteur qu'un navigateur. */
async function lirePages(bytes: Buffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let numero = 1; numero <= document.numPages; numero += 1) {
    const contenu = await (await document.getPage(numero)).getTextContent();
    pages.push(
      contenu.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return pages;
}

describe("convention-cadre en PDF", () => {
  it("porte en-tete, mentions legales et pagination sur chaque feuillet", async () => {
    const document = await new PdfContractRenderer().render(DONNEES, new Date("2026-08-12"));
    const pages = await lirePages(document.bytes);

    expect(pages.length).toBeGreaterThan(1);

    pages.forEach((texte, index) => {
      const feuillet = `page ${index + 1}`;
      expect(texte, `${feuillet} : reference absente de l'en-tete`).toContain("CSPS-TEST-0001");
      expect(texte, `${feuillet} : identite SANARYS absente du pied`).toContain("ICE");
      expect(texte, `${feuillet} : pagination absente`).toMatch(/Page \d+ \/ \d+/);
    });
  }, 30_000);

  it("identifie les deux parties et enonce les articles", async () => {
    const document = await new PdfContractRenderer().render(DONNEES, new Date("2026-08-12"));
    const complet = (await lirePages(document.bytes)).join(" ");

    expect(complet).toContain("Entre les soussignés");
    expect(complet).toContain("Groupement de test");
    expect(complet).toContain("Article 1");
    expect(complet).toContain("Article 8");
    expect(complet).toContain("Signature et cachet");
  }, 30_000);

  it("reprend la cle de repartition telle qu'elle est contractualisee", async () => {
    const document = await new PdfContractRenderer().render(DONNEES, new Date("2026-08-12"));
    const complet = (await lirePages(document.bytes)).join(" ");

    expect(complet).toContain("PME Alpha");
    expect(complet).toContain("22 %");
    expect(complet).toContain("PME Beta");
    expect(complet).toContain("18 %");
  }, 30_000);

  it("ne repete pas le qualificatif quand la zone le porte deja", async () => {
    const document = await new PdfContractRenderer().render(DONNEES, new Date("2026-08-12"));
    const complet = (await lirePages(document.bytes)).join(" ");

    // « la zone industrielle de Zone Industrielle de Test » serait fautif.
    expect(complet).not.toMatch(/zone industrielle de Zone Industrielle/i);
    expect(complet).toContain("la Zone Industrielle de Test");

    // JSX supprime l'espace en fin de ligne avant une expression : « au sein
    // de » suivi du nom de zone produisait « dela Zone Industrielle ». Le
    // typecheck ne voit rien, seule une lecture du PDF le revele.
    expect(complet).not.toMatch(/\bdela\b|\bdesla\b|\bdansla\b/i);
  }, 30_000);

  it("n'invente aucun numero d'immatriculation", async () => {
    const document = await new PdfContractRenderer().render(DONNEES, new Date("2026-08-12"));
    const complet = (await lirePages(document.bytes)).join(" ");

    // Les mentions legales du site declarent ces champs « a completer ».
    // Un numero de RC ou d'ICE fabrique aurait l'air vrai — c'est precisement
    // ce qu'il ne faut pas produire.
    expect(complet).toContain("[à compléter]");
    expect(complet).toMatch(/RC \[à compléter\]/);
    expect(complet).toMatch(/ICE \[à compléter\]/);
  }, 30_000);

  it("s'annonce comme document de demonstration", async () => {
    const document = await new PdfContractRenderer().render(DONNEES, new Date("2026-08-12"));
    const complet = (await lirePages(document.bytes)).join(" ");

    expect(complet).toContain("sans valeur contractuelle");
  }, 30_000);
});
