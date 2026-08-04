import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { SECTORS } from "@/content/site";

export const metadata: Metadata = {
  title: "Secteurs",
  description:
    "Automobile, logistique, textile, agroalimentaire, plasturgie, événementiel : des risques différents appellent des dispositifs sanitaires différents.",
};

export default function SecteursPage() {
  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Par secteur</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Des risques différents appellent des dispositifs différents
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            Le dimensionnement d&apos;un CSPS dépend de vos machines, de vos horaires et des
            exigences de vos donneurs d&apos;ordre.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <ul className="grid gap-5 md:grid-cols-2">
          {SECTORS.map((sector) => (
            <li key={sector.slug}>
              <Link
                href={`/secteurs/${sector.slug}`}
                className="group flex h-full flex-col rounded-lg border border-navy-950/8 p-7 transition-all duration-base hover:-translate-y-0.5 hover:border-copper-300 hover:bg-sand-200/30"
              >
                <h2 className="font-heading text-xl font-bold text-navy-950">{sector.title}</h2>
                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{sector.lead}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-petrol-600">
                  Risques et enjeux
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

      <Section tone="mist">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-navy-950">
            Votre secteur n&apos;est pas listé ?
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Le modèle CSPS s&apos;applique à toute zone concentrant plusieurs entreprises exposées à
            des risques professionnels. Lancez une simulation pour le vérifier.
          </p>
          <div className="mt-7">
            <ButtonLink href="/simulateur" size="lg">
              Simuler mon CSPS
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
