import type { Metadata } from "next";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import { Section } from "@/components/ui/Section";
import { LeadForm } from "@/components/forms/LeadForm";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez SANARYS pour un dispositif sanitaire mutualisé, une location d'ambulance, du personnel médical ou une couverture événementielle.",
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

export default async function ContactPage() {
  const zones = await loadZones();

  return (
    <Section tone="mist">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-950 md:text-4xl">
            Parlons de votre besoin
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Que vous représentiez une PME, un groupement, un gestionnaire de zone ou un assureur,
            décrivez-nous votre situation : nous vous répondons sous deux heures ouvrées.
          </p>

          <dl className="mt-10 space-y-5">
            <div>
              <dt className="font-heading text-sm font-bold uppercase tracking-wider text-petrol-600">
                Email
              </dt>
              <dd className="mt-1">
                <a href={`mailto:${SITE.email}`} className="link-underline text-navy-950">
                  {SITE.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-heading text-sm font-bold uppercase tracking-wider text-petrol-600">
                Téléphone
              </dt>
              <dd className="mt-1 text-navy-950">{SITE.phone}</dd>
            </div>
            <div>
              <dt className="font-heading text-sm font-bold uppercase tracking-wider text-petrol-600">
                Adresse
              </dt>
              <dd className="mt-1 text-navy-950">{SITE.city}</dd>
            </div>
          </dl>

          <div className="mt-10 rounded-lg border-s-4 border-copper-500 bg-sand-200/50 p-5">
            <p className="text-sm leading-relaxed">
              <strong className="text-navy-950">En cas d&apos;urgence médicale</strong>, ce
              formulaire n&apos;est pas le bon canal : contactez immédiatement les secours par
              téléphone.
            </p>
          </div>
        </div>

        <LeadForm intent="contact" zones={zones} />
      </div>
    </Section>
  );
}
