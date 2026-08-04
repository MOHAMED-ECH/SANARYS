import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import { InvalidInputError, NotFoundError, UnavailableError } from "../../../shared/errors/domain-error.js";

/**
 * Domaine du simulateur CSPS.
 *
 * Aucune dependance a Fastify, Prisma, HTTP ou a un fournisseur externe :
 * ce fichier doit rester testable sans lancer de serveur ni de base
 * (guide, section 2.3).
 */

/** Identifiant metier typé (guide, section 8.3). */
export type SimulationId = string & { readonly __brand: "SimulationId" };
export type RuleSetId = string & { readonly __brand: "RuleSetId" };

export const asSimulationId = (value: string): SimulationId => value as SimulationId;
export const asRuleSetId = (value: string): RuleSetId => value as RuleSetId;

export type SimulationStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export const SIMULATION_STEPS = [
  "zone",
  "companies",
  "activity",
  "schedule",
  "existingSetup",
  "expectations",
  "contact",
] as const;

export type SimulationStep = (typeof SIMULATION_STEPS)[number];

export const isSimulationStep = (value: string): value is SimulationStep =>
  (SIMULATION_STEPS as readonly string[]).includes(value);

/** Duree de validite d'un lien de reprise de simulation. */
export const RESUME_TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;

// --- Erreurs metier (traduites en HTTP uniquement a la frontiere) ----------

export class SimulationNotFoundError extends NotFoundError {
  constructor() {
    super("SIMULATION_NOT_FOUND", "Simulation introuvable.");
  }
}

export class ResumeLinkInvalidError extends NotFoundError {
  constructor() {
    // Message identique a "introuvable" : un lien expire ne doit rien reveler.
    super("RESUME_LINK_INVALID", "Lien de reprise invalide ou expiré.");
  }
}

export class SimulationIncompleteError extends InvalidInputError {
  constructor() {
    super(
      "SIMULATION_INCOMPLETE",
      "Toutes les étapes du simulateur doivent être renseignées avant le calcul.",
    );
  }
}

export class UnknownSimulationStepError extends InvalidInputError {
  constructor(step: string) {
    super("UNKNOWN_STEP", `Étape inconnue : ${step}.`);
  }
}

export class NoActiveRuleSetError extends UnavailableError {
  constructor() {
    super("NO_ACTIVE_RULESET", "Aucun jeu de règles actif n'est configuré.");
  }
}

export class SimulationSummaryUnavailableError extends NotFoundError {
  constructor() {
    super("SUMMARY_UNAVAILABLE", "Aucun récapitulatif disponible pour cette simulation.");
  }
}

// --- Entite ----------------------------------------------------------------

export interface SimulationSnapshot {
  readonly id: SimulationId;
  readonly ruleSetId: RuleSetId;
  readonly ruleSetVersion: string;
  readonly status: SimulationStatus;
  readonly input: SimulationInput;
  readonly result: SimulationResult | null;
  readonly resumeTokenHash: string;
  readonly resumeTokenExpiresAt: Date;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

/**
 * Simulation : agregat portant ses propres transitions.
 *
 * Regle non negociable : une simulation terminee est FIGEE. Activer un
 * nouveau jeu de regles ne reecrit jamais un resultat deja calcule.
 */
export class Simulation {
  private constructor(private state: SimulationSnapshot) {}

  static fromSnapshot(snapshot: SimulationSnapshot): Simulation {
    return new Simulation(snapshot);
  }

  get id(): SimulationId {
    return this.state.id;
  }

  get status(): SimulationStatus {
    return this.state.status;
  }

  get input(): SimulationInput {
    return this.state.input;
  }

  get result(): SimulationResult | null {
    return this.state.result;
  }

  get ruleSetVersion(): string {
    return this.state.ruleSetVersion;
  }

  get snapshot(): SimulationSnapshot {
    return this.state;
  }

  /** Le resultat n'existe que si la simulation est effectivement terminee. */
  get isCompleted(): boolean {
    return this.state.status === "COMPLETED" && this.state.result !== null;
  }

  /** Enregistre une etape du wizard. Rejette une etape inconnue. */
  recordStep(step: string, data: Record<string, unknown>): SimulationInput {
    if (!isSimulationStep(step)) {
      throw new UnknownSimulationStepError(step);
    }
    const nextInput: SimulationInput = { ...this.state.input, [step]: data };
    this.state = { ...this.state, input: nextInput };
    return nextInput;
  }

  /** Verifie qu'un lien de reprise est valide a l'instant donne. */
  assertResumableWith(tokenHash: string, now: Date): void {
    const matches = this.state.resumeTokenHash === tokenHash;
    const expired = this.state.resumeTokenExpiresAt.getTime() < now.getTime();
    if (!matches || expired) {
      throw new ResumeLinkInvalidError();
    }
  }

  /** Fige le resultat. Une simulation deja terminee n'est jamais recalculee. */
  complete(result: SimulationResult, now: Date): void {
    if (this.isCompleted) return;
    this.state = { ...this.state, status: "COMPLETED", result, completedAt: now };
  }

  /** Reference lisible utilisee sur le recapitulatif PDF. */
  get reference(): string {
    return `SIM-${this.state.id.slice(-8).toUpperCase()}`;
  }
}
