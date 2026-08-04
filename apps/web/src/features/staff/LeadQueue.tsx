"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import type { MeResponse } from "@sanarys/schemas";
import { authApi, AuthError, type StaffLead } from "@/lib/auth-api";
import { Button } from "@/components/ui/Button";

/**
 * File de leads du personnel SANARYS.
 *
 * Le CRM etant mocke dans ce build, cette vue est la garantie qu'une demande
 * d'audit soumise depuis le site public atterrit quelque part de consultable
 * et d'actionnable.
 */

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nouveau",
  QUALIFIED: "Qualifié",
  CONTACTED: "Contacté",
  AUDIT_REQUESTED: "Audit demandé",
  PROPOSAL_SENT: "Proposition envoyée",
  CLOSED_WON: "Gagné",
  CLOSED_LOST: "Perdu",
};

const STATUS_FLOW = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "AUDIT_REQUESTED",
  "PROPOSAL_SENT",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-danger/12 text-danger",
  MEDIUM: "bg-warning/12 text-warning",
  LOW: "bg-navy-950/8 text-slate-600",
};

export function LeadQueue() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [leads, setLeads] = useState<StaffLead[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    const response = await authApi.staffLeads(status ? { status } : {});
    setLeads(response.items);
    setTotal(response.total);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const profile = await authApi.me();
        if (!profile.staffRole) {
          setState("denied");
          return;
        }
        setMe(profile);
        await load(statusFilter);
        setState("ready");
      } catch (error) {
        if (error instanceof AuthError && error.status === 401) {
          router.replace("/connexion");
          return;
        }
        setState("denied");
      }
    })();
  }, [router, load, statusFilter]);

  async function advance(lead: StaffLead, status: string) {
    setBusyId(lead.id);
    try {
      await authApi.updateLead(lead.id, { status, ownerRef: me?.fullName ?? undefined });
      await load(statusFilter);
    } finally {
      setBusyId(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="container-page py-20 text-center" aria-live="polite">
        <p className="text-slate-600">Chargement de la file commerciale…</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-lg rounded-lg border border-warning/30 bg-warning/10 p-8 text-center">
          <h1 className="font-heading text-xl font-bold text-navy-950">Accès réservé</h1>
          <p className="mt-3 leading-relaxed text-slate-600">
            Cette file est réservée au personnel commercial SANARYS.
          </p>
        </div>
      </div>
    );
  }

  const overdue = leads.filter(
    (lead) => lead.nextActionAt && new Date(lead.nextActionAt) < new Date(),
  ).length;

  return (
    <div className="bg-mist-50">
      <div className="border-b border-navy-950/8 bg-mist-white">
        <div className="container-page py-6">
          <p className="eyebrow">Console commerciale</p>
          <h1 className="mt-1.5 font-heading text-2xl font-bold text-navy-950">File de leads</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} lead{total > 1 ? "s" : ""} au total
            {overdue > 0 ? ` · ${overdue} en retard de prise en charge` : ""}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip label="Tous" active={statusFilter === ""} onClick={() => setStatusFilter("")} />
            {STATUS_FLOW.slice(0, 5).map((status) => (
              <FilterChip
                key={status}
                label={STATUS_LABELS[status]!}
                active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        {leads.length === 0 ? (
          <div className="rounded-lg border border-navy-950/10 bg-mist-white p-10 text-center">
            <h2 className="font-heading text-lg font-bold text-navy-950">Aucun lead</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Les demandes soumises depuis le site public — simulateur, formulaire de contact ou
              demande d&apos;audit — apparaîtront ici immédiatement.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {leads.map((lead) => {
              const isOverdue = lead.nextActionAt && new Date(lead.nextActionAt) < new Date();
              return (
                <li key={lead.id} className="surface-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-lg font-bold text-navy-950">
                          {lead.companyName}
                        </h2>
                        <span
                          className={clsx(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold",
                            PRIORITY_STYLES[lead.priority],
                          )}
                        >
                          {lead.priority === "HIGH"
                            ? "Priorité haute"
                            : lead.priority === "MEDIUM"
                              ? "Priorité moyenne"
                              : "Priorité basse"}
                        </span>
                        {isOverdue ? (
                          <span className="rounded-full bg-danger/12 px-2.5 py-0.5 text-xs font-bold text-danger">
                            En retard
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1.5 text-sm text-slate-600">
                        {lead.contactName}
                        {lead.source ? ` · via ${lead.source}` : ""}
                        {lead.zoneName ? ` · ${lead.zoneName}` : ""}
                      </p>

                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div className="flex gap-1.5">
                          <dt className="text-slate-600">Email :</dt>
                          <dd>
                            <a href={`mailto:${lead.contactEmail}`} className="link-underline">
                              {lead.contactEmail}
                            </a>
                          </dd>
                        </div>
                        {lead.contactPhone ? (
                          <div className="flex gap-1.5">
                            <dt className="text-slate-600">Téléphone :</dt>
                            <dd>{lead.contactPhone}</dd>
                          </div>
                        ) : null}
                        <div className="flex gap-1.5">
                          <dt className="text-slate-600">Score :</dt>
                          <dd className="font-semibold">{lead.score ?? "—"}</dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {lead.hasSimulation ? (
                          <span className="rounded-full bg-petrol-100 px-2.5 py-1 font-medium text-navy-950">
                            Simulation complétée
                          </span>
                        ) : null}
                        {lead.auditRequestCount > 0 ? (
                          <span className="rounded-full bg-copper-500/12 px-2.5 py-1 font-medium text-copper-500">
                            {lead.auditRequestCount} demande
                            {lead.auditRequestCount > 1 ? "s" : ""} d&apos;audit
                          </span>
                        ) : null}
                        <span className="rounded-full bg-navy-950/6 px-2.5 py-1 text-slate-600">
                          CRM : {lead.crmSyncStatus === "MOCK_SYNCED" ? "simulé" : lead.crmSyncStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-navy-950/6 px-3 py-1 text-sm font-semibold text-navy-950">
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      <span className="text-xs text-slate-600">
                        Reçu le {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      {lead.ownerRef ? (
                        <span className="text-xs text-slate-600">Suivi par {lead.ownerRef}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-navy-950/8 pt-4">
                    {nextStatuses(lead.status).map((status) => (
                      <Button
                        key={status}
                        variant="secondary"
                        onClick={() => advance(lead, status)}
                        disabled={busyId === lead.id}
                      >
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Prochaines transitions raisonnables depuis un statut donne. */
function nextStatuses(current: string): string[] {
  const index = STATUS_FLOW.indexOf(current as (typeof STATUS_FLOW)[number]);
  if (index === -1 || current === "CLOSED_WON" || current === "CLOSED_LOST") return [];
  const next = STATUS_FLOW.slice(index + 1, index + 3).filter((s) => s !== "CLOSED_LOST");
  return [...next, "CLOSED_LOST"];
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-fast",
        active ? "bg-navy-950 text-mist-white" : "bg-navy-950/6 text-slate-600 hover:bg-navy-950/10",
      )}
    >
      {label}
    </button>
  );
}
