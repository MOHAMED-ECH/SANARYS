import { describe, expect, it } from "vitest";
import { buildDedupeKey, priorityFromScore, scoreLead } from "./service.js";

describe("buildDedupeKey", () => {
  it("est insensible a la casse et aux espaces", () => {
    expect(buildDedupeKey("  Karim@Example.MA ", " Atlas Cablage ")).toBe(
      buildDedupeKey("karim@example.ma", "atlas cablage"),
    );
  });

  it("distingue deux entreprises differentes pour un meme contact", () => {
    expect(buildDedupeKey("karim@example.ma", "Atlas Cablage")).not.toBe(
      buildDedupeKey("karim@example.ma", "Maroc Plast"),
    );
  });
});

describe("scoreLead", () => {
  it("valorise une simulation completee et un interet pour l'audit", () => {
    const withSimulation = scoreLead({ hasSimulation: true, auditInterest: true });
    const without = scoreLead({ hasSimulation: false });
    expect(withSimulation.score).toBeGreaterThan(without.score);
  });

  it("classe en priorite haute une grande zone a risque eleve", () => {
    const result = scoreLead({
      hasSimulation: true,
      auditInterest: true,
      totalHeadcount: 600,
      numberOfCompanies: 6,
      riskLevel: "HIGH",
    });
    expect(result.priority).toBe("HIGH");
  });

  it("classe en priorite basse un contact sans contexte", () => {
    expect(scoreLead({ hasSimulation: false }).priority).toBe("LOW");
  });

  it("reste coherent entre score et priorite", () => {
    for (const score of [0, 29, 30, 59, 60, 100]) {
      const priority = priorityFromScore(score);
      if (score >= 60) expect(priority).toBe("HIGH");
      else if (score >= 30) expect(priority).toBe("MEDIUM");
      else expect(priority).toBe("LOW");
    }
  });
});
