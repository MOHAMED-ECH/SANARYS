import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@/styles/globals.css";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sanarys.ma"),
  title: {
    default: `${SITE.name} — ${SITE.baseline}`,
    template: `%s — ${SITE.name}`,
  },
  description:
    "SANARYS déploie et pilote des dispositifs sanitaires mutualisés (ambulance, personnel, infirmerie, reporting) pour les groupements de PME des zones industrielles marocaines.",
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.baseline}`,
    description:
      "Le modèle CSPS : un dispositif médical complet, partagé entre les PME d'une même zone industrielle.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu principal
        </a>
        {/* Ni en-tete ni pied de page ici : chaque espace apporte le sien.
            Le site public via le groupe (site), le portail et la console via
            leurs propres layouts. */}
        {children}
      </body>
    </html>
  );
}
