import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import type { RuleSetDefinition } from "./rules-engine.js";
import type { RuleSetId, Simulation, SimulationId } from "./simulation.js";

/**
 * Ports du module simulations : le domaine declare ce dont il a besoin,
 * l'infrastructure fournit les implementations (guide, section 5.5 —
 * inversion des dependances).
 *
 * Aucune de ces interfaces ne mentionne Prisma, un schema SQL ou un
 * fournisseur externe.
 */

export interface ActiveRuleSet {
  readonly id: RuleSetId;
  readonly version: string;
  readonly definition: RuleSetDefinition;
}

export interface CreateSimulationData {
  readonly ruleSetId: RuleSetId;
  readonly industrialZoneId: string | null;
  readonly resumeTokenHash: string;
  readonly resumeTokenExpiresAt: Date;
}

/** Collection d'agregats Simulation (guide, section 7.5). */
export interface SimulationRepository {
  create(data: CreateSimulationData): Promise<Simulation>;
  findById(id: SimulationId): Promise<Simulation | null>;
  saveInput(id: SimulationId, input: SimulationInput): Promise<void>;
  saveResult(id: SimulationId, result: SimulationResult, completedAt: Date): Promise<void>;
  attachSummaryDocument(id: SimulationId, documentId: string): Promise<void>;
  hasSummaryDocument(id: SimulationId): Promise<boolean>;
}

export interface RuleSetRepository {
  findActive(): Promise<ActiveRuleSet | null>;
  findById(id: RuleSetId): Promise<ActiveRuleSet | null>;
}

/** Generation du recapitulatif : un port, plusieurs implementations possibles. */
export interface SimulationSummaryDocument {
  readonly bytes: Buffer;
  readonly mimeType: string;
  readonly fileName: string;
}

export interface SummaryGeneratorPort {
  generate(params: {
    reference: string;
    input: SimulationInput;
    result: SimulationResult;
  }): Promise<SimulationSummaryDocument>;
}

/** Archivage du document genere, derriere une interface de forme S3. */
export interface DocumentArchivePort {
  archiveSummary(params: {
    simulationId: SimulationId;
    reference: string;
    document: SimulationSummaryDocument;
  }): Promise<{ documentId: string }>;
}

/** Source de temps injectable : garde les cas d'usage deterministes en test. */
export interface Clock {
  now(): Date;
}

/** Generation de jetons opaques (reprise de simulation). */
export interface TokenGenerator {
  generate(): string;
  hash(token: string): string;
}
