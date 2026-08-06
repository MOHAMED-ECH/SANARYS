import { createHash } from "node:crypto";

/**
 * Regles metier du lead commercial.
 *
 * Tout ce fichier est pur : aucune base, aucun reseau, aucune horloge globale.
 * C'est ce qui rend le scoring verifiable ligne a ligne, et defendable devant
 * un commercial qui demande pourquoi tel prospect est passe devant tel autre.
 */

/**
 * Cle de dedoublonnage : un meme contact peut representer plusieurs entreprises,
 * et une meme entreprise peut avoir plusieurs contacts. C'est le couple qui
 * identifie le lead. Normalise pour resister a la casse et aux espaces.
 */
export const buildDedupeKey = (email: string, companyName: string) =>
  createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${companyName.trim().toLowerCase()}`)
    .digest("hex");

/** Delai de prise en charge cible : moins de 2 heures ouvrees (cahier des charges). */
export const FIRST_CONTACT_TARGET_MS = 2 * 3600 * 1000;

export interface ScoringFacts {
  totalHeadcount?: number | undefined;
  numberOfCompanies?: number | undefined;
  riskLevel?: string | undefined;
  hasSimulation: boolean;
  auditInterest?: boolean | undefined;
}

export type LeadPriorityValue = "LOW" | "MEDIUM" | "HIGH";

export const priorityFromScore = (score: number): LeadPriorityValue =>
  score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

/**
 * Score simple et explicable (pas de modele statistique) : il sert a prioriser
 * la file commerciale, jamais a ecarter automatiquement un prospect.
 */
export function scoreLead(facts: ScoringFacts): { score: number; priority: LeadPriorityValue } {
  let score = 0;

  if (facts.hasSimulation) score += 25;
  if (facts.auditInterest) score += 20;

  const headcount = facts.totalHeadcount ?? 0;
  if (headcount >= 500) score += 25;
  else if (headcount >= 150) score += 15;
  else if (headcount >= 50) score += 8;

  const companies = facts.numberOfCompanies ?? 0;
  if (companies >= 5) score += 15;
  else if (companies >= 3) score += 8;

  if (facts.riskLevel === "HIGH") score += 15;
  else if (facts.riskLevel === "MEDIUM") score += 7;

  return { score, priority: priorityFromScore(score) };
}

/**
 * Une re-soumission moins renseignee — un formulaire de contact simple envoye
 * apres une simulation complete — ne doit jamais degrader un lead deja qualifie.
 * Le score ne redescend pas.
 */
export function reconcileScore(submitted: number, existing: number | null): {
  score: number;
  priority: LeadPriorityValue;
} {
  const score = Math.max(submitted, existing ?? 0);
  return { score, priority: priorityFromScore(score) };
}
