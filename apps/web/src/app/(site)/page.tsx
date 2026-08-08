import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { CspsExplainer } from "@/components/home/CspsExplainer";
import { MiniSimulator } from "@/components/home/MiniSimulator";
import { ZonePanorama } from "@/components/csps/ZonePanorama";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Figure } from "@/components/ui/Figure";
import { MEDIA } from "@/content/media";
import { DEPLOYMENT_STEPS, SECTORS, SERVICES } from "@/content/site";

export const metadata: Metadata = {
  description:
    "Le modèle CSPS de SANARYS mutualise ambulance, personnel médical, infirmerie et reporting entre les PME d'une même zone industrielle marocaine. Simulez votre dispositif en quelques minutes.",
};

/**
 * Les deux premieres lignes de services sont le dispositif lui-meme :
 * l'ambulance et le personnel. Les six autres viennent en complement. Cette
 * distinction est editoriale, pas technique — elle vit donc ici, pres de la
 * mise en page qu'elle commande.
 */
const PRIMARY_SERVICES = SERVICES.slice(0, 2);
const SECONDARY_SERVICES = SERVICES.slice(2);

function Arrow() {
  return (
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
  );
}

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

      {/* Rupture visuelle : la zone en coupe, pleine largeur.
          L'accueil enchaînait sept sections au même gabarit — libellé, titre,
          grille de cartes. Cette bande est le seul endroit où le regard
          s'arrête, et elle porte l'argument entier : un dispositif au centre,
          une couverture qui atteint tout le monde. */}
      <section className="relative overflow-hidden bg-navy-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-mist-white/10"
        />
        <div className="container-page pt-16 md:pt-20">
          <div className="max-w-2xl">
            <p className="eyebrow text-copper-300">Le principe</p>
            <p className="mt-4 text-3xl font-bold leading-tight text-mist-white md:text-[2.4rem]">
              Un seul dispositif, financé à plusieurs, qui couvre toute la zone.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-mist-50/70">
              Ce qu&apos;aucune PME ne peut porter seule devient accessible dès lors que les
              entreprises voisines le partagent. Le point d&apos;ancrage est implanté au centre de la
              zone ; la couverture est dimensionnée lors de l&apos;audit terrain.
            </p>
          </div>
        </div>

        {/* Pleine largeur, hors conteneur : c'est le seul élément de la page qui
            touche les deux bords, et c'est ce qui en fait une rupture.
            La légende, elle, reste alignée sur la grille du texte. */}
        <Figure
          asset={MEDIA.zonePanorama}
          onDark
          className="mt-10 pb-14 md:mt-12 md:pb-16"
          captionClassName="container-page mt-5"
          caption={
            <>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-copper-500" />
                Point d&apos;ancrage du CSPS
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-6 border-t border-dashed border-petrol-500" />
                Périmètre de couverture
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-6 border-t border-dashed border-copper-300" />
                Itinéraires vers les entreprises membres
              </span>
            </>
          }
        >
          <ZonePanorama />
        </Figure>
      </section>

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
        {/* Les deux premieres lignes portent le coeur du dispositif : les
            afficher a egalite avec les formations laissait le visiteur sans
            aucun repere sur ce qui compte. */}
        <ul className="grid gap-4 md:grid-cols-2">
          {PRIMARY_SERVICES.map((service) => (
            <li key={service.slug}>
              <Link
                href={`/solutions/${service.slug}`}
                className="group flex h-full flex-col rounded-lg border border-petrol-600/25 bg-mist-white p-7 transition-all duration-base hover:-translate-y-0.5 hover:border-petrol-600/50 hover:shadow-card md:p-8"
              >
                <span className="inline-flex w-fit items-center rounded-full bg-petrol-100 px-3 py-1 font-heading text-xs font-bold uppercase tracking-[0.1em] text-petrol-600">
                  Cœur du dispositif
                </span>
                <h3 className="mt-4 font-heading text-2xl font-bold leading-snug text-navy-950">
                  {service.title}
                </h3>
                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{service.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-heading font-semibold text-petrol-600">
                  En savoir plus
                  <Arrow />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SECONDARY_SERVICES.map((service) => (
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
                  <Arrow />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Secteurs. Ton sable : une respiration chaude avant le bloc sombre
          du deploiement, plutot qu'un cinquieme blanc d'affilee. */}
      <Section tone="sand">
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
                className="group block h-full rounded-lg border border-navy-950/10 bg-mist-white/55 p-6 transition-all duration-base hover:border-copper-500/45 hover:bg-mist-white"
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
      <Section tone="light">
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
