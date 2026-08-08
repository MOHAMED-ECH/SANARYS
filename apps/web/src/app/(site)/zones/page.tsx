import type { Metadata } from "next";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { ZonesMap } from "@/components/zones/ZonesMap";

export const metadata: Metadata = {
  title: "Zones & couverture",
  description:
    "Zones industrielles marocaines référencées par SANARYS, critères d'éligibilité au modèle CSPS et demande d'implantation.",
};

// Le référentiel évolue : rendu à la demande plutôt que figé au build.
export const dynamic = "force-dynamic";

async function loadZones(): Promise<IndustrialZoneDto[]> {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
  try {
    const response = await fetch(`${base}/zones`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as IndustrialZoneDto[];
  } catch {
    return [];
  }
}

const CRITERIA = [
  {
    title: "Une concentration d'entreprises",
    detail:
      "Plusieurs entreprises voisines, suffisamment proches pour être desservies depuis un point d'ancrage unique.",
  },
  {
    title: "Un effectif cumulé significatif",
    detail:
      "L'effectif total conditionne le dimensionnement et rend la mutualisation économiquement pertinente.",
  },
  {
    title: "Un local mobilisable",
    detail:
      "Un espace pouvant accueillir l'infirmerie centrale, mis à disposition par la zone ou le groupement.",
  },
  {
    title: "Une volonté collective",
    detail:
      "Le modèle repose sur un engagement partagé : il suppose un interlocuteur mandaté pour le groupement.",
  },
] as const;

export default async function ZonesPage() {
  const zones = await loadZones();
  const pilots = zones.filter((zone) => zone.isPilot).length;

  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Zones &amp; couverture</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Où le modèle CSPS peut être déployé
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            Nous référençons les zones industrielles marocaines éligibles au modèle. Les zones
            pilotes sont prioritaires pour un premier déploiement.
          </p>
          {zones.length > 0 ? (
            <p className="mt-4 text-sm text-mist-50/60">
              {zones.length} zone{zones.length > 1 ? "s" : ""} référencée
              {zones.length > 1 ? "s" : ""}
              {pilots > 0 ? ` · ${pilots} zone${pilots > 1 ? "s" : ""} pilote${pilots > 1 ? "s" : ""}` : ""}
            </p>
          ) : null}
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Référentiel"
          title="Zones industrielles référencées"
          lead="Le référentiel s'enrichit au fil des audits terrain. L'absence de votre zone n'est pas un obstacle : elle peut faire l'objet d'une demande d'implantation."
        />
        <ZonesMap zones={zones} />
      </Section>

      <Section tone="mist">
        <SectionHeader
          eyebrow="Éligibilité"
          title="Ce qui rend une zone éligible"
          lead="Aucun de ces critères n'est un seuil absolu : l'audit terrain tranche."
        />
        <ul className="grid gap-5 md:grid-cols-2">
          {CRITERIA.map((criterion) => (
            <li key={criterion.title} className="surface-card p-6">
              <h3 className="font-heading font-bold text-navy-950">{criterion.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{criterion.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">
            Votre zone n&apos;est pas encore référencée ?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Lancez une simulation en saisissant librement le nom de votre zone, ou demandez
            directement un audit terrain gratuit.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/simulateur" size="lg">
              Simuler mon CSPS
            </ButtonLink>
            <ButtonLink href="/audit" variant="secondary" size="lg">
              Demander une implantation
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
