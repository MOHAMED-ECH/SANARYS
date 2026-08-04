import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { StoragePort } from "../../integrations/storage/index.js";
import { Sha256TokenGenerator } from "../../shared/cryptography/token-generator.js";
import { SystemClock, type ClockPort } from "../../shared/time/system-clock.js";
import {
  CompleteSimulationUseCase,
  GenerateSimulationSummaryUseCase,
  ResumeSimulationUseCase,
  SaveSimulationStepUseCase,
  StartSimulationUseCase,
} from "./application/use-cases.js";
import { SimulationDocumentArchive } from "./infrastructure/document-archive.js";
import { PdfSummaryGenerator } from "./infrastructure/pdf-summary-generator.js";
import {
  PrismaRuleSetRepository,
  PrismaSimulationRepository,
} from "./infrastructure/prisma-simulation-repository.js";
import { createSimulationsRoutes } from "./presentation/routes.js";

/**
 * API publique du module simulations (guide, section 3.3).
 *
 * Les autres modules et le composeur d'application passent par ce point
 * d'entree : les imports profonds vers `infrastructure/` ou `domain/` depuis
 * l'exterieur du module sont interdits.
 */

export interface SimulationsModule {
  readonly startSimulation: StartSimulationUseCase;
  readonly saveSimulationStep: SaveSimulationStepUseCase;
  readonly resumeSimulation: ResumeSimulationUseCase;
  readonly completeSimulation: CompleteSimulationUseCase;
  readonly generateSimulationSummary: GenerateSimulationSummaryUseCase;
}

export interface SimulationsModuleDependencies {
  readonly prisma: PrismaClient;
  readonly storage: StoragePort;
  readonly clock?: ClockPort | undefined;
}

export function createSimulationsModule(deps: SimulationsModuleDependencies): SimulationsModule {
  const simulations = new PrismaSimulationRepository(deps.prisma);
  const ruleSets = new PrismaRuleSetRepository(deps.prisma);
  const clock = deps.clock ?? new SystemClock();
  const tokens = new Sha256TokenGenerator();

  const core = { simulations, ruleSets, clock, tokens };

  return {
    startSimulation: new StartSimulationUseCase(core),
    saveSimulationStep: new SaveSimulationStepUseCase({ simulations }),
    resumeSimulation: new ResumeSimulationUseCase({ simulations, clock, tokens }),
    completeSimulation: new CompleteSimulationUseCase(core),
    generateSimulationSummary: new GenerateSimulationSummaryUseCase({
      simulations,
      summaries: new PdfSummaryGenerator(),
      archive: new SimulationDocumentArchive(deps.prisma, deps.storage),
    }),
  };
}

export function simulationsRoutes(module: SimulationsModule): FastifyPluginAsyncZod {
  return createSimulationsRoutes(module);
}
