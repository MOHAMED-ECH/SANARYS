/**
 * Depose les documents de demonstration dans le stockage.
 *
 * Pourquoi ce script vit dans l'API et non dans le seed de `packages/db` : le
 * rendu PDF s'appuie sur `@react-pdf/renderer`, qui appartient a l'API.
 * L'appeler depuis le paquet `db` creerait une dependance du modele de donnees
 * vers l'application — exactement le sens que l'architecture interdit. C'est
 * donc l'API qui depose ses propres documents, apres que le seed a cree les
 * organisations et les contrats.
 *
 * `npm run db:seed` enchaine les deux : l'utilisateur ne voit qu'une commande.
 *
 * En production, une convention-cadre est un document signe puis televerse.
 * Celui-ci est fabrique pour que le parcours de telechargement soit
 * demontrable, et il le dit lui-meme en pied de page.
 */

import { prisma } from "@sanarys/db";
import { env } from "../env.js";
import { createStorageAdapter } from "../integrations/storage/index.js";
import {
  PdfContractRenderer,
  type ContractParty,
} from "../modules/organizations/infrastructure/pdf-contract-renderer.js";

const STORAGE_KEY = "contracts/convention-cadre-bouskoura.pdf";
const DOCUMENT_ID = "seed-document-convention";

async function main() {
  const contract = await prisma.contract.findFirst({
    where: { id: "seed-contract-bouskoura" },
    include: {
      organization: { include: { industrialZone: true } },
      parties: { include: { organization: true } },
    },
  });

  if (!contract) {
    console.log("Documents : aucun contrat de demonstration en base, rien a deposer.");
    console.log("            Lancez d'abord `npm run db:seed`.");
    return;
  }

  const parties: ContractParty[] = contract.parties.map((party) => ({
    organizationName: party.organization.name,
    sharePercent: party.shareRatio === null ? null : Math.round(party.shareRatio * 1000) / 10,
  }));

  const document = await new PdfContractRenderer().render({
    // La reference est stable : le document regenere doit rester le meme.
    reference: "CSPS-BSK-2026-001",
    label: contract.label,
    organizationName: contract.organization.name,
    zoneName: contract.organization.industrialZone?.name ?? null,
    startDate: contract.startDate,
    endDate: contract.endDate,
    modules: contract.modules,
    parties,
  });

  const storage = createStorageAdapter(env.STORAGE_DIR);
  await storage.put(STORAGE_KEY, document.bytes, document.mimeType);

  await prisma.document.upsert({
    where: { id: DOCUMENT_ID },
    update: { storageKey: STORAGE_KEY, mimeType: document.mimeType },
    create: {
      id: DOCUMENT_ID,
      kind: "CONTRACT",
      storageKey: STORAGE_KEY,
      mimeType: document.mimeType,
      ownerOrgId: contract.organizationId,
    },
  });

  console.log(
    `Documents : convention-cadre deposee (${(document.bytes.length / 1024).toFixed(1)} Ko) -> ${STORAGE_KEY}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
