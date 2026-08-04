import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Confidentialité",
  description:
    "Traitement des données personnelles sur le site SANARYS : finalités, durées de conservation, destinataires et droits des personnes.",
};

/**
 * Politique de confidentialité.
 *
 * Le contenu décrit fidèlement ce que l'application fait RÉELLEMENT (registre
 * des traitements aligné sur le code) et signale explicitement ce qui reste à
 * accomplir côté formalités CNDP. Aucune conformité n'est revendiquée à tort.
 */

const TREATMENTS = [
  {
    name: "Formulaire de contact et demande d'audit",
    purpose: "Répondre à votre demande et qualifier votre besoin",
    data: "Nom, fonction, entreprise, email professionnel, téléphone, zone concernée, message",
    retention: "Durée du suivi commercial, puis suppression ou archivage limité",
    basis: "Consentement recueilli au point de collecte, horodaté et versionné",
  },
  {
    name: "Simulateur CSPS",
    purpose: "Produire une estimation indicative et qualifier le besoin",
    data: "Caractéristiques de la zone, effectifs, secteurs, horaires, dispositif existant, coordonnées",
    retention: "Durée de la simulation et de son suivi commercial",
    basis: "Consentement à l'étape de contact",
  },
  {
    name: "Compte de l'espace client",
    purpose: "Fournir l'accès au portail et sécuriser les connexions",
    data: "Identité professionnelle, rôle, organisation, journal des connexions et des accès",
    retention: "Durée du contrat, puis conservation légale applicable",
    basis: "Exécution du contrat",
  },
  {
    name: "Rapports agrégés",
    purpose: "Prouver la performance du dispositif contractualisé",
    data: "Indicateurs consolidés uniquement, sans donnée permettant d'identifier une personne",
    retention: "Durée du contrat et archivage défini contractuellement",
    basis: "Exécution du contrat",
  },
  {
    name: "Mesure d'audience",
    purpose: "Comprendre l'usage du site et améliorer les parcours",
    data: "Événements techniques d'une liste blanche stricte, sans texte libre ni donnée identifiante",
    retention: "Durée courte et documentée",
    basis: "Intérêt légitime, avec minimisation appliquée",
  },
  {
    name: "Journal de sécurité",
    purpose: "Prévenir et investiguer les incidents",
    data: "Connexions, échecs, accès aux documents, adresse IP, action réalisée",
    retention: "Durée fondée sur le risque",
    basis: "Intérêt légitime à la sécurité du système",
  },
] as const;

export default function ConfidentialitePage() {
  return (
    <Section tone="light">
      <div className="mx-auto max-w-prose">
        <p className="eyebrow">Protection des données</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-950 md:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          Cette page décrit précisément les données que ce site traite, pourquoi, pendant combien de
          temps et qui y accède.
        </p>

        <div className="mt-8 rounded-lg border-s-4 border-copper-500 bg-sand-200/50 p-5">
          <h2 className="font-heading font-bold text-navy-950">
            Aucune donnée de santé n&apos;est collectée par ce site
          </h2>
          <p className="mt-2 text-[0.98rem] leading-relaxed">
            Ni symptôme, ni antécédent, ni document médical. Les formulaires ne comportent aucun
            champ de cette nature et les rapports du portail ne présentent que des indicateurs
            agrégés. Le suivi médical éventuel des salariés relève du secret médical et ne transite
            pas par cette application.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Responsable du traitement</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              SANARYS est responsable des traitements décrits ci-dessous. Pour toute question ou
              pour exercer vos droits :{" "}
              <a href={`mailto:${SITE.email}`} className="link-underline font-semibold text-navy-950">
                {SITE.email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">
              Registre des traitements
            </h2>
            <div className="mt-5 space-y-5">
              {TREATMENTS.map((treatment) => (
                <div key={treatment.name} className="surface-card p-5">
                  <h3 className="font-heading font-bold text-navy-950">{treatment.name}</h3>
                  <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                    <div className="grid gap-0.5 sm:grid-cols-[150px_1fr]">
                      <dt className="font-semibold text-navy-950">Finalité</dt>
                      <dd className="text-slate-600">{treatment.purpose}</dd>
                    </div>
                    <div className="grid gap-0.5 sm:grid-cols-[150px_1fr]">
                      <dt className="font-semibold text-navy-950">Données</dt>
                      <dd className="text-slate-600">{treatment.data}</dd>
                    </div>
                    <div className="grid gap-0.5 sm:grid-cols-[150px_1fr]">
                      <dt className="font-semibold text-navy-950">Conservation</dt>
                      <dd className="text-slate-600">{treatment.retention}</dd>
                    </div>
                    <div className="grid gap-0.5 sm:grid-cols-[150px_1fr]">
                      <dt className="font-semibold text-navy-950">Base</dt>
                      <dd className="text-slate-600">{treatment.basis}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Destinataires</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Les données de contact et de simulation sont accessibles aux équipes commerciales
              SANARYS. Les données de l&apos;espace client sont strictement cloisonnées par
              organisation : un utilisateur d&apos;une entreprise membre n&apos;accède jamais aux
              données d&apos;une autre entreprise. Les accès sont journalisés.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Cookies et traceurs</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Ce site n&apos;utilise pas de traceur publicitaire ni de cookie tiers. Un cookie de
              session strictement nécessaire est déposé après connexion à l&apos;espace client, ainsi
              qu&apos;un jeton de protection contre les requêtes falsifiées. Ils sont supprimés à la
              déconnexion.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Vos droits</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Conformément à la loi 09-08 relative à la protection des personnes physiques à
              l&apos;égard du traitement des données à caractère personnel, vous disposez d&apos;un
              droit d&apos;accès, de rectification et d&apos;opposition sur les données vous
              concernant.
            </p>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Le retrait de votre consentement est aussi simple que son acceptation : une demande à{" "}
              <a href={`mailto:${SITE.email}`} className="link-underline font-semibold text-navy-950">
                {SITE.email}
              </a>{" "}
              suffit. La demande est tracée et traitée dans les délais applicables.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Sécurité</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Les accès à l&apos;espace client sont nominatifs, les mots de passe sont stockés sous
              forme de condensat, les sessions sont révocables et le compte est temporairement
              verrouillé après plusieurs tentatives infructueuses. Les connexions, les accès aux
              documents et les changements de droits sont journalisés.
            </p>
          </section>

          <section className="rounded-lg border-s-4 border-warning bg-warning/10 p-5">
            <h2 className="font-heading font-bold text-navy-950">
              Formalités déclaratives en cours
            </h2>
            <p className="mt-2 text-[0.98rem] leading-relaxed">
              Les mécanismes techniques de protection décrits ci-dessus sont en place. Les formalités
              déclaratives auprès de la CNDP, la désignation du référent données et la validation
              juridique des durées de conservation restent à finaliser avant l&apos;ouverture
              complète du service. Cette page sera mise à jour en conséquence.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-400">
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
      </div>
    </Section>
  );
}
