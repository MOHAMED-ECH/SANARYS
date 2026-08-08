import type { PrismaClient } from "@sanarys/db";
import type { ScoringFacts } from "../domain/lead.js";
import type { SimulationFactsPort } from "../domain/ports.js";

/**
 * Adaptateur temporaire : il lit la simulation directement en base.
 *
 * Le cas d'usage, lui, ne connait que `SimulationFactsPort` — cinq faits de
 * scoring. Le jour ou le module simulations exposera un modele de lecture dedie
 * dans son API publique, seul ce fichier change : ni le domaine, ni les cas
 * d'usage, ni les routes ne bougent. C'est tout l'interet d'avoir inverse la
 * dependance ici plutot que d'appeler Prisma depuis le cas d'usage.
 */
export class PrismaSimulationFacts implements SimulationFactsPort {
  constructor(private readonly prisma: PrismaClient) {}

  async factsFor(command: {
    simulationId: string;
    resumeTokenHash: string;
    now: Date;
  }): Promise<Omit<ScoringFacts, "hasSimulation"> | null> {
    const simulation = await this.prisma.simulation.findFirst({
      where: {
        id: command.simulationId,
        resumeTokenHash: command.resumeTokenHash,
        resumeTokenExpiresAt: { gt: command.now },
      },
    });
    if (!simulation) return null;

    const input = (simulation.inputJson ?? {}) as Record<string, Record<string, unknown>>;
    return {
      totalHeadcount: input.companies?.totalHeadcount as number | undefined,
      numberOfCompanies: input.companies?.numberOfCompanies as number | undefined,
      riskLevel: input.activity?.riskLevel as string | undefined,
      auditInterest: input.expectations?.auditInterest as boolean | undefined,
    };
  }
}
