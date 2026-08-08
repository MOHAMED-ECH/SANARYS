"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { MeResponse } from "@sanarys/schemas";
import { authApi, AuthError } from "@/lib/auth-api";
import { Logo } from "@/components/layout/Logo";
import {
  IconContract,
  IconDashboard,
  IconLogout,
  IconMembers,
  IconReport,
  IconSecurity,
} from "@/components/ui/icons";

export type PortalTab = "dashboard" | "contracts" | "reports" | "members" | "security";

const TABS: {
  key: PortalTab;
  label: string;
  href: string;
  Icon: (props: { className?: string }) => JSX.Element;
}[] = [
  { key: "dashboard", label: "Tableau de bord", href: "/portail", Icon: IconDashboard },
  { key: "contracts", label: "Contrats", href: "/portail/contrats", Icon: IconContract },
  { key: "reports", label: "Rapports", href: "/portail/rapports", Icon: IconReport },
  { key: "members", label: "Membres", href: "/portail/membres", Icon: IconMembers },
  { key: "security", label: "Sécurité", href: "/portail/securite", Icon: IconSecurity },
];

/**
 * Coquille du portail : garde d'authentification, selection de l'organisation
 * courante (un utilisateur peut appartenir a plusieurs) et navigation.
 *
 * Le portail a son propre habillage, distinct du site public. Il portait
 * jusqu'ici l'en-tete marketing — « Simuler mon CSPS », « Secteurs » — et un
 * pied de page de quatre colonnes plus haut que le contenu lui-meme. Un client
 * qui se connecte doit entrer dans son espace, pas rester sur une page de
 * site vitrine.
 *
 * Navigation laterale plutot qu'onglets : elle tient l'ajout de rubriques sans
 * deborder, et donne au portail la silhouette d'un outil de travail.
 */
export function PortalShell({
  active,
  children,
}: {
  active: PortalTab;
  children: (context: {
    me: MeResponse;
    organizationId: string;
    /** Vrai uniquement si l'utilisateur est ORG_ADMIN par appartenance DIRECTE. */
    canInvite: boolean;
  }) => React.ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    void (async () => {
      try {
        const profile = await authApi.me();
        if (profile.memberships.length === 0) {
          setState("denied");
          return;
        }
        setMe(profile);
        setOrganizationId(profile.memberships[0]!.organizationId);
        setState("ready");
      } catch (error) {
        if (error instanceof AuthError && error.status === 401) {
          router.replace("/connexion");
          return;
        }
        setState("denied");
      }
    })();
  }, [router]);

  async function handleLogout() {
    await authApi.logout().catch(() => undefined);
    router.push("/connexion");
    router.refresh();
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist-50" aria-live="polite">
        <p className="text-slate-600">Chargement de votre espace…</p>
      </div>
    );
  }

  if (state === "denied" || !me || !organizationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist-50 px-6">
        <div className="max-w-lg rounded-lg border border-warning/30 bg-warning/10 p-8 text-center">
          <h1 className="font-heading text-xl font-bold text-navy-950">Espace indisponible</h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            Votre compte n&apos;est rattaché à aucune organisation cliente. Si vous pensez qu&apos;il
            s&apos;agit d&apos;une erreur, contactez votre administrateur ou écrivez-nous à
            contact@sanarys.ma.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-petrol-600 underline underline-offset-2">
            Retour au site
          </Link>
        </div>
      </div>
    );
  }

  const membership = me.memberships.find((m) => m.organizationId === organizationId)!;
  const initiales = me.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen bg-mist-50 lg:flex">
      {/* Barre laterale. Sur petit ecran elle devient une bande horizontale
          defilante : une colonne fixe mangerait la moitie de la largeur. */}
      <aside className="bg-navy-950 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:py-6">
          <Link href="/" className="inline-block" aria-label="SANARYS — retour au site public">
            <Logo onDark className="text-mist-white" />
          </Link>
          <p className="hidden text-xs uppercase tracking-[0.16em] text-copper-300 lg:mt-3 lg:block">
            Espace client
          </p>

          {/* Deconnexion accessible des le haut sur mobile, ou le pied de la
              barre laterale n'existe pas. */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-mist-50/70 transition-colors hover:bg-mist-white/10 hover:text-mist-white lg:hidden"
          >
            <IconLogout />
            Quitter
          </button>
        </div>

        <nav aria-label="Sections du portail" className="px-3 pb-3 lg:flex-1 lg:pb-0">
          <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
            {TABS.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  aria-current={active === tab.key ? "page" : undefined}
                  className={clsx(
                    "inline-flex w-full items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-fast",
                    active === tab.key
                      ? "bg-mist-white/12 text-mist-white"
                      : "text-mist-50/65 hover:bg-mist-white/6 hover:text-mist-white",
                  )}
                >
                  <tab.Icon
                    className={clsx(active === tab.key ? "text-copper-300" : "text-mist-50/45")}
                  />
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Identite et deconnexion, au pied de la colonne sur grand ecran. */}
        <div className="hidden border-t border-mist-white/10 p-3 lg:block">
          <div className="flex items-center gap-3 px-2 py-2">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol-600 font-heading text-sm font-bold text-mist-white"
            >
              {initiales}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-mist-white">
                {me.fullName}
              </span>
              <span className="block truncate text-xs text-mist-50/55">
                {roleLabel(membership.role)}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 inline-flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-mist-50/65 transition-colors hover:bg-mist-white/8 hover:text-mist-white"
          >
            <IconLogout className="text-mist-50/45" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-navy-950/8 bg-mist-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-10">
            <div className="min-w-0">
              <h1 className="truncate font-heading text-xl font-bold text-navy-950">
                {membership.organizationName}
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                {organizationTypeLabel(membership.organizationType)}
              </p>
            </div>

            {me.memberships.length > 1 ? (
              <label className="text-sm">
                <span className="sr-only">Organisation affichée</span>
                <select
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  className="rounded-md border border-navy-950/15 bg-mist-white px-3 py-2 text-sm text-navy-950"
                >
                  {me.memberships.map((m) => (
                    <option key={m.organizationId} value={m.organizationId}>
                      {m.organizationName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </header>

        <main id="contenu" className="px-6 py-8 lg:px-10 lg:py-10">
          {children({ me, organizationId, canInvite: membership.role === "ORG_ADMIN" })}
        </main>

        {/* Pied de page reduit a ce qui est juridiquement necessaire : le pied
            marketing complet n'a rien a faire dans un espace de travail. */}
        <footer className="border-t border-navy-950/8 px-6 py-6 lg:px-10">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} SANARYS</span>
            <Link href="/mentions-legales" className="hover:text-slate-600">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-slate-600">
              Confidentialité
            </Link>
            <span>Les accès et téléchargements sont journalisés.</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    ORG_ADMIN: "Administrateur",
    HSE_MANAGER: "Responsable HSE",
    COMPANY_DIRECTOR: "Direction",
    ZONE_MANAGER: "Gestionnaire de zone",
    VIEWER: "Lecture seule",
  };
  return labels[role] ?? role;
}

function organizationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    GROUPEMENT: "Groupement de PME",
    COMPANY: "Entreprise membre",
    ZONE_MANAGER: "Gestionnaire de zone",
  };
  return labels[type] ?? type;
}
