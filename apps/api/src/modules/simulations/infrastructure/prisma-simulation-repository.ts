import type { Prisma, PrismaClient } from "@sanarys/db";
import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import type {
  ActiveRuleSet,
  CreateSimulationData,
  RuleSetRepository,
  SimulationRepository,
} from "../domain/ports.js";
import type { RuleSetDefinition } from "../domain/rules-engine.js";
import {
  Simulation,
  asRuleSetId,
  asSimulationId,
  type SimulationId,
  type SimulationSnapshot,
} from "../domain/simulation.js";

/**
 * Implementations Prisma des ports du module.
 *
 * C'est le SEUL endroit du module qui connait l'ORM. Le mapping entre le
 * modele de persistance et l'agregat metier se fait ici (guide, section 4.2 :
 * modele ORM != entite metier).
 */

type SimulationRow = Prisma.SimulationGetPayload<{ include: { ruleSet: true } }>;

function toDomain(row: SimulationRow): Simulation {
  const snapshot: SimulationSnapshot = {
    id: asSimulationId(row.id),
    ruleSetId: asRuleSetId(row.ruleSetId),
    ruleSetVersion: row.ruleSet.version,
    status: row.status,
    input: (row.inputJson ?? {}) as SimulationInput,
    result: (row.resultJson as SimulationResult | null) ?? null,
    resumeTokenHash: row.resumeTokenHash,
    resumeTokenExpiresAt: row.resumeTokenExpiresAt,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
  return Simulation.fromSnapshot(snapshot);
}

export class PrismaSimulationRepository implements SimulationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateSimulationData): Promise<Simulation> {
    const row = await this.prisma.simulation.create({
      data: {
        ruleSetId: data.ruleSetId,
        industrialZoneId: data.industrialZoneId,
        inputJson: {},
        resumeTokenHash: data.resumeTokenHash,
        resumeTokenExpiresAt: data.resumeTokenExpiresAt,
      },
      include: { ruleSet: true },
    });
    return toDomain(row);
  }

  async findById(id: SimulationId): Promise<Simulation | null> {
    const row = await this.prisma.simulation.findUnique({
      where: { id },
      include: { ruleSet: true },
    });
    return row ? toDomain(row) : null;
  }

  async saveInput(id: SimulationId, input: SimulationInput): Promise<void> {
    await this.prisma.simulation.update({
      where: { id },
      data: { inputJson: input as Prisma.InputJsonValue },
    });
  }

  async saveResult(id: SimulationId, result: SimulationResult, completedAt: Date): Promise<void> {
    await this.prisma.simulation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt,
        resultJson: result as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async attachSummaryDocument(id: SimulationId, documentId: string): Promise<void> {
    await this.prisma.simulation.update({
      where: { id },
      data: { pdfDocumentId: documentId },
    });
  }

  async hasSummaryDocument(id: SimulationId): Promise<boolean> {
    const row = await this.prisma.simulation.findUnique({
      where: { id },
      select: { pdfDocumentId: true },
    });
    return Boolean(row?.pdfDocumentId);
  }
}

export class PrismaRuleSetRepository implements RuleSetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive(): Promise<ActiveRuleSet | null> {
    const row = await this.prisma.simulationRuleSet.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { effectiveAt: "desc" },
    });
    if (!row) return null;

    return {
      id: asRuleSetId(row.id),
      version: row.version,
      definition: row.rulesJson as unknown as RuleSetDefinition,
    };
  }
}
