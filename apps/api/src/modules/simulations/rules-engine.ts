import type { SimulationResult } from "@sanarys/schemas";

/**
 * Moteur de recommandation du simulateur CSPS.
 *
 * Gouvernance (cahier des charges section 8.3 + revue produit) :
 *  - les regles sont VERSIONNEES et un ruleset ACTIVE est immuable ;
 *  - chaque regle porte id / justification / statut / date d'effet / auteur ;
 *  - l'evaluation est "premier match gagne" par categorie, avec fallback explicite ;
 *  - le resultat est un SNAPSHOT complet et fige : regles declenchees, justifications,
 *    hypotheses, version du moteur, horodatage, mention non contractuelle ;
 *  - AUCUNE decision clinique, AUCUN prix ferme n'est produit ici.
 *
 * L'evaluation est strictement serveur : un resultat calcule cote client n'est
 * jamais accepte.
 */

export type Condition =
  | "default"
  | { all: Predicate[] }
  | { any: Predicate[] }
  | Predicate;

export interface Predicate {
  field: string;
  op: "eq" | "neq" | "gte" | "lte" | "gt" | "lt" | "in";
  value: unknown;
}

export interface Rule {
  id: string;
  status?: string;
  effectiveAt?: string;
  author?: string;
  when: Condition;
  result?: string;
  formula?: string;
  rationale: string;
  disclaimer?: string;
}

export interface RuleSetDefinition {
  vehicleType: Rule[];
  modules: Rule[];
  coverage: Rule[];
  costShareFormula: Rule[];
}

/** Faits derives des reponses du wizard, seul vocabulaire connu des regles. */
export interface SimulationFacts {
  totalHeadcount: number;
  numberOfCompanies: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  nightWork: boolean;
  weekendWork: boolean;
  hasAmbulance: boolean;
  hasInfirmary: boolean;
  hasHazardousMaterials: boolean;
  existingStaff: "NONE" | "NURSE" | "DOCTOR";
  sectors: string[];
}

const MODULE_CODE_BY_RESULT: Record<string, "NURSE" | "DOCTOR" | "INFIRMARY"> = {
  SUGGEST_NURSE: "NURSE",
  SUGGEST_DOCTOR: "DOCTOR",
  SUGGEST_INFIRMARY: "INFIRMARY",
};

const COVERAGE_LABELS: Record<string, string> = {
  TARGET_UNDER_10MIN: "Objectif contractuel : intervention en moins de 10 minutes",
};

function evaluatePredicate(predicate: Predicate, facts: SimulationFacts): boolean {
  const actual = (facts as unknown as Record<string, unknown>)[predicate.field];
  const expected = predicate.value;

  switch (predicate.op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
    default:
      return false;
  }
}

export function evaluateCondition(condition: Condition, facts: SimulationFacts): boolean {
  if (condition === "default") return true;
  if ("all" in condition) return condition.all.every((p) => evaluatePredicate(p, facts));
  if ("any" in condition) return condition.any.some((p) => evaluatePredicate(p, facts));
  return evaluatePredicate(condition, facts);
}

/** Premier match gagne. Les regles non ACTIVE sont ignorees. */
function firstMatch(rules: Rule[], facts: SimulationFacts): Rule | undefined {
  return rules.find(
    (rule) => (rule.status ?? "ACTIVE") === "ACTIVE" && evaluateCondition(rule.when, facts),
  );
}

/** Toutes les regles satisfaites (pour les categories cumulatives comme les modules). */
function allMatches(rules: Rule[], facts: SimulationFacts): Rule[] {
  return rules.filter(
    (rule) => (rule.status ?? "ACTIVE") === "ACTIVE" && evaluateCondition(rule.when, facts),
  );
}

/** Hypotheses affichees a l'utilisateur : ce que le calcul a suppose, en clair. */
function buildAssumptions(facts: SimulationFacts): string[] {
  return [
    `Effectif total considere : ${facts.totalHeadcount} salaries repartis sur ${facts.numberOfCompanies} entreprise(s).`,
    `Niveau de risque declare : ${facts.riskLevel === "HIGH" ? "eleve" : facts.riskLevel === "MEDIUM" ? "modere" : "faible"}.`,
    facts.nightWork
      ? "Presence de travail de nuit prise en compte dans le dimensionnement."
      : "Aucun travail de nuit declare.",
    facts.hasInfirmary
      ? "Une infirmerie existe deja sur site."
      : "Aucune infirmerie existante declaree sur la zone.",
    facts.hasAmbulance
      ? "Un moyen ambulancier existe deja sur site."
      : "Aucun moyen ambulancier existant declare sur la zone.",
    "Estimation etablie sans visite de site : la configuration definitive est arretee lors de l'audit terrain.",
  ];
}

export interface EvaluateOptions {
  ruleSetVersion: string;
  now?: Date;
}

export function evaluateSimulation(
  ruleSet: RuleSetDefinition,
  facts: SimulationFacts,
  options: EvaluateOptions,
): SimulationResult {
  const now = options.now ?? new Date();

  const vehicleRule = firstMatch(ruleSet.vehicleType, facts);
  if (!vehicleRule?.result) {
    throw new Error("Ruleset invalide : aucune regle de type de vehicule applicable.");
  }

  const moduleRules = allMatches(ruleSet.modules, facts);
  const coverageRule = firstMatch(ruleSet.coverage, facts);
  if (!coverageRule?.result) {
    throw new Error("Ruleset invalide : aucune regle de couverture applicable.");
  }

  const costRule = firstMatch(ruleSet.costShareFormula, facts);
  if (!costRule?.formula) {
    throw new Error("Ruleset invalide : aucune formule de partage applicable.");
  }

  return {
    ruleSetVersion: options.ruleSetVersion,
    vehicleType: {
      ruleId: vehicleRule.id,
      rationale: vehicleRule.rationale,
      code: vehicleRule.result === "TYPE_C" ? "TYPE_C" : "TYPE_B",
    },
    suggestedModules: moduleRules
      .filter((rule) => rule.result && MODULE_CODE_BY_RESULT[rule.result])
      .map((rule) => ({
        ruleId: rule.id,
        rationale: rule.rationale,
        code: MODULE_CODE_BY_RESULT[rule.result as string]!,
      })),
    coverage: {
      ruleId: coverageRule.id,
      rationale: coverageRule.rationale,
      targetLabel: COVERAGE_LABELS[coverageRule.result] ?? coverageRule.result,
      disclaimer:
        coverageRule.disclaimer ??
        "Estimation illustrative, pas un calcul de routage reel. Confirmee lors de l'audit terrain.",
    },
    costShare: {
      ruleId: costRule.id,
      rationale: costRule.rationale,
      formula: costRule.formula,
    },
    assumptions: buildAssumptions(facts),
    generatedAt: now.toISOString(),
  };
}

/** Traduit les reponses du wizard en faits normalises consommes par les regles. */
export function deriveFacts(input: {
  companies: { numberOfCompanies: number; totalHeadcount: number };
  activity: { riskLevel: "LOW" | "MEDIUM" | "HIGH"; sectors: string[]; hasHazardousMaterials: boolean };
  schedule: { nightWork: boolean; weekendWork: boolean };
  existingSetup: {
    hasAmbulance: boolean;
    hasInfirmary: boolean;
    existingStaff: "NONE" | "NURSE" | "DOCTOR";
  };
}): SimulationFacts {
  return {
    totalHeadcount: input.companies.totalHeadcount,
    numberOfCompanies: input.companies.numberOfCompanies,
    riskLevel: input.activity.riskLevel,
    nightWork: input.schedule.nightWork,
    weekendWork: input.schedule.weekendWork,
    hasAmbulance: input.existingSetup.hasAmbulance,
    hasInfirmary: input.existingSetup.hasInfirmary,
    hasHazardousMaterials: input.activity.hasHazardousMaterials,
    existingStaff: input.existingSetup.existingStaff,
    sectors: input.activity.sectors,
  };
}

/**
 * Repartition indicative de la cle de partage entre PME membres.
 * Formule hybride : part fixe egale + part proportionnelle a l'effectif.
 * Ne produit JAMAIS un montant : uniquement des pourcentages indicatifs.
 */
export function computeCostShareRatios(
  formula: string,
  companies: { label: string; headcount: number }[],
): { label: string; sharePercent: number }[] {
  if (companies.length === 0) return [];

  const fixedWeight = formula === "hybrid_40_fixed_60_headcount" ? 0.4 : 0.5;
  const variableWeight = 1 - fixedWeight;
  const totalHeadcount = companies.reduce((sum, c) => sum + c.headcount, 0);

  return companies.map((company) => {
    const fixedPart = fixedWeight / companies.length;
    const variablePart =
      totalHeadcount > 0 ? (variableWeight * company.headcount) / totalHeadcount : variableWeight / companies.length;
    return {
      label: company.label,
      sharePercent: Math.round((fixedPart + variablePart) * 1000) / 10,
    };
  });
}
