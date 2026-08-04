"use client";

import { useState } from "react";
import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api } from "@/lib/api";

const VEHICLE_LABELS: Record<string, { title: string; detail: string }> = {
  TYPE_B: {
    title: "Ambulance type B — soins d'urgence",
    detail:
      "Véhicule de secours et de soins d'urgence, équipé pour la prise en charge et le transport médicalisé de la majorité des situations rencontrées en milieu industriel.",
  },
  TYPE_C: {
    title: "Ambulance type C — réanimation mobile",
    detail:
      "Unité mobile de réanimation, dimensionnée pour les situations les plus critiques et les zones à effectif élevé ou à risque important.",
  },
};

const MODULE_LABELS: Record<string, { title: string; detail: string }> = {
  NURSE: {
    title: "Infirmier(ère) permanent(e)",
    detail:
      "Soins courants, surveillance des salariés blessés, gestion de l'infirmerie et des consommables, tenue des registres d'accidents du travail.",
  },
  DOCTOR: {
    title: "Médecin dédié sur site",
    detail:
      "Prise en charge des urgences, suivi des cas complexes, orientation vers les structures spécialisées, appui à la médecine du travail.",
  },
  INFIRMARY: {
    title: "Infirmerie centrale aménagée",
    detail:
      "Local dédié clés en main : mobilier médical, consommables, signalétique réglementaire et mise en conformité.",
  },
};

/** Répartition indicative, calculée côté client à titre purement illustratif. */
function costShareBreakdown(companies: number, headcount: number) {
  if (companies <= 0) return [];
  const fixedShare = 40 / companies;
  const averageVariable = 60 / companies;
  return [
    {
      label: "Part fixe, identique pour chaque membre",
      value: `${fixedShare.toFixed(1)} %`,
      detail: "40 % du coût total réparti à parts égales entre les entreprises membres.",
    },
    {
      label: "Part proportionnelle à l'effectif",
      value: `≈ ${averageVariable.toFixed(1)} %`,
      detail: `60 % du coût réparti selon l'effectif. Moyenne indicative pour ${headcount} salariés répartis sur ${companies} entreprises.`,
    },
  ];
}

export function SimulationResultView({
  simulationId,
  input,
  result,
  onRequestAudit,
}: {
  simulationId: string;
  input: SimulationInput;
  result: SimulationResult;
  onRequestAudit: () => void;
}) {
  const [showRules, setShowRules] = useState(false);
  const vehicle = VEHICLE_LABELS[result.vehicleType.code];
  const companies = input.companies?.numberOfCompanies ?? 0;
  const headcount = input.companies?.totalHeadcount ?? 0;
  const breakdown = costShareBreakdown(companies, headcount);

  return (
    <div className="space-y-8">
      {/* Bandeau de résultat */}
      <div className="rounded-lg border border-petrol-600/20 bg-petrol-100/40 p-6 md:p-8">
        <p className="eyebrow">Configuration indicative</p>
        <h2 className="mt-2 font-heading text-2xl font-bold text-navy-950 md:text-3xl">
          Voici le dispositif que nos règles suggèrent pour votre zone
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed text-slate-600">
          Chaque recommandation ci-dessous est justifiée et rattachée à une règle identifiée. Ce
          résultat n&apos;est pas un devis : il prépare l&apos;audit terrain qui arrêtera la
          configuration définitive.
        </p>
      </div>

      {/* Module socle */}
      <section>
        <h3 className="font-heading text-lg font-bold text-navy-950">Module socle</h3>
        <div className="mt-3 surface-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h4 className="font-heading text-lg font-bold text-petrol-600">{vehicle?.title}</h4>
            <span className="rounded-full bg-navy-950/5 px-3 py-1 font-mono text-xs text-slate-600">
              {result.vehicleType.ruleId}
            </span>
          </div>
          <p className="mt-2 leading-relaxed">{vehicle?.detail}</p>
          <p className="mt-3 border-s-2 border-copper-500 ps-4 text-sm leading-relaxed text-slate-600">
            <strong className="text-navy-950">Pourquoi ce choix :</strong>{" "}
            {result.vehicleType.rationale}
          </p>
        </div>
      </section>

      {/* Modules suggérés */}
      <section>
        <h3 className="font-heading text-lg font-bold text-navy-950">Modules complémentaires</h3>
        {result.suggestedModules.length > 0 ? (
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {result.suggestedModules.map((module) => {
              const label = MODULE_LABELS[module.code];
              return (
                <li key={module.ruleId} className="surface-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-heading font-bold text-navy-950">{label?.title}</h4>
                    <span className="shrink-0 rounded-full bg-navy-950/5 px-2.5 py-1 font-mono text-[0.7rem] text-slate-600">
                      {module.ruleId}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{label?.detail}</p>
                  <p className="mt-3 border-s-2 border-copper-300 ps-3 text-sm leading-relaxed text-slate-600">
                    {module.rationale}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-md border border-navy-950/10 bg-mist-50 p-5 leading-relaxed">
            Sur la base des éléments déclarés, nos règles ne suggèrent pas de module complémentaire.
            L&apos;audit terrain peut faire évoluer cette recommandation.
          </p>
        )}
      </section>

      {/* Couverture */}
      <section>
        <h3 className="font-heading text-lg font-bold text-navy-950">Couverture visée</h3>
        <div className="mt-3 surface-card p-6">
          <p className="font-heading text-xl font-bold text-petrol-600">
            {result.coverage.targetLabel}
          </p>
          <p className="mt-2 leading-relaxed">{result.coverage.rationale}</p>
          <p className="mt-4 rounded-md bg-warning/10 p-3 text-sm leading-relaxed text-navy-950">
            <strong>À noter :</strong> {result.coverage.disclaimer}
          </p>
        </div>
      </section>

      {/* Partage des coûts */}
      <section>
        <h3 className="font-heading text-lg font-bold text-navy-950">
          Clé de répartition indicative
        </h3>
        <div className="mt-3 surface-card p-6">
          <p className="leading-relaxed">{result.costShare.rationale}</p>
          {breakdown.length > 0 ? (
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {breakdown.map((item) => (
                <div key={item.label} className="rounded-md bg-mist-50 p-4">
                  <dt className="font-heading text-sm font-semibold text-navy-950">{item.label}</dt>
                  <dd className="mt-1 font-heading text-2xl font-extrabold text-copper-500">
                    {item.value}
                  </dd>
                  <dd className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="mt-4 text-sm font-medium text-navy-950">
            Ces pourcentages portent sur la répartition entre membres, jamais sur un montant. Aucun
            prix n&apos;est calculé à ce stade.
          </p>
        </div>
      </section>

      {/* Hypothèses et traçabilité */}
      <section>
        <h3 className="font-heading text-lg font-bold text-navy-950">Hypothèses retenues</h3>
        <ul className="mt-3 space-y-2">
          {result.assumptions.map((assumption) => (
            <li key={assumption} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-500" />
              <span>{assumption}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          aria-expanded={showRules}
          className="mt-4 text-sm font-semibold text-petrol-600 underline underline-offset-4"
        >
          {showRules ? "Masquer la traçabilité du calcul" : "Voir la traçabilité du calcul"}
        </button>

        {showRules ? (
          <div className="mt-3 rounded-md border border-navy-950/10 bg-mist-50 p-4 text-sm">
            <p>
              Moteur de règles version{" "}
              <strong className="font-mono text-navy-950">{result.ruleSetVersion}</strong>, calculé
              le{" "}
              {new Date(result.generatedAt).toLocaleString("fr-FR", {
                dateStyle: "long",
                timeStyle: "short",
              })}
              .
            </p>
            <p className="mt-2">
              Règles appliquées :{" "}
              <span className="font-mono">
                {[
                  result.vehicleType.ruleId,
                  ...result.suggestedModules.map((m) => m.ruleId),
                  result.coverage.ruleId,
                  result.costShare.ruleId,
                ].join(", ")}
              </span>
            </p>
            <p className="mt-2 text-slate-600">
              Ce résultat est figé : une évolution ultérieure des règles ne modifiera pas cette
              simulation.
            </p>
          </div>
        ) : null}
      </section>

      {/* Mention non contractuelle */}
      <div className="rounded-lg border-s-4 border-copper-500 bg-sand-200/60 p-6">
        <h3 className="font-heading font-bold text-navy-950">Document non contractuel</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Cette simulation est une estimation indicative produite à partir de vos déclarations. Elle
          ne constitue ni un devis, ni une offre, ni un engagement de SANARYS. Seule une proposition
          technique et financière signée, établie après audit terrain, engage les parties.
        </p>
      </div>

      {/* Prochaines actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button onClick={onRequestAudit} variant="accent" size="lg">
          Demander un audit terrain gratuit
        </Button>
        <ButtonLink
          href={api.pdfUrl(simulationId)}
          variant="secondary"
          size="lg"
          onClick={() => void api.track("download_resource", { asset_id: "simulation_pdf" })}
        >
          Télécharger le récapitulatif PDF
        </ButtonLink>
      </div>
    </div>
  );
}
