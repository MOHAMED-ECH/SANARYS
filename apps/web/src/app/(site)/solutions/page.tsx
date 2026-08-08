import Link from "next/link";
import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { SERVICES } from "@/content/site";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Location d'ambulances, personnel médical, aménagement d'infirmeries, couverture événementielle, transport sanitaire, formations et audit : les huit lignes de services SANARYS.",
};

export default function SolutionsPage() {
  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Nos solutions</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Huit lignes de services, mobilisables seules ou combinées
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            Chaque service peut être contractualisé indépendamment, ou intégré au pack CSPS d&apos;un
            groupement de PME.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <ul className="grid gap-5 md:grid-cols-2">
          {SERVICES.map((service) => (
            <li key={service.slug}>
              <Link
                href={`/solutions/${service.slug}`}
                className="group flex h-full flex-col rounded-lg border border-navy-950/8 bg-mist-white p-7 transition-all duration-base hover:-translate-y-0.5 hover:border-petrol-600/30 hover:shadow-card"
              >
                <span className="font-heading text-xs font-bold tracking-[0.14em] text-copper-500">
                  {service.number}
                </span>
                <h2 className="mt-3 font-heading text-xl font-bold text-navy-950">
                  {service.title}
                </h2>
                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{service.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-petrol-600">
                  Voir le détail
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="transition-transform duration-base group-hover:translate-x-1"
                  >
                    <path
                      d="M4 10h11M11 6l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">
            Vous ne savez pas quel dispositif vous convient ?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Le simulateur vous propose une configuration indicative en quelques minutes, expliquée
            règle par règle.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/simulateur" size="lg">
              Simuler mon CSPS
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Parler à un conseiller
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
