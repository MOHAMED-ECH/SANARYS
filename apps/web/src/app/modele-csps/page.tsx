import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Faq } from "@/components/ui/Faq";
import { CspsExplainer } from "@/components/home/CspsExplainer";
import { CSPS_STEPS, DEPLOYMENT_STEPS, FAQ } from "@/content/site";

export const metadata: Metadata = {
  title: "Le modèle CSPS",
  description:
    "Le Centre de Services Partagés Sanitaires mutualise une ambulance dédiée, du personnel médical et une infirmerie entre les PME d'une même zone industrielle marocaine.",
};

const ADVANTAGES = [
  {
    title: "Maîtrise des coûts",
    detail:
      "Le coût du dispositif est réparti entre plusieurs entreprises : chacune ne supporte qu'une fraction du total.",
  },
  {
    title: "Accès à un dispositif complet",
    detail:
      "Ambulance, infirmier, médecin et infirmerie : un ensemble qu'aucune PME ne financerait seule.",
  },
  {
    title: "Zéro contrainte de gestion",
    detail:
      "Aucune embauche, aucun planning, aucune maintenance à gérer : SANARYS exploite l'ensemble du dispositif.",
  },
  {
    title: "Conformité documentée",
    detail:
      "Registres d'accidents, protocoles et reporting mensuel constituent une trace exploitable en cas d'audit.",
  },
  {
    title: "Impact opérationnel",
    detail:
      "Prise en charge plus rapide, réduction du temps d'immobilisation après accident, meilleure gestion des urgences.",
  },
  {
    title: "Valorisation RSE",
    detail:
      "Un argument de différenciation auprès des donneurs d'ordre internationaux et des auditeurs sociaux.",
  },
] as const;

const MODULES = [
  {
    tag: "Module socle",
    title: "Ambulance dédiée à la zone",
    points: [
      "Véhicule positionné au point d'ancrage central de la zone",
      "Type B (soins d'urgence) ou type C (réanimation mobile) selon le niveau de risque",
      "Équipement complet : défibrillateur, oxygénothérapie, brancard, matériel de bilan",
      "Maintenance, assurance, contrôle technique et remplacement pris en charge",
    ],
    accent: true,
  },
  {
    tag: "Option",
    title: "Infirmier(ère) permanent(e)",
    points: [
      "Soins courants et surveillance des salariés blessés",
      "Gestion de l'infirmerie centrale et de ses consommables",
      "Présence pendant les heures d'activité, astreintes possibles",
      "Tenue des registres d'accidents du travail",
    ],
    accent: false,
  },
  {
    tag: "Option",
    title: "Médecin dédié sur site",
    points: [
      "Prise en charge médicale des urgences sur site",
      "Suivi des cas complexes et orientation vers les structures spécialisées",
      "Appui à la médecine du travail : visites, aptitudes, prévention",
      "Modalités à définir : demi-journées, jours de forte activité, astreintes",
    ],
    accent: false,
  },
  {
    tag: "Option",
    title: "Infirmerie centrale aménagée",
    points: [
      "Conception et aménagement clés en main du local",
      "Mobilier médical et poste infirmier",
      "Consommables : fourniture initiale et renouvellement",
      "Signalétique réglementaire et mise en conformité",
    ],
    accent: false,
  },
] as const;

export default function ModeleCspsPage() {
  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Le modèle CSPS</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Un dispositif médical complet, partagé entre voisins
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            Le Centre de Services Partagés Sanitaires est un dispositif mutualisé implanté au cœur
            d&apos;une zone industrielle. Plusieurs PME voisines en partagent le coût ; SANARYS en
            assure l&apos;exploitation complète.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Principe"
          title="Comment fonctionne un CSPS"
          lead="Sélectionnez une étape pour visualiser le principe."
        />
        <CspsExplainer />
      </Section>

      <Section tone="mist">
        <SectionHeader
          eyebrow="Architecture"
          title="Trois piliers, un pilotage unique"
          lead="Le dispositif repose sur un point d'ancrage, une couverture de zone et une clé de répartition — le tout exploité par SANARYS."
        />
        <ol className="grid gap-6 md:grid-cols-3">
          {CSPS_STEPS.map((step) => (
            <li key={step.number} className="surface-card p-6">
              <span className="font-heading text-sm font-bold text-copper-500">{step.number}</span>
              <h3 className="mt-2 font-heading text-lg font-bold text-navy-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-lg border-s-4 border-petrol-600 bg-mist-white p-6">
          <h3 className="font-heading font-bold text-navy-950">Pilotage exclusif par SANARYS</h3>
          <p className="mt-2 leading-relaxed">
            Ambulances, personnel, infirmerie, consommables, maintenance et reporting : la gestion
            opérationnelle est intégralement assurée par SANARYS. Les PME membres n&apos;ont aucune
            contrainte de gestion.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Composition du pack"
          title="Un module socle, trois options"
          lead="Le groupement active les modules qui correspondent à son niveau de risque et à ses moyens."
        />
        <ul className="grid gap-5 md:grid-cols-2">
          {MODULES.map((module) => (
            <li
              key={module.title}
              className={
                module.accent
                  ? "rounded-lg border-2 border-copper-500/40 bg-sand-200/40 p-6"
                  : "surface-card p-6"
              }
            >
              <span
                className={
                  module.accent
                    ? "inline-block rounded-full bg-copper-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-mist-white"
                    : "inline-block rounded-full bg-navy-950/6 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600"
                }
              >
                {module.tag}
              </span>
              <h3 className="mt-3 font-heading text-xl font-bold text-navy-950">{module.title}</h3>
              <ul className="mt-4 space-y-2">
                {module.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="mist">
        <SectionHeader
          eyebrow="Bénéfices"
          title="Ce que le modèle change pour une PME membre"
        />
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((advantage) => (
            <li key={advantage.title} className="surface-card p-6">
              <h3 className="font-heading font-bold text-navy-950">{advantage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{advantage.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Répartition des coûts"
          title="Une clé définie en commun, pas imposée"
          lead="La formule de référence combine une part fixe et une part proportionnelle à l'effectif. Le groupement peut l'ajuster selon ses propres critères."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="surface-card p-6">
            <p className="font-heading text-4xl font-extrabold text-copper-500">40 %</p>
            <h3 className="mt-2 font-heading font-bold text-navy-950">En part fixe</h3>
            <p className="mt-2 text-sm leading-relaxed">
              Répartie à parts égales entre les entreprises membres : chacune contribue au socle du
              dispositif, quelle que soit sa taille.
            </p>
          </div>
          <div className="surface-card p-6">
            <p className="font-heading text-4xl font-extrabold text-petrol-600">60 %</p>
            <h3 className="mt-2 font-heading font-bold text-navy-950">Selon l&apos;effectif</h3>
            <p className="mt-2 text-sm leading-relaxed">
              Répartie proportionnellement au nombre de salariés couverts. D&apos;autres critères
              sont possibles : surface, niveau de risque, horaires.
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-slate-600">
          Ces pourcentages décrivent une répartition entre membres, jamais un montant. Le chiffrage
          intervient dans la proposition technique et financière établie après audit terrain.
        </p>
      </Section>

      <Section tone="navy">
        <SectionHeader
          eyebrow="Mise en place"
          title="Six étapes jusqu'à la mise en service"
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

      <Section tone="light">
        <SectionHeader eyebrow="Questions fréquentes" title="Ce que les dirigeants nous demandent" />
        <Faq items={FAQ} />
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/simulateur" size="lg">
            Simuler mon CSPS
          </ButtonLink>
          <ButtonLink href="/audit" variant="secondary" size="lg">
            Demander un audit terrain
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
