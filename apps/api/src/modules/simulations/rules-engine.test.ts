import { describe, expect, it } from "vitest";
import {
  computeCostShareRatios,
  deriveFacts,
  evaluateCondition,
  evaluateSimulation,
  type RuleSetDefinition,
  type SimulationFacts,
} from "./rules-engine.js";

const RULESET: RuleSetDefinition = {
  vehicleType: [
    {
      id: "VEH-01",
      status: "ACTIVE",
      when: {
        any: [
          { field: "riskLevel", op: "eq", value: "HIGH" },
          { field: "totalHeadcount", op: "gte", value: 500 },
        ],
      },
      result: "TYPE_C",
      rationale: "Reanimation mobile.",
    },
    { id: "VEH-02", status: "ACTIVE", when: "default", result: "TYPE_B", rationale: "Soins d'urgence." },
  ],
  modules: [
    {
      id: "MOD-NURSE-01",
      status: "ACTIVE",
      when: {
        any: [
          { field: "totalHeadcount", op: "gte", value: 150 },
          { field: "nightWork", op: "eq", value: true },
        ],
      },
      result: "SUGGEST_NURSE",
      rationale: "Presence infirmiere.",
    },
    {
      id: "MOD-DOCTOR-01",
      status: "ACTIVE",
      when: {
        all: [
          { field: "riskLevel", op: "eq", value: "HIGH" },
          { field: "totalHeadcount", op: "gte", value: 300 },
        ],
      },
      result: "SUGGEST_DOCTOR",
      rationale: "Presence medicale.",
    },
    {
      id: "MOD-INFIRMERIE-01",
      status: "ACTIVE",
      when: {
        all: [
          { field: "hasInfirmary", op: "eq", value: false },
          { field: "numberOfCompanies", op: "gte", value: 3 },
        ],
      },
      result: "SUGGEST_INFIRMARY",
      rationale: "Local mutualise.",
    },
    {
      id: "MOD-ARCHIVED-01",
      status: "ARCHIVED",
      when: "default",
      result: "SUGGEST_NURSE",
      rationale: "Regle archivee, ne doit jamais se declencher.",
    },
  ],
  coverage: [
    {
      id: "COV-01",
      status: "ACTIVE",
      when: "default",
      result: "TARGET_UNDER_10MIN",
      rationale: "Objectif contractuel.",
      disclaimer: "Estimation illustrative.",
    },
  ],
  costShareFormula: [
    {
      id: "COST-01",
      status: "ACTIVE",
      when: "default",
      formula: "hybrid_40_fixed_60_headcount",
      rationale: "Formule hybride indicative.",
    },
  ],
};

const baseFacts: SimulationFacts = {
  totalHeadcount: 80,
  numberOfCompanies: 2,
  riskLevel: "LOW",
  nightWork: false,
  weekendWork: false,
  hasAmbulance: false,
  hasInfirmary: true,
  hasHazardousMaterials: false,
  existingStaff: "NONE",
  sectors: ["TEXTILE"],
};

const facts = (overrides: Partial<SimulationFacts> = {}): SimulationFacts => ({
  ...baseFacts,
  ...overrides,
});

describe("evaluateCondition", () => {
  it("traite 'default' comme toujours vrai", () => {
    expect(evaluateCondition("default", facts())).toBe(true);
  });

  it("exige toutes les conditions avec 'all'", () => {
    const condition = {
      all: [
        { field: "riskLevel", op: "eq" as const, value: "HIGH" },
        { field: "totalHeadcount", op: "gte" as const, value: 300 },
      ],
    };
    expect(evaluateCondition(condition, facts({ riskLevel: "HIGH", totalHeadcount: 400 }))).toBe(true);
    expect(evaluateCondition(condition, facts({ riskLevel: "HIGH", totalHeadcount: 100 }))).toBe(false);
  });

  it("suffit d'une condition avec 'any'", () => {
    const condition = {
      any: [
        { field: "nightWork", op: "eq" as const, value: true },
        { field: "totalHeadcount", op: "gte" as const, value: 150 },
      ],
    };
    expect(evaluateCondition(condition, facts({ nightWork: true }))).toBe(true);
    expect(evaluateCondition(condition, facts())).toBe(false);
  });
});

describe("evaluateSimulation - type de vehicule", () => {
  it("VEH-01 : risque eleve declenche le type C", () => {
    const result = evaluateSimulation(RULESET, facts({ riskLevel: "HIGH" }), {
      ruleSetVersion: "test",
    });
    expect(result.vehicleType.code).toBe("TYPE_C");
    expect(result.vehicleType.ruleId).toBe("VEH-01");
  });

  it("VEH-01 : effectif >= 500 declenche le type C meme a risque faible", () => {
    const result = evaluateSimulation(RULESET, facts({ totalHeadcount: 500 }), {
      ruleSetVersion: "test",
    });
    expect(result.vehicleType.code).toBe("TYPE_C");
  });

  it("VEH-02 : cas standard retombe sur le type B", () => {
    const result = evaluateSimulation(RULESET, facts(), { ruleSetVersion: "test" });
    expect(result.vehicleType.code).toBe("TYPE_B");
    expect(result.vehicleType.ruleId).toBe("VEH-02");
  });
});

describe("evaluateSimulation - modules suggeres", () => {
  it("MOD-NURSE-01 : le travail de nuit suffit", () => {
    const result = evaluateSimulation(RULESET, facts({ nightWork: true }), {
      ruleSetVersion: "test",
    });
    expect(result.suggestedModules.map((m) => m.code)).toContain("NURSE");
  });

  it("MOD-DOCTOR-01 : exige risque eleve ET effectif >= 300", () => {
    const partial = evaluateSimulation(RULESET, facts({ riskLevel: "HIGH", totalHeadcount: 200 }), {
      ruleSetVersion: "test",
    });
    expect(partial.suggestedModules.map((m) => m.code)).not.toContain("DOCTOR");

    const full = evaluateSimulation(RULESET, facts({ riskLevel: "HIGH", totalHeadcount: 300 }), {
      ruleSetVersion: "test",
    });
    expect(full.suggestedModules.map((m) => m.code)).toContain("DOCTOR");
  });

  it("MOD-INFIRMERIE-01 : pas suggere si une infirmerie existe deja", () => {
    const withInfirmary = evaluateSimulation(RULESET, facts({ hasInfirmary: true, numberOfCompanies: 5 }), {
      ruleSetVersion: "test",
    });
    expect(withInfirmary.suggestedModules.map((m) => m.code)).not.toContain("INFIRMARY");

    const without = evaluateSimulation(RULESET, facts({ hasInfirmary: false, numberOfCompanies: 5 }), {
      ruleSetVersion: "test",
    });
    expect(without.suggestedModules.map((m) => m.code)).toContain("INFIRMARY");
  });

  it("ignore les regles non ACTIVE", () => {
    const result = evaluateSimulation(RULESET, facts(), { ruleSetVersion: "test" });
    expect(result.suggestedModules.map((m) => m.ruleId)).not.toContain("MOD-ARCHIVED-01");
  });

  it("ne suggere aucun module pour une petite zone a faible risque", () => {
    const result = evaluateSimulation(RULESET, facts({ hasInfirmary: true }), {
      ruleSetVersion: "test",
    });
    expect(result.suggestedModules).toHaveLength(0);
  });
});

describe("evaluateSimulation - tracabilite du snapshot", () => {
  it("porte la version du ruleset, les hypotheses et l'horodatage", () => {
    const now = new Date("2026-08-04T10:00:00.000Z");
    const result = evaluateSimulation(RULESET, facts(), { ruleSetVersion: "2026.08.0", now });

    expect(result.ruleSetVersion).toBe("2026.08.0");
    expect(result.generatedAt).toBe(now.toISOString());
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.coverage.disclaimer).toContain("illustrative");
  });

  it("expose la justification de chaque regle declenchee", () => {
    const result = evaluateSimulation(RULESET, facts({ riskLevel: "HIGH", totalHeadcount: 600 }), {
      ruleSetVersion: "test",
    });
    expect(result.vehicleType.rationale).toBeTruthy();
    for (const module of result.suggestedModules) {
      expect(module.rationale).toBeTruthy();
      expect(module.ruleId).toBeTruthy();
    }
  });

  it("echoue explicitement si le ruleset est incomplet", () => {
    const broken: RuleSetDefinition = { ...RULESET, vehicleType: [] };
    expect(() => evaluateSimulation(broken, facts(), { ruleSetVersion: "test" })).toThrow(
      /type de vehicule/i,
    );
  });
});

describe("deriveFacts", () => {
  it("normalise les reponses du wizard en faits", () => {
    const derived = deriveFacts({
      companies: { numberOfCompanies: 4, totalHeadcount: 320 },
      activity: { riskLevel: "HIGH", sectors: ["AUTOMOBILE"], hasHazardousMaterials: true },
      schedule: { nightWork: true, weekendWork: false },
      existingSetup: { hasAmbulance: false, hasInfirmary: false, existingStaff: "NONE" },
    });

    expect(derived).toMatchObject({
      totalHeadcount: 320,
      numberOfCompanies: 4,
      riskLevel: "HIGH",
      nightWork: true,
      hasInfirmary: false,
    });
  });
});

describe("computeCostShareRatios", () => {
  it("repartit 40% en part fixe et 60% selon l'effectif", () => {
    const shares = computeCostShareRatios("hybrid_40_fixed_60_headcount", [
      { label: "PME A", headcount: 300 },
      { label: "PME B", headcount: 100 },
    ]);

    // PME A : 20% fixe + 45% variable = 65% ; PME B : 20% + 15% = 35%
    expect(shares[0]!.sharePercent).toBeCloseTo(65, 1);
    expect(shares[1]!.sharePercent).toBeCloseTo(35, 1);
  });

  it("totalise 100% quel que soit le nombre d'entreprises", () => {
    const shares = computeCostShareRatios("hybrid_40_fixed_60_headcount", [
      { label: "A", headcount: 50 },
      { label: "B", headcount: 120 },
      { label: "C", headcount: 30 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.sharePercent, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it("repartit a egalite si aucun effectif n'est connu", () => {
    const shares = computeCostShareRatios("hybrid_40_fixed_60_headcount", [
      { label: "A", headcount: 0 },
      { label: "B", headcount: 0 },
    ]);
    expect(shares[0]!.sharePercent).toBeCloseTo(50, 1);
    expect(shares[1]!.sharePercent).toBeCloseTo(50, 1);
  });

  it("retourne une liste vide sans entreprise", () => {
    expect(computeCostShareRatios("hybrid_40_fixed_60_headcount", [])).toEqual([]);
  });
});
