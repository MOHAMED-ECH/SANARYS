import type { PrismaClient } from "@sanarys/db";
import type { StoragePort } from "../../../integrations/storage/index.js";
import type { DocumentArchivePort, SimulationSummaryDocument } from "../domain/ports.js";
import type { SimulationId } from "../domain/simulation.js";

/**
 * Archivage du recapitulatif : ecrit le fichier via le port de stockage et
 * enregistre la reference en base. Le cas d'usage ignore ces deux details.
 */
export class SimulationDocumentArchive implements DocumentArchivePort {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StoragePort,
  ) {}

  async archiveSummary(params: {
    simulationId: SimulationId;
    reference: string;
    document: SimulationSummaryDocument;
  }): Promise<{ documentId: string }> {
    const storageKey = `simulations/${params.simulationId}/${params.reference}.pdf`;

    await this.storage.put(storageKey, params.document.bytes, params.document.mimeType);

    const document = await this.prisma.document.create({
      data: {
        kind: "SIMULATION_SUMMARY",
        storageKey,
        mimeType: params.document.mimeType,
      },
    });

    return { documentId: document.id };
  }
}
