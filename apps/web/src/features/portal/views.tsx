"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { ContractDto, OrganizationDto, ReportDto } from "@/lib/auth-api";
import { authApi } from "@/lib/auth-api";

const MODULE_LABELS: Record<string, string> = {
  AMBULANCE: "Ambulance dédiée",
  INFIRMIER: "Infirmier(ère)",
  MEDECIN: "Médecin",
  INFIRMERIE: "Infirmerie centrale",
};

const KPI_LABELS: Record<string, { label: string; format: (value: number) => string; hint: string }> = {
  interventionCount: {
    label: "Interventions",
    format: (value) => String(value),
    hint: "Nombre total d'interventions du dispositif sur la période, toutes entreprises membres confondues.",
  },
  availabilityRate: {
    label: "Disponibilité",
    format: (value) => `${(value * 100).toFixed(1)} %`,
    hint: "Part des heures d'activité durant lesquelles le dispositif contractualisé était effectivement opérationnel.",
  },
  avgResponseTimeMinutes: {
    label: "Délai moyen d'intervention",
    format: (value) => `${value.toFixed(1)} min`,
    hint: "Moyenne des délais entre l'appel et l'arrivée sur site, mesurée sur la période.",
  },
  trainingSessionsHeld: {
    label: "Sessions de formation",
    format: (value) => String(value),
    hint: "Sessions de formation aux gestes de secours animées sur la période.",
  },
};

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Ces informations n'ont pas pu être chargées.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

function Panel({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <p className="rounded-lg border border-navy-950/8 bg-mist-white p-8 text-center text-slate-600" aria-live="polite">
        Chargement…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-navy-950">
        {error}
      </p>
    );
  }
  if (empty) return null;
  return <>{children}</>;
}

// --- Tableau de bord -------------------------------------------------------

export function DashboardView({ organizationId }: { organizationId: string }) {
  const org = useAsync<OrganizationDto>(() => authApi.organization(organizationId), [organizationId]);
  const contracts = useAsync<ContractDto[]>(() => authApi.contracts(organizationId), [organizationId]);
  const reports = useAsync<ReportDto[]>(() => authApi.reports(organizationId), [organizationId]);

  const activeContract = contracts.data?.find((c) => c.status === "ACTIVE") ?? null;
  const latestReport = reports.data?.[0] ?? null;

  return (
    <div className="space-y-8">
      <Panel loading={org.loading} error={org.error}>
        {org.data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Organisation" value={org.data.name} hint={typeLabel(org.data.type)} />
            <Stat
              label="Entreprises membres"
              value={String(org.data.memberCount)}
              hint={org.data.industrialZoneName ?? "Zone non renseignée"}
            />
            <Stat
              label="Modules actifs"
              value={activeContract ? String(activeContract.modules.length) : "—"}
              hint={
                activeContract
                  ? activeContract.modules.map((m) => MODULE_LABELS[m] ?? m).join(" · ")
                  : "Aucun contrat actif"
              }
            />
          </div>
        ) : null}
      </Panel>

      <section>
        <h2 className="font-heading text-lg font-bold text-navy-950">
          Dernier rapport mensuel publié
        </h2>
        <Panel loading={reports.loading} error={reports.error}>
          {latestReport ? (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Période {formatPeriod(latestReport.period)}
                {latestReport.publishedAt
                  ? ` · publié le ${new Date(latestReport.publishedAt).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
              <KpiGrid kpi={latestReport.kpi} />
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-navy-950/10 bg-mist-white p-8 text-center">
              <p className="font-heading font-semibold text-navy-950">
                Aucun rapport publié pour le moment
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Le premier rapport mensuel est publié dans les cinq jours ouvrés suivant la fin du
                premier mois complet d&apos;exploitation.
              </p>
            </div>
          )}
        </Panel>
      </section>

      <div className="rounded-lg border-s-4 border-petrol-600 bg-mist-white p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          Les indicateurs présentés sont <strong className="text-navy-950">agrégés</strong> : ils ne
          contiennent aucune information permettant d&apos;identifier un salarié, ni aucun élément de
          dossier de soins.
        </p>
      </div>
    </div>
  );
}

// --- Contrats --------------------------------------------------------------

export function ContractsView({ organizationId }: { organizationId: string }) {
  const contracts = useAsync<ContractDto[]>(() => authApi.contracts(organizationId), [organizationId]);

  return (
    <Panel loading={contracts.loading} error={contracts.error}>
      {contracts.data && contracts.data.length > 0 ? (
        <ul className="space-y-5">
          {contracts.data.map((contract) => (
            <li key={contract.id} className="surface-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-bold text-navy-950">{contract.label}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Du {new Date(contract.startDate).toLocaleDateString("fr-FR")}
                    {contract.endDate
                      ? ` au ${new Date(contract.endDate).toLocaleDateString("fr-FR")}`
                      : " · sans échéance définie"}
                  </p>
                </div>
                <StatusBadge status={contract.status} />
              </div>

              <div className="mt-5">
                <h3 className="font-heading text-sm font-bold text-navy-950">Modules contractés</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {contract.modules.map((module) => (
                    <li
                      key={module}
                      className="rounded-full bg-petrol-100 px-3 py-1 text-sm font-medium text-navy-950"
                    >
                      {MODULE_LABELS[module] ?? module}
                    </li>
                  ))}
                </ul>
              </div>

              {contract.parties.length > 0 ? (
                <div className="mt-6">
                  <h3 className="font-heading text-sm font-bold text-navy-950">
                    Répartition entre membres
                  </h3>
                  <ul className="mt-2 divide-y divide-navy-950/8 border-y border-navy-950/8">
                    {contract.parties.map((party) => (
                      <li
                        key={party.organizationId}
                        className="flex items-center justify-between gap-4 py-2.5 text-sm"
                      >
                        <span>{party.organizationName}</span>
                        <span className="font-heading font-bold text-copper-500">
                          {party.sharePercent !== null ? `${party.sharePercent} %` : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    Part de la clé de répartition, hors montants.
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Aucun contrat visible"
          message="Aucun contrat n'est rattaché à cette organisation pour le moment. Votre convention-cadre apparaîtra ici dès sa signature."
        />
      )}
    </Panel>
  );
}

// --- Rapports --------------------------------------------------------------

export function ReportsView({ organizationId }: { organizationId: string }) {
  const reports = useAsync<ReportDto[]>(() => authApi.reports(organizationId), [organizationId]);

  return (
    <Panel loading={reports.loading} error={reports.error}>
      {reports.data && reports.data.length > 0 ? (
        <ul className="space-y-5">
          {reports.data.map((report) => (
            <li key={report.id} className="surface-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-bold text-navy-950">
                  {formatPeriod(report.period)}
                </h2>
                {report.publishedAt ? (
                  <span className="text-sm text-slate-600">
                    Publié le {new Date(report.publishedAt).toLocaleDateString("fr-FR")}
                  </span>
                ) : null}
              </div>
              <KpiGrid kpi={report.kpi} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Aucun rapport publié"
          message="Les rapports mensuels agrégés apparaîtront ici, dans les cinq jours ouvrés suivant la fin de chaque mois d'exploitation."
        />
      )}
    </Panel>
  );
}

// --- Composants partagés ---------------------------------------------------

function KpiGrid({ kpi }: { kpi: Record<string, number | string | boolean> }) {
  const entries = Object.entries(kpi).filter(([key]) => KPI_LABELS[key]);
  if (entries.length === 0) {
    return <p className="mt-4 text-sm text-slate-600">Aucun indicateur disponible sur cette période.</p>;
  }

  return (
    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map(([key, value]) => {
        const meta = KPI_LABELS[key]!;
        return (
          <div key={key} className="rounded-lg bg-mist-50 p-4">
            <dt className="font-heading text-sm font-semibold text-navy-950" title={meta.hint}>
              {meta.label}
            </dt>
            <dd className="mt-1 font-heading text-2xl font-extrabold text-petrol-600">
              {typeof value === "number" ? meta.format(value) : String(value)}
            </dd>
            <dd className="mt-1 text-xs leading-relaxed text-slate-600">{meta.hint}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card p-5">
      <p className="font-heading text-xs font-bold uppercase tracking-wider text-petrol-600">
        {label}
      </p>
      <p className="mt-1.5 font-heading text-xl font-bold text-navy-950">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, { text: string; className: string }> = {
    ACTIVE: { text: "Actif", className: "bg-success/12 text-success" },
    DRAFT: { text: "Brouillon", className: "bg-navy-950/8 text-slate-600" },
    EXPIRED: { text: "Échu", className: "bg-warning/12 text-warning" },
    TERMINATED: { text: "Résilié", className: "bg-danger/12 text-danger" },
  };
  const meta = labels[status] ?? { text: status, className: "bg-navy-950/8 text-slate-600" };
  return (
    <span className={clsx("rounded-full px-3 py-1 text-sm font-semibold", meta.className)}>
      {meta.text}
    </span>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-navy-950/10 bg-mist-white p-10 text-center">
      <h2 className="font-heading text-lg font-bold text-navy-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{message}</p>
    </div>
  );
}

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    GROUPEMENT: "Groupement de PME",
    COMPANY: "Entreprise",
    ZONE_MANAGER: "Gestionnaire de zone",
  };
  return labels[type] ?? type;
}
