import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * Page 404. Un visiteur perdu doit repartir vers une action utile plutot que
 * vers un cul-de-sac : les trois entrees proposees couvrent les intentions
 * les plus frequentes du site.
 */
const SHORTCUTS = [
  {
    href: "/modele-csps",
    title: "Comprendre le modèle CSPS",
    detail: "Le principe du dispositif mutualisé, ses modules et sa clé de répartition.",
  },
  {
    href: "/simulateur",
    title: "Simuler mon dispositif",
    detail: "Une configuration indicative pour votre zone en sept étapes.",
  },
  {
    href: "/contact",
    title: "Parler à un conseiller",
    detail: "Nous répondons sous deux heures ouvrées.",
  },
] as const;

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="contenu">
    <div className="bg-mist-50">
      <div className="container-page py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-heading text-6xl font-extrabold text-copper-500">404</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-navy-950 md:text-4xl">
            Cette page n&apos;existe pas
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Le lien que vous avez suivi est peut-être obsolète, ou l&apos;adresse comporte une
            erreur.
          </p>

          <div className="mt-8">
            <ButtonLink href="/" size="lg">
              Retour à l&apos;accueil
            </ButtonLink>
          </div>
        </div>

        <ul className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.href}>
              <Link
                href={shortcut.href}
                className="group block h-full rounded-lg border border-navy-950/8 bg-mist-white p-6 transition-all duration-base hover:-translate-y-0.5 hover:border-petrol-600/30 hover:shadow-card"
              >
                <h2 className="font-heading font-bold text-navy-950">{shortcut.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{shortcut.detail}</p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-center text-sm leading-relaxed text-slate-600">
          En cas d&apos;urgence médicale, ce site n&apos;est pas le bon canal : contactez
          immédiatement les secours par téléphone.
        </p>
      </div>
    </div>
      </main>
      <Footer />
    </>
  );
}
