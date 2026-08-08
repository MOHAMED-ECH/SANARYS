import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "SANARYS est un opérateur marocain de moyens humains, matériels et logistiques dédiés à la couverture sanitaire, la prise en charge médicale et le transport sanitaire.",
};

const JOBS = [
  "Location d'ambulances de types A, B et C",
  "Mise à disposition de personnel médical et paramédical",
  "Aménagement et équipement d'espaces médicaux",
  "Couverture événementielle et industrielle",
  "Transport sanitaire d'urgence et programmé",
  "Formations, conseil et audit sanitaire",
] as const;

const PRINCIPLES = [
  {
    title: "Conformité",
    detail:
      "Véhicules, équipements et personnel répondent aux exigences de la réglementation marocaine applicable, contrôlés et documentés.",
  },
  {
    title: "Qualification",
    detail:
      "Nos intervenants sont titulaires des diplômes et habilitations requis pour les actes qu'ils réalisent.",
  },
  {
    title: "Traçabilité",
    detail:
      "Reporting périodique, indicateurs de performance et suivi qualité : ce qui est fait est écrit et vérifiable.",
  },
  {
    title: "Confidentialité",
    detail:
      "Respect strict du secret médical et protection des données personnelles selon la loi 09-08.",
  },
] as const;

export default function AProposPage() {
  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">À propos</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Un opérateur de santé opérationnelle, pas un simple loueur d&apos;ambulances
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            SANARYS met à disposition les moyens humains, matériels et logistiques nécessaires à la
            couverture sanitaire, à la prise en charge médicale et au transport sanitaire, au profit
            d&apos;acteurs publics, privés, institutionnels, industriels et événementiels.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeader eyebrow="Notre vocation" title="Rendre la capacité d'intervention accessible" />
            <p className="text-[1.05rem] leading-relaxed">
              Notre métier consiste à permettre à nos partenaires de disposer, sur site ou à la
              demande, d&apos;une capacité d&apos;intervention médicale immédiate — sans avoir à
              internaliser la flotte, les équipements ni le personnel médical.
            </p>
            <p className="mt-4 text-[1.05rem] leading-relaxed">
              Le modèle CSPS pousse cette logique un cran plus loin : il rend accessible à des PME,
              par la mutualisation, un dispositif qu&apos;aucune d&apos;entre elles ne pourrait
              raisonnablement financer seule.
            </p>
          </div>

          <div className="surface-card p-7">
            <h2 className="font-heading text-xl font-bold text-navy-950">Nos métiers</h2>
            <ul className="mt-5 space-y-3">
              {JOBS.map((job) => (
                <li key={job} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-500" />
                  <span className="leading-relaxed">{job}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <SectionHeader eyebrow="Nos principes" title="Ce sur quoi nous ne transigeons pas" />
        <ul className="grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <li key={principle.title} className="surface-card p-6">
              <h3 className="font-heading font-bold text-navy-950">{principle.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{principle.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Gouvernance médicale"
          title="Qui décide de quoi"
          lead="La séparation des responsabilités structure notre organisation."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Direction médicale",
              detail:
                "Valide les protocoles, les actes autorisés et les modèles de compte rendu. Aucune décision clinique n'est prise en dehors de ce cadre.",
            },
            {
              title: "Direction des opérations",
              detail:
                "Assure le déploiement, la disponibilité des ressources, la maintenance, les stocks et la production des rapports.",
            },
            {
              title: "Référent données",
              detail:
                "Supervise les finalités de traitement, les consentements, les durées de conservation et l'exercice des droits.",
            },
          ].map((role) => (
            <div key={role.title} className="border-t-2 border-petrol-600/30 pt-5">
              <h3 className="font-heading font-bold text-navy-950">{role.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{role.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-navy-950/10 bg-mist-50 p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            Nous ne publions sur ce site ni témoignage, ni logo client, ni étude de cas qui
            n&apos;aurait pas été formellement autorisé par le client concerné. Nos premières
            références vérifiées seront publiées lorsqu&apos;elles le seront.
          </p>
        </div>
      </Section>

      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">Parlons de votre zone</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Écrivez-nous à{" "}
            <a href={`mailto:${SITE.email}`} className="link-underline font-semibold text-navy-950">
              {SITE.email}
            </a>{" "}
            ou demandez directement un audit terrain gratuit.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/audit" size="lg">
              Demander un audit terrain
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Nous contacter
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
