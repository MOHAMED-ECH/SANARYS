import Link from "next/link";
import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Faq } from "@/components/ui/Faq";
import { FAQ } from "@/content/site";

export const metadata: Metadata = {
  title: "Ressources",
  description:
    "Glossaire, questions fréquentes et repères pratiques sur les dispositifs sanitaires mutualisés en zone industrielle.",
};

const GLOSSARY = [
  {
    term: "CSPS",
    definition:
      "Centre de Services Partagés Sanitaires : dispositif médical mutualisé implanté dans une zone industrielle et financé collectivement par plusieurs entreprises voisines.",
  },
  {
    term: "Point d'ancrage",
    definition:
      "Emplacement central du dispositif au sein de la zone, depuis lequel l'ambulance et le personnel rayonnent vers les entreprises membres.",
  },
  {
    term: "Ambulance type A / B / C",
    definition:
      "Classification des véhicules sanitaires selon leur équipement : transport sanitaire (A), soins d'urgence (B), réanimation mobile (C).",
  },
  {
    term: "DPS",
    definition:
      "Dispositif Prévisionnel de Secours : moyens humains et matériels déployés lors d'une manifestation, dimensionnés selon le public attendu et les risques.",
  },
  {
    term: "Clé de répartition",
    definition:
      "Règle définie en commun par le groupement pour répartir le coût du dispositif entre ses membres (part fixe, effectif, surface, niveau de risque).",
  },
  {
    term: "Donnée agrégée",
    definition:
      "Indicateur consolidé sur un ensemble de personnes, construit de manière à ne permettre l'identification d'aucun individu.",
  },
  {
    term: "Module socle",
    definition:
      "Composant systématiquement inclus dans un pack CSPS : l'ambulance dédiée à la zone. Les autres modules sont optionnels.",
  },
  {
    term: "Loi 09-08",
    definition:
      "Loi marocaine relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, dont la CNDP est l'autorité de contrôle.",
  },
] as const;

const GUIDES = [
  {
    title: "Dimensionner un dispositif sanitaire mutualisé",
    lead: "Quels critères déterminent le type de véhicule, la présence infirmière et l'infirmerie centrale.",
    href: "/modele-csps",
    action: "Lire le modèle CSPS",
  },
  {
    title: "Évaluer sa préparation aux urgences",
    lead: "Les quatre questions à se poser avant un audit, secteur par secteur.",
    href: "/secteurs",
    action: "Voir par secteur",
  },
  {
    title: "Comprendre nos engagements de service",
    lead: "Ce que nous nous engageons à tenir, comment nous le mesurons et ce que nous fournissons comme preuves.",
    href: "/qualite-conformite",
    action: "Qualité & conformité",
  },
] as const;

export default function RessourcesPage() {
  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Ressources</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Repères pratiques et vocabulaire commun
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            Les notions utiles pour comparer les dispositifs, poser les bonnes questions et décider
            en connaissance de cause.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader eyebrow="Guides" title="Par où commencer" />
        <ul className="grid gap-5 md:grid-cols-3">
          {GUIDES.map((guide) => (
            <li key={guide.title} className="surface-card flex flex-col p-6">
              <h2 className="font-heading text-lg font-bold text-navy-950">{guide.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed">{guide.lead}</p>
              <Link
                href={guide.href}
                className="mt-4 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-petrol-600 underline underline-offset-4"
              >
                {guide.action}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="mist">
        <SectionHeader eyebrow="Glossaire" title="Le vocabulaire du dispositif" />
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {GLOSSARY.map((entry) => (
            <div key={entry.term} className="border-t border-navy-950/10 pt-4">
              <dt className="font-heading font-bold text-navy-950">{entry.term}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="light">
        <SectionHeader eyebrow="Questions fréquentes" title="Les réponses aux questions courantes" />
        <Faq items={FAQ} />
      </Section>

      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">Une question sans réponse ici ?</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Écrivez-nous : nous répondons sous deux heures ouvrées.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact" size="lg">
              Nous contacter
            </ButtonLink>
            <ButtonLink href="/simulateur" variant="secondary" size="lg">
              Simuler mon CSPS
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
