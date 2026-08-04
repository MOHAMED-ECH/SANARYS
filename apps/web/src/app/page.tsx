import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { CspsExplainer } from "@/components/home/CspsExplainer";
import { MiniSimulator } from "@/components/home/MiniSimulator";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { DEPLOYMENT_STEPS, SECTORS, SERVICES } from "@/content/site";

export const metadata: Metadata = {
  description:
    "Le modèle CSPS de SANARYS mutualise ambulance, personnel médical, infirmerie et reporting entre les PME d'une même zone industrielle marocaine. Simulez votre dispositif en quelques minutes.",
};

const SIMULATOR_BENEFITS = [
  "Type d'ambulance et modules suggérés, avec la justification de chaque recommandation",
  "Hypothèses de calcul affichées en clair et version des règles utilisées",
  "Ordre de grandeur de la clé de répartition entre membres",
  "Récapitulatif PDF téléchargeable, reprise possible sans créer de compte",
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Le problème, posé sans dramatisation inutile. */}
      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeader
            eyebrow="Le constat"
            title="Seule, une PME ne peut pas financer un dispositif médical permanent"
          />
          <div className="space-y-5 text-[1.05rem] leading-relaxed">
            <p>
              Les zones industrielles marocaines concentrent des milliers de salariés exposés à des
              risques professionnels variés. Pourtant, la plupart ne disposent d&apos;aucun
              dispositif sanitaire mutualisé, permanent et professionnel.
            </p>
            <p>
              Une ambulance dédiée, un infirmier présent et un médecin disponible représentent un
              coût qu&apos;une entreprise seule absorbe rarement. En l&apos;absence de dispositif sur
              site, le délai d&apos;intervention des secours publics allonge la prise en charge des
              accidents graves.
            </p>
            <p className="border-s-2 border-copper-500 ps-5 font-heading text-lg font-semibold text-navy-950">
              Le modèle CSPS répond à ce constat : plusieurs entreprises voisines financent ensemble
              un dispositif complet, exploité de bout en bout par SANARYS.
            </p>
          </div>
        </div>
      </Section>

      {/* Explication interactive du modèle. */}
      <Section tone="mist" id="modele">
        <SectionHeader
          eyebrow="Le modèle CSPS"
          title="Un centre de services partagés sanitaires au cœur de votre zone"
          lead="Sélectionnez une étape pour voir comment le dispositif se construit."
        />
        <CspsExplainer />
        <div className="mt-10">
          <ButtonLink href="/modele-csps" variant="secondary">
            Comprendre le modèle en détail
          </ButtonLink>
        </div>
      </Section>

      {/* Simulateur : la valeur avant le formulaire. */}
      <Section tone="light" id="simulateur">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="Simulateur"
              title="Estimez votre dispositif avant de nous parler"
              lead="Le simulateur vous donne une configuration indicative, explique chaque recommandation et vous remet un récapitulatif PDF. Il ne produit jamais un prix ferme."
            />
            <ul className="space-y-4">
              {SIMULATOR_BENEFITS.map((item) => (
                <li key={item} className="flex gap-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  >
                    <circle cx="10" cy="10" r="9" fill="#E3F2F1" />
                    <path
                      d="M6 10.2l2.6 2.6L14 7.4"
                      stroke="#0E6E7A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <MiniSimulator />
        </div>
      </Section>

      {/* Services par bénéfice. */}
      <Section tone="mist">
        <SectionHeader
          eyebrow="Nos solutions"
          title="Huit lignes de services, mobilisables seules ou combinées"
          lead="Chaque service peut être contractualisé indépendamment ou intégré au pack CSPS de votre groupement."
        />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <li key={service.slug}>
              <Link
                href={`/solutions/${service.slug}`}
                className="group flex h-full flex-col rounded-lg border border-navy-950/8 bg-mist-white p-6 transition-all duration-base hover:-translate-y-0.5 hover:border-petrol-600/30 hover:shadow-card"
              >
                <span className="font-heading text-xs font-bold tracking-[0.14em] text-copper-500">
                  {service.number}
                </span>
                <h3 className="mt-3 font-heading text-lg font-bold leading-snug text-navy-950">
                  {service.title}
                </h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-600">
                  {service.summary}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-petrol-600">
                  En savoir plus
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

      {/* Secteurs. */}
      <Section tone="light">
        <SectionHeader
          eyebrow="Par secteur"
          title="Des risques différents appellent des dispositifs différents"
          lead="Le dimensionnement dépend de vos machines, de vos horaires et des exigences de vos donneurs d'ordre."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map((sector) => (
            <li key={sector.slug}>
              <Link
                href={`/secteurs/${sector.slug}`}
                className="group block h-full rounded-lg border border-navy-950/8 p-6 transition-all duration-base hover:border-copper-300 hover:bg-sand-200/40"
              >
                <h3 className="font-heading text-lg font-bold text-navy-950">{sector.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{sector.lead}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Déploiement. */}
      <Section tone="navy">
        <SectionHeader
          eyebrow="Mise en place"
          title="De l'expression d'intérêt à la mise en service"
          lead="Un processus en six étapes, avec un audit terrain gratuit dès le départ."
          onNavy
        />
        <ol className="grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {DEPLOYMENT_STEPS.map((step) => (
            <li key={step.number} className="border-t border-mist-white/15 pt-5">
              <span className="font-heading text-sm font-bold text-copper-300">{step.number}</span>
              <h3 className="mt-2 font-heading text-lg font-bold text-mist-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist-50/70">{step.description}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Appel à l'action final. */}
      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold leading-tight text-navy-950 md:text-4xl">
            Vérifiez l&apos;éligibilité de votre zone
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Quelques minutes suffisent pour obtenir une configuration indicative. L&apos;audit
            terrain, gratuit et sans engagement, précise ensuite le dispositif adapté à votre zone.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/simulateur" variant="primary" size="lg">
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
