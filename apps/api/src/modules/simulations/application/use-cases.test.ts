import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import { FixedClock } from "../../../shared/time/system-clock.js";
import { DomainError } from "../../../shared/errors/domain-error.js";
import {
  Simulation,
  asRuleSetId,
  asSimulationId,
  type SimulationId,
  type SimulationSnapshot,
} from "../domain/simulation.js";
import type {
  ActiveRuleSet,
  CreateSimulationData,
  RuleSetRepository,
  SimulationRepository,
  SimulationSummaryDocument,
  SummaryGeneratorPort,
  DocumentArchivePort,
  TokenGenerator,
} from "../domain/ports.js";
import type { RuleSetDefinition } from "../domain/rules-engine.js";
import {
  CompleteSimulationUseCase,
  GenerateSimulationSummaryUseCase,
  ResumeSimulationUseCase,
  SaveSimulationStepUseCase,
  StartSimulationUseCase,
} from "./use-cases.js";

/**
 * Tests unitaires des cas d'usage.
 *
 * Ils s'executent SANS base de donnees, SANS serveur HTTP et SANS generation
 * PDF reelle : c'est precisement ce que permet l'inversion des dependances
 * (guide, sections 2.3 et 13.1). Avant la refonte, ces scenarios exigeaient
 * une base PostgreSQL.
 */

const NOW = new Date("2026-08-04T10:00:00.000Z");

const RULESET_DEFINITION: RuleSetDefinition = {
  vehicleType: [
    { id: "VEH-02", status: "ACTIVE", when: "default", result: "TYPE_B", rationale: "Standard." },
  ],
  modules: [],
  coverage: [
    {
      id: "COV-01",
      status: "ACTIVE",
      when: "default",
      result: "TARGET_UNDER_10MIN",
      rationale: "Objectif contractuel.",
    },
  ],
  costShareFormula: [
    {
      id: "COST-01",
      status: "ACTIVE",
      when: "default",
      formula: "hybrid_40_fixed_60_headcount",
      rationale: "Formule hybride.",
    },
  ],
};

const COMPLETE_INPUT: SimulationInput = {
  zone: { city: "Bouskoura", zoneName: "ZI Bouskoura" },
  companies: { numberOfCompanies: 4, sizeBrackets: ["B50_150"], totalHeadcount: 200 },
  activity: { sectors: ["AUTOMOBILE"], riskLevel: "MEDIUM", hasHazardousMaterials: false },
  schedule: {
    workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
    nightWork: false,
    weekendWork: false,
    seasonalPeaks: false,
  },
  existingSetup: {
    hasAmbulance: false,
    hasInfirmary: false,
    existingStaff: "NONE",
    hasOccupationalHealthConvention: true,
    hasExternalContracts: false,
  },
  expectations: { desiredModules: [], reportingLevel: "BASIC", trainingInterest: false, auditInterest: true },
  contact: {
    name: "Karim Bennani",
    company: "Atlas Câblage",
    email: "k@example.ma",
    consent: true,
    consentVersion: "2026.08.0",
  },
};

// --- Doublures en memoire --------------------------------------------------

class InMemorySimulationRepository implements SimulationRepository {
  readonly rows = new Map<string, SimulationSnapshot>();
  private sequence = 0;

  constructor(seed: SimulationSnapshot[] = []) {
    for (const snapshot of seed) this.rows.set(snapshot.id, snapshot);
  }

  async create(data: CreateSimulationData): Promise<Simulation> {
    this.sequence += 1;
    const snapshot: SimulationSnapshot = {
      id: asSimulationId(`sim-${this.sequence}`),
      ruleSetId: data.ruleSetId,
      ruleSetVersion: "2026.08.0",
      status: "IN_PROGRESS",
      input: {},
      result: null,
      resumeTokenHash: data.resumeTokenHash,
      resumeTokenExpiresAt: data.resumeTokenExpiresAt,
      createdAt: NOW,
      completedAt: null,
    };
    this.rows.set(snapshot.id, snapshot);
    return Simulation.fromSnapshot(snapshot);
  }

  async findById(id: SimulationId): Promise<Simulation | null> {
    const snapshot = this.rows.get(id);
    return snapshot ? Simulation.fromSnapshot(snapshot) : null;
  }

  async saveInput(id: SimulationId, input: SimulationInput): Promise<void> {
    const current = this.rows.get(id);
    if (current) this.rows.set(id, { ...current, input });
  }

  async saveResult(id: SimulationId, result: SimulationResult, completedAt: Date): Promise<void> {
    const current = this.rows.get(id);
    if (current) this.rows.set(id, { ...current, status: "COMPLETED", result, completedAt });
  }

  async attachSummaryDocument(id: SimulationId, documentId: string): Promise<void> {
    this.attached.set(id, documentId);
  }

  async hasSummaryDocument(id: SimulationId): Promise<boolean> {
    return this.attached.has(id);
  }

  readonly attached = new Map<string, string>();
}

class StubRuleSetRepository implements RuleSetRepository {
  constructor(private readonly ruleSet: ActiveRuleSet | null) {}

  async findActive(): Promise<ActiveRuleSet | null> {
    return this.ruleSet;
  }
}

const ACTIVE_RULESET: ActiveRuleSet = {
  id: asRuleSetId("ruleset-1"),
  version: "2026.08.0",
  definition: RULESET_DEFINITION,
};

/**
 * Generateur deterministe : le test controle le jeton produit, mais le
 * hachage reste un vrai SHA-256. Une doublure qui renverrait `hash(${token})`
 * rendrait le test de non-fuite sans valeur, puisque le condensat
 * contiendrait le jeton en clair.
 */
class StubTokenGenerator implements TokenGenerator {
  constructor(private readonly token = "jeton-de-test") {}

  generate(): string {
    return this.token;
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}

const HASHED_TEST_TOKEN = createHash("sha256").update("jeton-de-test").digest("hex");

function snapshotOf(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    id: asSimulationId("sim-1"),
    ruleSetId: asRuleSetId("ruleset-1"),
    ruleSetVersion: "2026.08.0",
    status: "IN_PROGRESS",
    input: {},
    result: null,
    resumeTokenHash: HASHED_TEST_TOKEN,
    resumeTokenExpiresAt: new Date(NOW.getTime() + 1000),
    createdAt: NOW,
    completedAt: null,
    ...overrides,
  };
}

function buildDeps(seed: SimulationSnapshot[] = [], ruleSet: ActiveRuleSet | null = ACTIVE_RULESET) {
  return {
    simulations: new InMemorySimulationRepository(seed),
    ruleSets: new StubRuleSetRepository(ruleSet),
    clock: new FixedClock(NOW),
    tokens: new StubTokenGenerator(),
  };
}

// --- Tests -----------------------------------------------------------------

describe("StartSimulationUseCase", () => {
  it("ne persiste que le condensat du jeton de reprise", async () => {
    const deps = buildDeps();
    const result = await new StartSimulationUseCase(deps).execute({});

    expect(result.resumeToken).toBe("jeton-de-test");

    const stored = deps.simulations.rows.get(result.id);
    expect(stored?.resumeTokenHash).toBe(HASHED_TEST_TOKEN);
    // Le jeton en clair ne doit apparaitre nulle part dans l'etat persiste.
    expect(JSON.stringify(stored)).not.toContain("jeton-de-test");
  });

  it("échoue explicitement sans jeu de règles actif", async () => {
    const deps = buildDeps([], null);
    await expect(new StartSimulationUseCase(deps).execute({})).rejects.toBeInstanceOf(DomainError);
  });
});

describe("SaveSimulationStepUseCase", () => {
  it("enregistre une étape connue", async () => {
    const deps = buildDeps([snapshotOf()]);
    await new SaveSimulationStepUseCase(deps).execute({
      id: asSimulationId("sim-1"),
      step: "zone",
      data: { city: "Bouskoura", zoneName: "ZI Bouskoura" },
    });

    expect(deps.simulations.rows.get("sim-1")?.input).toMatchObject({
      zone: { city: "Bouskoura" },
    });
  });

  it("rejette une étape inconnue", async () => {
    const deps = buildDeps([snapshotOf()]);
    await expect(
      new SaveSimulationStepUseCase(deps).execute({
        id: asSimulationId("sim-1"),
        step: "etape-inventee",
        data: {},
      }),
    ).rejects.toThrow(/Étape inconnue/);
  });

  it("rejette une simulation inexistante", async () => {
    const deps = buildDeps();
    await expect(
      new SaveSimulationStepUseCase(deps).execute({
        id: asSimulationId("inconnue"),
        step: "zone",
        data: {},
      }),
    ).rejects.toThrow(/introuvable/);
  });
});

describe("ResumeSimulationUseCase", () => {
  it("accepte un jeton valide", async () => {
    const deps = buildDeps([snapshotOf()]);
    const simulation = await new ResumeSimulationUseCase(deps).execute({
      id: asSimulationId("sim-1"),
      resumeToken: "jeton-de-test",
    });
    expect(simulation.id).toBe("sim-1");
  });

  it("refuse un jeton erroné", async () => {
    const deps = buildDeps([snapshotOf()]);
    await expect(
      new ResumeSimulationUseCase(deps).execute({
        id: asSimulationId("sim-1"),
        resumeToken: "mauvais-jeton",
      }),
    ).rejects.toThrow(/invalide ou expiré/);
  });

  it("refuse un jeton expiré", async () => {
    const deps = buildDeps([
      snapshotOf({ resumeTokenExpiresAt: new Date(NOW.getTime() - 1000) }),
    ]);
    await expect(
      new ResumeSimulationUseCase(deps).execute({
        id: asSimulationId("sim-1"),
        resumeToken: "jeton-de-test",
      }),
    ).rejects.toThrow(/invalide ou expiré/);
  });
});

describe("CompleteSimulationUseCase", () => {
  it("calcule et fige le résultat", async () => {
    const deps = buildDeps([snapshotOf({ input: COMPLETE_INPUT })]);
    const result = await new CompleteSimulationUseCase(deps).execute({
      id: asSimulationId("sim-1"),
    });

    expect(result.vehicleType.code).toBe("TYPE_B");
    expect(result.ruleSetVersion).toBe("2026.08.0");
    expect(result.generatedAt).toBe(NOW.toISOString());
    expect(deps.simulations.rows.get("sim-1")?.status).toBe("COMPLETED");
  });

  it("ne recalcule JAMAIS une simulation déjà terminée", async () => {
    const figé: SimulationResult = {
      ruleSetVersion: "2020.01.0",
      vehicleType: { ruleId: "ANCIENNE", rationale: "Ancienne règle.", code: "TYPE_C" },
      suggestedModules: [],
      coverage: { ruleId: "COV-ANCIEN", rationale: "…", targetLabel: "…", disclaimer: "…" },
      costShare: { ruleId: "COST-ANCIEN", rationale: "…", formula: "ancienne" },
      assumptions: [],
      generatedAt: "2020-01-01T00:00:00.000Z",
    };

    const deps = buildDeps([
      snapshotOf({ status: "COMPLETED", input: COMPLETE_INPUT, result: figé }),
    ]);

    const result = await new CompleteSimulationUseCase(deps).execute({
      id: asSimulationId("sim-1"),
    });

    // Le résultat historique est restitué tel quel, malgré un ruleset plus récent.
    expect(result.ruleSetVersion).toBe("2020.01.0");
    expect(result.vehicleType.ruleId).toBe("ANCIENNE");
  });

  it("refuse de calculer une simulation incomplète", async () => {
    const deps = buildDeps([snapshotOf({ input: { zone: COMPLETE_INPUT.zone } })]);
    await expect(
      new CompleteSimulationUseCase(deps).execute({ id: asSimulationId("sim-1") }),
    ).rejects.toThrow(/étapes du simulateur/);
  });
});

describe("GenerateSimulationSummaryUseCase", () => {
  const document: SimulationSummaryDocument = {
    bytes: Buffer.from("%PDF-factice"),
    mimeType: "application/pdf",
    fileName: "test.pdf",
  };

  class StubSummaryGenerator implements SummaryGeneratorPort {
    calls = 0;
    async generate(): Promise<SimulationSummaryDocument> {
      this.calls += 1;
      return document;
    }
  }

  class StubArchive implements DocumentArchivePort {
    calls = 0;
    async archiveSummary(): Promise<{ documentId: string }> {
      this.calls += 1;
      return { documentId: `doc-${this.calls}` };
    }
  }

  it("refuse de produire un récapitulatif pour une simulation non terminée", async () => {
    const simulations = new InMemorySimulationRepository([snapshotOf()]);
    const useCase = new GenerateSimulationSummaryUseCase({
      simulations,
      summaries: new StubSummaryGenerator(),
      archive: new StubArchive(),
    });

    await expect(useCase.execute({ id: asSimulationId("sim-1") })).rejects.toThrow(
      /Aucun récapitulatif/,
    );
  });

  it("n'archive qu'une seule fois, même sur plusieurs téléchargements", async () => {
    const completed: SimulationResult = {
      ruleSetVersion: "2026.08.0",
      vehicleType: { ruleId: "VEH-02", rationale: "Standard.", code: "TYPE_B" },
      suggestedModules: [],
      coverage: { ruleId: "COV-01", rationale: "…", targetLabel: "…", disclaimer: "…" },
      costShare: { ruleId: "COST-01", rationale: "…", formula: "hybrid" },
      assumptions: [],
      generatedAt: NOW.toISOString(),
    };

    const simulations = new InMemorySimulationRepository([
      snapshotOf({ status: "COMPLETED", input: COMPLETE_INPUT, result: completed }),
    ]);
    const archive = new StubArchive();
    const useCase = new GenerateSimulationSummaryUseCase({
      simulations,
      summaries: new StubSummaryGenerator(),
      archive,
    });

    await useCase.execute({ id: asSimulationId("sim-1") });
    await useCase.execute({ id: asSimulationId("sim-1") });

    expect(archive.calls).toBe(1);
  });
});
