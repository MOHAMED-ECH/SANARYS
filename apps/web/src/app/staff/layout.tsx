import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

/**
 * Habillage de la console commerciale.
 *
 * Comme le portail client, elle n'emprunte pas l'en-tete du site public : un
 * commercial qui travaille sa file de leads n'a que faire d'un bouton
 * « Simuler mon CSPS ». Le bandeau sombre rappelle en permanence qu'on est
 * dans un outil interne, et non sur l'espace d'un client.
 */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mist-50">
      <header className="bg-navy-950">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="SANARYS — retour au site public">
              <Logo onDark className="text-mist-white" />
            </Link>
            <span className="rounded-full bg-copper-500/20 px-3 py-1 font-heading text-xs font-bold uppercase tracking-[0.12em] text-copper-300">
              Console interne
            </span>
          </div>
          <p className="text-sm text-mist-50/60">
            Données commerciales — aucun accès aux espaces clients
          </p>
        </div>
      </header>

      <main id="contenu">{children}</main>
    </div>
  );
}
