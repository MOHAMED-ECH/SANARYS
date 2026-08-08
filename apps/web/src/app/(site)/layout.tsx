import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * Habillage du site public : en-tete de navigation marketing et pied de page
 * complet.
 *
 * Il vit dans un groupe de routes plutot qu'a la racine parce que le portail
 * client n'en veut pas. Un client qui se connecte se retrouvait jusqu'ici avec
 * « Simuler mon CSPS », « Secteurs » et un pied de page de quatre colonnes
 * au-dessus de ses contrats : il restait sur une page de site vitrine au lieu
 * d'entrer dans son espace.
 *
 * Les parentheses n'apparaissent pas dans les URL : /zones reste /zones.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="contenu">{children}</main>
      <Footer />
    </>
  );
}
