import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Qualité & conformité",
  description:
    "Engagements de service, qualifications du personnel, maintenance, traçabilité et protection des données : ce que SANARYS s'engage à tenir et à prouver.",
};

const COMMITMENTS = [
  {
    title: "Engagement de présence",
    detail:
      "Aucune journée d'activité des PME membres ne se déroule sans la présence effective du dispositif convenu au contrat.",
  },
  {
    title: "Continuité de service",
    detail:
      "En cas d'indisponibilité d'un véhicule ou d'un personnel, le remplacement est assuré sans rupture de service.",
  },
  {
    title: "Qualité et maintenance",
    detail:
      "Véhicules entretenus, équipements vérifiés, consommables à jour, personnel à jour de ses formations et habilitations.",
  },
  {
    title: "Reporting individuel",
    detail:
      "Un rapport mensuel d'activité par entreprise membre : nombre d'interventions, nature des soins, accidents déclarés.",
  },
  {
    title: "Assurance",
    detail:
      "Couverture en responsabilité civile professionnelle pour l'ensemble des interventions réalisées au sein de la zone.",
  },
] as const;

const INDICATORS = [
  { indicator: "Délai d'intervention sur site depuis le point d'ancrage", target: "< 10 minutes" },
  { indicator: "Taux de présence du personnel sur les heures convenues", target: "100 %" },
  { indicator: "Conformité du personnel à ses habilitations", target: "100 %" },
  { indicator: "Remise du rapport mensuel d'activité", target: "< 5 jours ouvrés" },
] as const;

export default function QualiteConformitePage() {
  return (
    <>
      <Section tone="navy">
        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Qualité &amp; conformité</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            Ce que nous nous engageons à tenir, et à prouver
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">
            Un dispositif sanitaire ne vaut que par sa disponibilité réelle. Nos engagements sont
            contractuels, mesurés et documentés dans un rapport mensuel.
          </p>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader eyebrow="Engagements" title="Nos engagements envers le groupement" />
        <ul className="grid gap-5 md:grid-cols-2">
          {COMMITMENTS.map((commitment) => (
            <li key={commitment.title} className="surface-card p-6">
              <h3 className="font-heading font-bold text-navy-950">{commitment.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{commitment.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="mist">
        <SectionHeader
          eyebrow="Indicateurs"
          title="Les objectifs contractuels proposés"
          lead="Ces valeurs sont des objectifs de service inscrits au contrat, mesurés mois par mois. Elles ne sont pas des mesures déjà réalisées et vérifiées par un tiers."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-start">
            <caption className="sr-only">
              Indicateurs de performance proposés et objectifs associés
            </caption>
            <thead>
              <tr className="border-b-2 border-navy-950/12">
                <th scope="col" className="py-3 pe-4 text-start font-heading text-sm font-bold text-navy-950">
                  Indicateur
                </th>
                <th scope="col" className="py-3 text-start font-heading text-sm font-bold text-navy-950">
                  Objectif
                </th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map((row) => (
                <tr key={row.indicator} className="border-b border-navy-950/8">
                  <td className="py-4 pe-4 leading-relaxed">{row.indicator}</td>
                  <td className="py-4 font-heading font-bold text-petrol-600">{row.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="light">
        <SectionHeader
          eyebrow="Protection des données"
          title="Confidentialité et données de santé"
          lead="Le secret médical structure notre organisation : il détermine qui voit quoi, et ce qui n'est jamais partagé."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="surface-card p-6">
            <h3 className="font-heading font-bold text-navy-950">
              Les rapports remis sont agrégés
            </h3>
            <p className="mt-2 leading-relaxed">
              Les rapports transmis aux entreprises membres présentent des indicateurs d&apos;activité
              consolidés. Ils ne contiennent aucune information permettant d&apos;identifier un
              salarié, ni aucun élément de son dossier de soins.
            </p>
          </div>
          <div className="surface-card p-6">
            <h3 className="font-heading font-bold text-navy-950">Cadre légal applicable</h3>
            <p className="mt-2 leading-relaxed">
              Les traitements de données personnelles sont encadrés par la loi 09-08 et les
              exigences de la CNDP. Les données collectées sur ce site le sont pour répondre à votre
              demande et qualifier votre besoin, et pour rien d&apos;autre.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border-s-4 border-copper-500 bg-sand-200/50 p-6">
          <h3 className="font-heading font-bold text-navy-950">Ce que ce site ne fait pas</h3>
          <ul className="mt-3 space-y-2">
            {[
              "Il ne collecte aucune donnée de santé : ni symptôme, ni antécédent, ni document médical.",
              "Il ne remplace jamais un appel aux secours : en cas d'urgence, contactez les secours par téléphone.",
              "Il ne produit aucun diagnostic, aucune orientation clinique et aucune recommandation médicale.",
              "Le simulateur ne produit pas de devis : seule une proposition signée après audit engage les parties.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="mist">
        <SectionHeader
          eyebrow="Preuves"
          title="Les justificatifs que nous fournissons"
          lead="Sur demande, dans le cadre d'un audit ou d'une consultation, nous transmettons les pièces vérifiables suivantes."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Diplômes et habilitations du personnel affecté, avec organisme émetteur et validité",
            "Documents des véhicules : type, équipement, contrôle technique, assurance",
            "Plan et historique de maintenance des équipements critiques",
            "Attestation d'assurance en responsabilité civile professionnelle",
            "Procédure de remplacement et de continuité de service",
            "Méthode de calcul des délais publiés dans les rapports",
          ].map((proof) => (
            <li key={proof} className="rounded-lg border border-navy-950/8 bg-mist-white p-5">
              <p className="text-sm leading-relaxed">{proof}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-prose text-sm leading-relaxed text-slate-600">
          Nous ne publions ni témoignage, ni logo client, ni étude de cas tant que le client
          concerné ne l&apos;a pas explicitement autorisé par écrit.
        </p>
      </Section>

      <Section tone="light">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">Vérifions ensemble sur le terrain</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            L&apos;audit terrain est gratuit et sans engagement. Il documente l&apos;état réel de
            votre dispositif et les écarts à combler.
          </p>
          <div className="mt-8">
            <ButtonLink href="/audit" size="lg">
              Demander un audit terrain
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
