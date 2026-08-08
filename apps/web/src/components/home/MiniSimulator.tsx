"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { api } from "@/lib/api";

const COMPANY_OPTIONS = [
  { value: 2, label: "2 à 3" },
  { value: 5, label: "4 à 8" },
  { value: 12, label: "9 à 15" },
  { value: 20, label: "Plus de 15" },
] as const;

const HEADCOUNT_OPTIONS = [
  { value: 80, label: "Moins de 150" },
  { value: 250, label: "150 à 400" },
  { value: 600, label: "400 à 800" },
  { value: 1200, label: "Plus de 800" },
] as const;

const RISK_OPTIONS = [
  { value: "LOW", label: "Faible", hint: "Bureaux, assemblage léger" },
  { value: "MEDIUM", label: "Modéré", hint: "Manutention, logistique" },
  { value: "HIGH", label: "Élevé", hint: "Presses, chimie, produits dangereux" },
] as const;

/**
 * Mini-simulateur d'accueil : trois questions pour reduire la friction.
 * Il ne calcule rien lui-meme - il demarre une simulation cote serveur,
 * enregistre les reponses puis renvoie vers le parcours complet, deja pre-rempli.
 */
export function MiniSimulator() {
  const router = useRouter();
  const [companies, setCompanies] = useState<number | null>(null);
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [risk, setRisk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = companies !== null && headcount !== null && risk !== null;

  async function handleSubmit() {
    if (!complete) return;
    setLoading(true);
    setError(null);
    try {
      const { id, resumeToken } = await api.startSimulation();
      await api.saveStep(id, resumeToken, "companies", {
        numberOfCompanies: companies,
        sizeBrackets: ["B50_150"],
        totalHeadcount: headcount,
      });
      await api.saveStep(id, resumeToken, "activity", {
        sectors: ["AUTRE"],
        riskLevel: risk,
        hasHazardousMaterials: risk === "HIGH",
      });
      void api.track("start_simulation", { source: "home_mini", variante: "3q" });

      // Le token de reprise ne quitte jamais le navigateur.
      sessionStorage.setItem(`sanarys.sim.${id}`, resumeToken);
      router.push(`/simulateur?sim=${id}`);
    } catch {
      setError("Impossible de démarrer la simulation pour le moment. Merci de réessayer.");
      setLoading(false);
    }
  }

  return (
    <div className="surface-card p-6 md:p-8">
      <p className="eyebrow">Estimation en 3 questions</p>
      <h3 className="mt-2 font-heading text-2xl font-bold text-navy-950">
        Votre zone est-elle éligible à un CSPS ?
      </h3>
      <p className="mt-2 text-[0.95rem] leading-relaxed">
        Répondez à trois questions, puis poursuivez le simulateur complet. Aucune coordonnée
        n&apos;est demandée à ce stade.
      </p>

      <div className="mt-7 space-y-6">
        <Fieldset legend="Combien d'entreprises sur la zone seraient concernées ?">
          {COMPANY_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              name="companies"
              label={option.label}
              checked={companies === option.value}
              onChange={() => setCompanies(option.value)}
            />
          ))}
        </Fieldset>

        <Fieldset legend="Quel est l'effectif total approximatif ?">
          {HEADCOUNT_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              name="headcount"
              label={option.label}
              checked={headcount === option.value}
              onChange={() => setHeadcount(option.value)}
            />
          ))}
        </Fieldset>

        <Fieldset legend="Comment situez-vous le niveau de risque des activités ?">
          {RISK_OPTIONS.map((option) => (
            <Choice
              key={option.value}
              name="risk"
              label={option.label}
              hint={option.hint}
              checked={risk === option.value}
              onChange={() => setRisk(option.value)}
            />
          ))}
        </Fieldset>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        onClick={handleSubmit}
        disabled={!complete || loading}
        size="lg"
        className="mt-7 w-full"
      >
        {loading ? "Préparation…" : "Poursuivre le simulateur"}
      </Button>
      <p className="mt-3 text-center text-xs text-slate-400">
        Résultat indicatif, non contractuel. Aucun prix ferme n&apos;est calculé.
      </p>
    </div>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="font-heading text-sm font-semibold text-navy-950">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Choice({
  name,
  label,
  hint,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors duration-fast",
        checked
          ? "border-petrol-600 bg-petrol-100/60"
          : "border-navy-950/12 bg-mist-white hover:border-petrol-600/40",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-petrol-600"
      />
      <span>
        <span className="block text-sm font-medium text-navy-950">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-600">{hint}</span> : null}
      </span>
    </label>
  );
}
