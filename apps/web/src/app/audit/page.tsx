import type { Metadata } from "next";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import { Section } from "@/components/ui/Section";
import { LeadForm } from "@/components/forms/LeadForm";
import { DEPLOYMENT_STEPS } from "@/content/site";

export const metadata: Metadata = {
  title: "Demander un audit terrain",
  description:
    "Audit terrain gratuit et sans engagement : cartographie de la zone, évaluation des risques et identification du point d'ancrage optimal du CSPS.",
};

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

export default async function AuditPage() {
  const zones = await loadZones();

  return (
    <Section tone="mist">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="eyebrow">Audit terrain</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-950 md:text-4xl">
            Un audit gratuit, sans engagement
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Nos équipes se déplacent sur votre zone, cartographient les entreprises, évaluent les
            risques et identifient l&apos;emplacement optimal du point d&apos;ancrage. Vous repartez
            avec un état des lieux documenté, que vous poursuiviez avec nous ou non.
          </p>

          <h2 className="mt-10 font-heading text-lg font-bold text-navy-950">
            Ce qui se passe ensuite
          </h2>
          <ol className="mt-4 space-y-4">
            {DEPLOYMENT_STEPS.slice(1, 5).map((step) => (
              <li key={step.number} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950/6 font-heading text-sm font-bold text-navy-950">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-heading font-semibold text-navy-950">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-lg border-s-4 border-copper-500 bg-sand-200/50 p-5">
            <p className="text-sm leading-relaxed">
              <strong className="text-navy-950">En cas d&apos;urgence médicale</strong>, ce
              formulaire n&apos;est pas le bon canal : contactez immédiatement les secours par
              téléphone.
            </p>
          </div>
        </div>

        <LeadForm intent="audit" zones={zones} />
      </div>
    </Section>
  );
}
