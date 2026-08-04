import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import { SimulationInputCompleteSchema } from "@sanarys/schemas";
import { deriveFacts, evaluateSimulation } from "../domain/rules-engine.js";
import {
  NoActiveRuleSetError,
  RESUME_TOKEN_TTL_MS,
  Simulation,
  SimulationIncompleteError,
  SimulationNotFoundError,
  SimulationSummaryUnavailableError,
  type SimulationId,
} from "../domain/simulation.js";
import type {
  Clock,
  DocumentArchivePort,
  RuleSetRepository,
  SimulationRepository,
  SimulationSummaryDocument,
  SummaryGeneratorPort,
  TokenGenerator,
} from "../domain/ports.js";

/**
 * Cas d'usage du simulateur (guide, section 4.6).
 *
 * Ils orchestrent : charger, appeler le domaine, sauvegarder, retourner.
 * La regle metier elle-meme vit dans l'entite Simulation et dans le moteur
 * de regles. Aucun code HTTP, aucun acces ORM direct.
 */

interface Dependencies {
  readonly simulations: SimulationRepository;
  readonly ruleSets: RuleSetRepository;
  readonly clock: Clock;
  readonly tokens: TokenGenerator;
}

export interface StartSimulationResult {
  readonly id: SimulationId;
  /** Renvoye UNE SEULE FOIS a l'appelant ; seul le hash est persiste. */
  readonly resumeToken: string;
}

export class StartSimulationUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: { industrialZoneId?: string | undefined }): Promise<StartSimulationResult> {
    const ruleSet = await this.deps.ruleSets.findActive();
    if (!ruleSet) throw new NoActiveRuleSetError();

    const resumeToken = this.deps.tokens.generate();
    const now = this.deps.clock.now();

    const simulation = await this.deps.simulations.create({
      ruleSetId: ruleSet.id,
      industrialZoneId: command.industrialZoneId ?? null,
      resumeTokenHash: this.deps.tokens.hash(resumeToken),
      resumeTokenExpiresAt: new Date(now.getTime() + RESUME_TOKEN_TTL_MS),
    });

    return { id: simulation.id, resumeToken };
  }
}

export class SaveSimulationStepUseCase {
  constructor(private readonly deps: Pick<Dependencies, "simulations">) {}

  async execute(command: {
    id: SimulationId;
    step: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const simulation = await this.deps.simulations.findById(command.id);
    if (!simulation) throw new SimulationNotFoundError();

    // L'entite valide l'etape et produit le nouvel etat d'entree.
    const nextInput = simulation.recordStep(command.step, command.data);
    await this.deps.simulations.saveInput(command.id, nextInput);
  }
}

export interface ResumedSimulation {
  readonly id: SimulationId;
  readonly status: string;
  readonly input: SimulationInput;
  readonly result: SimulationResult | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

export class ResumeSimulationUseCase {
  constructor(private readonly deps: Pick<Dependencies, "simulations" | "clock" | "tokens">) {}

  async execute(command: { id: SimulationId; resumeToken: string }): Promise<Simulation> {
    const simulation = await this.deps.simulations.findById(command.id);
    if (!simulation) throw new SimulationNotFoundError();

    simulation.assertResumableWith(
      this.deps.tokens.hash(command.resumeToken),
      this.deps.clock.now(),
    );

    return simulation;
  }
}

export class CompleteSimulationUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: { id: SimulationId }): Promise<SimulationResult> {
    const simulation = await this.deps.simulations.findById(command.id);
    if (!simulation) throw new SimulationNotFoundError();

    // Une simulation deja terminee restitue son resultat fige, sans recalcul.
    const existing = simulation.result;
    if (simulation.isCompleted && existing) return existing;

    const parsed = SimulationInputCompleteSchema.safeParse(simulation.input);
    if (!parsed.success) throw new SimulationIncompleteError();

    const ruleSet = await this.deps.ruleSets.findActive();
    if (!ruleSet) throw new NoActiveRuleSetError();

    const now = this.deps.clock.now();
    const result = evaluateSimulation(ruleSet.definition, deriveFacts(parsed.data), {
      ruleSetVersion: ruleSet.version,
      now,
    });

    simulation.complete(result, now);
    await this.deps.simulations.saveResult(command.id, result, now);

    return result;
  }
}

export class GenerateSimulationSummaryUseCase {
  constructor(
    private readonly deps: Pick<Dependencies, "simulations"> & {
      readonly summaries: SummaryGeneratorPort;
      readonly archive: DocumentArchivePort;
    },
  ) {}

  async execute(command: { id: SimulationId }): Promise<SimulationSummaryDocument> {
    const simulation = await this.deps.simulations.findById(command.id);
    if (!simulation) throw new SimulationSummaryUnavailableError();

    const result = simulation.result;
    if (!simulation.isCompleted || !result) {
      throw new SimulationSummaryUnavailableError();
    }

    const document = await this.deps.summaries.generate({
      reference: simulation.reference,
      input: simulation.input,
      result,
    });

    // L'archivage ne doit pas etre repete a chaque telechargement.
    if (!(await this.deps.simulations.hasSummaryDocument(command.id))) {
      const { documentId } = await this.deps.archive.archiveSummary({
        simulationId: command.id,
        reference: simulation.reference,
        document,
      });
      await this.deps.simulations.attachSummaryDocument(command.id, documentId);
    }

    return document;
  }
}
