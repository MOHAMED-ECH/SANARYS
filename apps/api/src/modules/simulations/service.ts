import { createHash, randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@sanarys/db";
import { SimulationInputCompleteSchema, type SimulationInput, type SimulationResult } from "@sanarys/schemas";
import { deriveFacts, evaluateSimulation, type RuleSetDefinition } from "./rules-engine.js";

/** Duree de validite d'un lien de reprise de simulation. */
const RESUME_TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;

export const hashResumeToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class SimulationNotFoundError extends Error {}
export class SimulationIncompleteError extends Error {}
export class NoActiveRuleSetError extends Error {}

export interface StartSimulationResult {
  id: string;
  /** Renvoye UNE SEULE FOIS au navigateur ; seul le hash est persiste. */
  resumeToken: string;
}

export class SimulationService {
  constructor(private readonly prisma: PrismaClient) {}

  private async activeRuleSet() {
    const ruleSet = await this.prisma.simulationRuleSet.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { effectiveAt: "desc" },
    });
    if (!ruleSet) {
      throw new NoActiveRuleSetError("Aucun jeu de regles actif n'est configure.");
    }
    return ruleSet;
  }

  async start(industrialZoneId?: string): Promise<StartSimulationResult> {
    const ruleSet = await this.activeRuleSet();
    const resumeToken = randomBytes(32).toString("base64url");

    const simulation = await this.prisma.simulation.create({
      data: {
        ruleSetId: ruleSet.id,
        industrialZoneId: industrialZoneId ?? null,
        inputJson: {},
        resumeTokenHash: hashResumeToken(resumeToken),
        resumeTokenExpiresAt: new Date(Date.now() + RESUME_TOKEN_TTL_MS),
      },
    });

    return { id: simulation.id, resumeToken };
  }

  /** Sauvegarde incrementale d'une etape du wizard. */
  async patchStep(id: string, step: string, data: Record<string, unknown>) {
    const simulation = await this.prisma.simulation.findUnique({ where: { id } });
    if (!simulation) throw new SimulationNotFoundError();

    const input = (simulation.inputJson ?? {}) as Record<string, unknown>;
    const nextInput = { ...input, [step]: data };

    return this.prisma.simulation.update({
      where: { id },
      data: { inputJson: nextInput as Prisma.InputJsonValue },
    });
  }

  /** Reprise sans compte : le token en clair n'existe que cote navigateur. */
  async resume(id: string, resumeToken: string) {
    const simulation = await this.prisma.simulation.findUnique({ where: { id } });
    if (!simulation) throw new SimulationNotFoundError();

    const matches = simulation.resumeTokenHash === hashResumeToken(resumeToken);
    const expired = simulation.resumeTokenExpiresAt.getTime() < Date.now();
    if (!matches || expired) throw new SimulationNotFoundError();

    return simulation;
  }

  /**
   * Execute le moteur et fige un snapshot complet. Le resultat d'une simulation
   * deja terminee n'est jamais recalcule : les anciennes simulations restent
   * reproductibles meme si un nouveau ruleset est active ensuite.
   */
  async complete(id: string): Promise<{ result: SimulationResult; alreadyCompleted: boolean }> {
    const simulation = await this.prisma.simulation.findUnique({
      where: { id },
      include: { ruleSet: true },
    });
    if (!simulation) throw new SimulationNotFoundError();

    if (simulation.status === "COMPLETED" && simulation.resultJson) {
      return { result: simulation.resultJson as unknown as SimulationResult, alreadyCompleted: true };
    }

    const parsed = SimulationInputCompleteSchema.safeParse(simulation.inputJson);
    if (!parsed.success) {
      throw new SimulationIncompleteError(
        "Toutes les etapes du simulateur doivent etre renseignees avant le calcul.",
      );
    }

    const facts = deriveFacts(parsed.data);
    const result = evaluateSimulation(
      simulation.ruleSet.rulesJson as unknown as RuleSetDefinition,
      facts,
      { ruleSetVersion: simulation.ruleSet.version },
    );

    await this.prisma.simulation.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        resultJson: result as unknown as object,
      },
    });

    return { result, alreadyCompleted: false };
  }

  async getInput(id: string): Promise<SimulationInput> {
    const simulation = await this.prisma.simulation.findUnique({ where: { id } });
    if (!simulation) throw new SimulationNotFoundError();
    return (simulation.inputJson ?? {}) as SimulationInput;
  }
}
