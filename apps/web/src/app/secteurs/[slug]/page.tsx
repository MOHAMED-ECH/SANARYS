import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { SECTORS } from "@/content/site";

export function generateStaticParams() {
  return SECTORS.map((sector) => ({ slug: sector.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const sector = SECTORS.find((s) => s.slug === params.slug);
  if (!sector) return {};
  return { title: sector.title, description: sector.lead };
}

export default function SectorPage({ params }: { params: { slug: string } }) {
  const sector = SECTORS.find((s) => s.slug === params.slug);
  if (!sector) notFound();

  return (
    <>
      <Section tone="navy">
        <nav aria-label="Fil d'Ariane" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-mist-50/60">
            <li>
              <Link href="/" className="hover:text-mist-white">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/secteurs" className="hover:text-mist-white">
                Secteurs
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-mist-white">
              {sector.title}
            </li>
          </ol>
        </nav>

        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Secteur</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            {sector.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">{sector.lead}</p>
        </div>
      </Section>

      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeader eyebrow="Risques typiques" title="Ce que nous observons sur ces sites" />
            <ul className="space-y-4">
              {sector.risks.map((risk) => (
                <li key={risk} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-copper-500" />
                  <span className="leading-relaxed">{risk}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-slate-600">
              Cette liste décrit des risques couramment rencontrés dans le secteur. Elle ne remplace
              pas l&apos;évaluation des risques propre à votre entreprise.
            </p>
          </div>

          <div className="surface-card p-7">
            <h2 className="font-heading text-xl font-bold text-navy-950">L&apos;enjeu principal</h2>
            <p className="mt-3 leading-relaxed">{sector.stake}</p>

            <h3 className="mt-7 font-heading font-bold text-navy-950">
              Ce que le CSPS apporte concrètement
            </h3>
            <ul className="mt-3 space-y-2.5 text-[0.98rem]">
              {[
                "Une prise en charge sur site en quelques minutes, sans attendre les secours publics",
                "Des protocoles écrits et des référents formés dans chaque entreprise membre",
                "Un registre d'accidents tenu et un rapport mensuel agrégé",
                "Un coût partagé entre les entreprises voisines de la zone",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <SectionHeader
          eyebrow="Points à vérifier"
          title="Checklist de préparation aux urgences"
          lead="Quatre questions simples pour situer votre niveau de préparation avant un audit."
        />
        <ol className="grid gap-4 md:grid-cols-2">
          {[
            "Combien de temps s'écoule entre un accident sur votre site et l'arrivée d'un secours qualifié ?",
            "Vos référents sécurité sont-ils formés et leurs habilitations à jour ?",
            "Vos protocoles d'urgence sont-ils écrits, affichés et testés ?",
            "Vos accidents du travail sont-ils tous déclarés et tracés dans un registre ?",
          ].map((question, index) => (
            <li key={question} className="surface-card flex gap-4 p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950/6 font-heading text-sm font-bold text-navy-950">
                {index + 1}
              </span>
              <p className="leading-relaxed">{question}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">
            Estimez le dispositif adapté à votre secteur
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Le simulateur tient compte de votre niveau de risque, de vos horaires et de la taille de
            votre zone.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/simulateur" size="lg">
              Simuler mon CSPS
            </ButtonLink>
            <ButtonLink href="/audit" variant="secondary" size="lg">
              Demander un audit terrain
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
