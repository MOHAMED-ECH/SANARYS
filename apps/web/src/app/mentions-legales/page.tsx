import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site SANARYS.",
};

/**
 * Gabarit de mentions légales.
 *
 * Les champs entre crochets doivent être renseignés par SANARYS avant toute
 * mise en ligne : ils engagent juridiquement l'entreprise et ne peuvent pas
 * être devinés. La page est volontairement explicite sur ce qui reste à
 * compléter plutôt que de présenter des informations inventées.
 */

const TODO = "[à compléter par SANARYS]";

export default function MentionsLegalesPage() {
  return (
    <Section tone="light">
      <div className="mx-auto max-w-prose">
        <p className="eyebrow">Informations légales</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-950 md:text-4xl">
          Mentions légales
        </h1>

        <div className="mt-6 rounded-lg border-s-4 border-warning bg-warning/10 p-5">
          <p className="text-sm leading-relaxed text-navy-950">
            <strong>Gabarit à compléter avant mise en ligne.</strong> Les éléments marqués{" "}
            <em>{TODO}</em> doivent être renseignés et validés juridiquement par SANARYS. Ils
            engagent l&apos;entreprise et ne peuvent pas être renseignés par défaut.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Éditeur du site</h2>
            <dl className="mt-4 space-y-3 text-[0.98rem] leading-relaxed">
              <Row label="Dénomination sociale" value={TODO} />
              <Row label="Forme juridique" value={TODO} />
              <Row label="Capital social" value={TODO} />
              <Row label="Siège social" value={TODO} />
              <Row label="Registre du commerce (RC)" value={TODO} />
              <Row label="Identifiant fiscal (IF)" value={TODO} />
              <Row label="Identifiant commun de l'entreprise (ICE)" value={TODO} />
              <Row label="Directeur de la publication" value={TODO} />
              <Row label="Contact" value={SITE.email} />
            </dl>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Hébergement</h2>
            <dl className="mt-4 space-y-3 text-[0.98rem] leading-relaxed">
              <Row label="Hébergeur" value={TODO} />
              <Row label="Adresse de l'hébergeur" value={TODO} />
              <Row label="Localisation des données" value={TODO} />
            </dl>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">
              Autorisations et agréments
            </h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Les autorisations, agréments et habilitations applicables à l&apos;activité de
              transport sanitaire et de mise à disposition de personnel médical sont référencés
              ci-après : {TODO}
            </p>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Ces éléments sont communiqués sur demande dans le cadre d&apos;une consultation ou
              d&apos;un audit.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Propriété intellectuelle</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              L&apos;ensemble des contenus de ce site — textes, éléments graphiques, illustrations,
              structure et code — est protégé au titre de la propriété intellectuelle. Toute
              reproduction ou représentation, totale ou partielle, sans autorisation écrite
              préalable est interdite.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">
              Limites de responsabilité
            </h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Les informations publiées sur ce site sont fournies à titre informatif. Les résultats
              du simulateur CSPS sont des estimations indicatives : ils ne constituent ni un devis,
              ni une offre, ni un engagement contractuel. Seule une proposition technique et
              financière signée, établie après audit terrain, engage les parties.
            </p>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Les délais et niveaux de service mentionnés sont des objectifs contractuels définis
              avec chaque groupement. Ils ne sont opposables que dans le cadre d&apos;un contrat
              signé et dans les conditions qu&apos;il précise.
            </p>
          </section>

          <section className="rounded-lg border-s-4 border-danger bg-danger/8 p-5">
            <h2 className="font-heading text-lg font-bold text-navy-950">Urgences médicales</h2>
            <p className="mt-2 text-[0.98rem] leading-relaxed">
              Ce site n&apos;est pas un canal d&apos;urgence. En cas d&apos;urgence médicale,
              contactez immédiatement les services de secours par téléphone. Aucun formulaire de ce
              site ne déclenche d&apos;intervention.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-navy-950">Droit applicable</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed">
              Le présent site et son utilisation sont soumis au droit marocain. Toute contestation
              relève de la compétence des juridictions {TODO}.
            </p>
          </section>
        </div>
      </div>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const pending = value.startsWith("[");
  return (
    <div className="grid gap-1 sm:grid-cols-[240px_1fr]">
      <dt className="font-heading font-semibold text-navy-950">{label}</dt>
      <dd className={pending ? "italic text-warning" : "text-slate-600"}>{value}</dd>
    </div>
  );
}
