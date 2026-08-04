"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { MeResponse } from "@sanarys/schemas";
import { authApi, AuthError } from "@/lib/auth-api";

export type PortalTab = "dashboard" | "contracts" | "reports" | "members";

const TABS: { key: PortalTab; label: string }[] = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "contracts", label: "Contrats" },
  { key: "reports", label: "Rapports" },
  { key: "members", label: "Membres" },
];

/**
 * Coquille du portail : garde d'authentification, selection de
 * l'organisation courante (un utilisateur peut appartenir a plusieurs) et
 * navigation entre les vues.
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
      <div className="container-page py-20 text-center" aria-live="polite">
        <p className="text-slate-600">Chargement de votre espace…</p>
      </div>
    );
  }

  if (state === "denied" || !me || !organizationId) {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-lg rounded-lg border border-warning/30 bg-warning/10 p-8 text-center">
          <h1 className="font-heading text-xl font-bold text-navy-950">Espace indisponible</h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            Votre compte n&apos;est rattaché à aucune organisation cliente. Si vous pensez qu&apos;il
            s&apos;agit d&apos;une erreur, contactez votre administrateur ou écrivez-nous à
            contact@sanarys.ma.
          </p>
        </div>
      </div>
    );
  }

  const membership = me.memberships.find((m) => m.organizationId === organizationId)!;

  return (
    <div className="bg-mist-50">
      <div className="border-b border-navy-950/8 bg-mist-white">
        <div className="container-page py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Espace client</p>
              <h1 className="mt-1.5 font-heading text-2xl font-bold text-navy-950">
                {membership.organizationName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {me.fullName} · {roleLabel(membership.role)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {me.memberships.length > 1 ? (
                <label className="text-sm">
                  <span className="sr-only">Organisation</span>
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

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-navy-950/15 px-4 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-navy-950/5"
              >
                Se déconnecter
              </button>
            </div>
          </div>

          <nav aria-label="Sections du portail" className="mt-6">
            <ul className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <li key={tab.key}>
                  <a
                    href={tab.key === "dashboard" ? "/portail" : `/portail/${tabPath(tab.key)}`}
                    aria-current={active === tab.key ? "page" : undefined}
                    className={clsx(
                      "inline-block whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors duration-fast",
                      active === tab.key
                        ? "bg-petrol-100 text-navy-950"
                        : "text-slate-600 hover:bg-navy-950/5",
                    )}
                  >
                    {tab.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="container-page py-10">
        {children({ me, organizationId, canInvite: membership.role === "ORG_ADMIN" })}
      </div>
    </div>
  );
}

function tabPath(tab: PortalTab) {
  if (tab === "contracts") return "contrats";
  if (tab === "reports") return "rapports";
  return "membres";
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
