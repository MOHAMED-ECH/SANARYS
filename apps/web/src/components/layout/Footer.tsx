import Link from "next/link";
import { Logo } from "./Logo";
import { SERVICES, SITE } from "@/content/site";

const COLUMNS = [
  {
    title: "Le modèle",
    links: [
      { href: "/modele-csps", label: "Le modèle CSPS" },
      { href: "/zones", label: "Zones & couverture" },
      { href: "/simulateur", label: "Simulateur" },
      { href: "/qualite-conformite", label: "Qualité & conformité" },
    ],
  },
  {
    title: "Solutions",
    links: SERVICES.slice(0, 4).map((s) => ({ href: `/solutions/${s.slug}`, label: s.title })),
  },
  {
    title: "Entreprise",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/ressources", label: "Ressources" },
      { href: "/contact", label: "Contact" },
      { href: "/audit", label: "Demander un audit" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="bg-navy-950 text-mist-50/70">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo onDark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{SITE.baseline}</p>
            <div className="mt-6 space-y-1 text-sm">
              <p>
                <a href={`mailto:${SITE.email}`} className="link-underline text-mist-white">
                  {SITE.email}
                </a>
              </p>
              <p>{SITE.phone}</p>
              <p>{SITE.city}</p>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-mist-white">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-mist-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-mist-white/10 pt-6 text-xs leading-relaxed">
          <p>
            Les délais et engagements présentés sur ce site sont des objectifs contractuels définis
            avec chaque groupement. Les résultats du simulateur sont indicatifs et ne constituent pas
            une offre. Les données personnelles collectées sont traitées conformément à la loi 09-08.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} SANARYS. Tous droits réservés.</p>
            <ul className="flex gap-4">
              <li>
                <Link href="/mentions-legales" className="hover:text-mist-white">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-mist-white">
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
