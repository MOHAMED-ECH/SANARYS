"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { ContractDto, DocumentDto, OrganizationDto, ReportDto } from "@/lib/auth-api";
import { authApi } from "@/lib/auth-api";
import { IconContract, IconDownload, IconTrendDown, IconTrendUp } from "@/components/ui/icons";
import {
  Sparkline,
  TrendChart,
  computeTrend,
  formatPeriodLong,
  type Direction,
  type Point,
} from "./charts";

const MODULE_LABELS: Record<string, string> = {
  AMBULANCE: "Ambulance dédiée",
  INFIRMIER: "Infirmier(ère)",
  MEDECIN: "Médecin",
  INFIRMERIE: "Infirmerie centrale",
};

const KPI_LABELS: Record<
  string,
  {
    label: string;
    format: (value: number) => string;
    hint: string;
    /**
     * Sens dans lequel une hausse est une bonne nouvelle.
     *
     * Sans cette information, un nombre d'interventions en hausse s'afficherait
     * en vert et laisserait croire a une amelioration, alors qu'il signale
     * simplement plus d'accidents. Ce compteur est donc neutre.
     */
    direction: Direction;
  }
> = {
  interventionCount: {
    label: "Interventions",
    format: (value) => String(value),
    hint: "Nombre total d'interventions du dispositif sur la période, toutes entreprises membres confondues.",
    direction: "neutral",
  },
  availabilityRate: {
    label: "Disponibilité",
    format: (value) => `${(value * 100).toFixed(1)} %`,
    hint: "Part des heures d'activité durant lesquelles le dispositif contractualisé était effectivement opérationnel.",
    direction: "higher",
  },
  avgResponseTimeMinutes: {
    label: "Délai moyen d'intervention",
    format: (value) => `${value.toFixed(1)} min`,
    hint: "Moyenne des délais entre l'appel et l'arrivée sur site, mesurée sur la période.",
    direction: "lower",
  },
  trainingSessionsHeld: {
    label: "Sessions de formation",
    format: (value) => String(value),
    hint: "Sessions de formation aux gestes de secours animées sur la période.",
    direction: "higher",
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
  empty?: boolean | undefined;
  emptyMessage?: string | undefined;
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
  // L'API rend les rapports du plus recent au plus ancien ; les courbes se
  // lisent dans l'autre sens.
  const chronologie = [...(reports.data ?? [])].reverse();
  const dernier = chronologie[chronologie.length - 1] ?? null;

  return (
    <div className="space-y-10">
      <section aria-labelledby="titre-dispositif">
        <h2 id="titre-dispositif" className="sr-only">
          Votre dispositif
        </h2>
        <Panel loading={org.loading} error={org.error}>
          {org.data ? (
            <div className="grid gap-4 sm:grid-cols-3">
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
              <Stat
                label="Rapports publiés"
                value={String(chronologie.length)}
                hint={
                  dernier ? `Dernier : ${formatPeriodLong(dernier.period)}` : "Aucun à ce jour"
                }
              />
            </div>
          ) : null}
        </Panel>
      </section>

      <section aria-labelledby="titre-indicateurs">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="titre-indicateurs" className="font-heading text-lg font-bold text-navy-950">
            Indicateurs du dispositif
          </h2>
          {dernier ? (
            <p className="text-sm text-slate-600">
              Période {formatPeriodLong(dernier.period)}
              {chronologie.length > 1 ? `, comparée au mois précédent` : ""}
            </p>
          ) : null}
        </div>

        <Panel loading={reports.loading} error={reports.error}>
          {dernier ? (
            <TrendGrid history={chronologie} />
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Aucun rapport publié pour le moment"
                message="Le premier rapport mensuel est publié dans les cinq jours ouvrés suivant la fin du premier mois complet d'exploitation."
              />
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

/**
 * Les quatre indicateurs, chacun avec sa variation et sa courbe sur douze mois.
 */
function TrendGrid({ history }: { history: readonly ReportDto[] }) {
  const dernier = history[history.length - 1]!;
  const cles = Object.keys(dernier.kpi).filter((cle) => KPI_LABELS[cle]);

  if (cles.length === 0) {
    return <p className="mt-4 text-sm text-slate-600">Aucun indicateur disponible sur cette période.</p>;
  }

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cles.map((cle) => {
        const meta = KPI_LABELS[cle]!;
        const points: Point[] = history
          .filter((r) => typeof r.kpi[cle] === "number")
          .map((r) => ({ period: r.period, value: r.kpi[cle] as number }));
        const valeur = points[points.length - 1]?.value;

        return (
          <KpiCard
            key={cle}
            label={meta.label}
            hint={meta.hint}
            value={valeur === undefined ? "—" : meta.format(valeur)}
            points={points}
            direction={meta.direction}
            format={meta.format}
          />
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  hint,
  value,
  points,
  direction,
  format,
}: {
  label: string;
  hint: string;
  value: string;
  points: readonly Point[];
  direction: Direction;
  format: (value: number) => string;
}) {
  const trend = computeTrend(points, direction, format);

  return (
    <article className="flex flex-col rounded-lg border border-navy-950/8 bg-mist-white p-5">
      <h3 className="font-heading text-sm font-semibold text-navy-950">{label}</h3>
      <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-navy-950">
        {value}
      </p>

      {trend ? (
        // Fleche + signe + libelle : la couleur ne fait que confirmer une
        // information deja lisible sans elle. Rouge et vert sont quasi
        // indiscernables en deuteranopie.
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <TrendIcon sentiment={trend.sentiment} label={trend.deltaLabel} />
          <span className="font-medium text-navy-950">{trend.deltaLabel}</span>
          <span className="text-slate-400">vs mois précédent</span>
        </p>
      ) : null}

      <div className="mt-4">
        <Sparkline points={points} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">{hint}</p>
    </article>
  );
}

function TrendIcon({
  sentiment,
  label,
}: {
  sentiment: "good" | "bad" | "neutral";
  label: string;
}) {
  const monte = label.startsWith("+");
  const teinte =
    sentiment === "good" ? "text-success" : sentiment === "bad" ? "text-danger" : "text-slate-400";

  if (label === "stable") {
    return <span aria-hidden="true" className="text-slate-400">→</span>;
  }
  return monte ? <IconTrendUp className={teinte} /> : <IconTrendDown className={teinte} />;
}


// --- Contrats --------------------------------------------------------------

export function ContractsView({ organizationId }: { organizationId: string }) {
  const contracts = useAsync<ContractDto[]>(() => authApi.contracts(organizationId), [organizationId]);
  const documents = useAsync<DocumentDto[]>(() => authApi.documents(organizationId), [organizationId]);

  return (
    <div className="space-y-10">
      <DocumentsPanel documents={documents} />
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
    </div>
  );
}

/**
 * Pieces telechargeables de l'organisation.
 *
 * Le telechargement passe par une ancre et non par un fetch : le navigateur
 * gere alors l'enregistrement, le nom de fichier propose par l'API et la
 * progression. Chaque acces est journalise nominativement cote serveur — c'est
 * dit ici, parce qu'un client a le droit de le savoir.
 */
function DocumentsPanel({
  documents,
}: {
  documents: { data: DocumentDto[] | null; error: string | null; loading: boolean };
}) {
  return (
    <section aria-labelledby="titre-documents">
      <h2 id="titre-documents" className="font-heading text-lg font-bold text-navy-950">
        Documents
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Les pièces contractuelles de votre organisation. Chaque téléchargement est journalisé.
      </p>

      <Panel loading={documents.loading} error={documents.error}>
        {documents.data && documents.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-navy-950/8 overflow-hidden rounded-lg border border-navy-950/8 bg-mist-white">
            {documents.data.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center gap-4 p-4">
                <IconContract className="text-petrol-600" />
                <span className="min-w-0 flex-1">
                  <span className="block font-heading font-semibold text-navy-950">
                    {document.label}
                  </span>
                  <span className="block text-sm text-slate-400">
                    Déposé le {new Date(document.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                    {document.mimeType === "application/pdf" ? "PDF" : document.mimeType}
                  </span>
                </span>
                <a
                  href={authApi.documentUrl(document.id)}
                  download
                  className="inline-flex items-center gap-2 rounded-md border border-petrol-600/30 px-4 py-2 text-sm font-semibold text-petrol-600 transition-colors hover:bg-petrol-100"
                >
                  <IconDownload />
                  Télécharger
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Aucun document disponible"
              message="Votre convention-cadre et vos pièces contractuelles apparaîtront ici dès leur dépôt par SANARYS."
            />
          </div>
        )}
      </Panel>
    </section>
  );
}

// --- Rapports --------------------------------------------------------------

export function ReportsView({ organizationId }: { organizationId: string }) {
  const reports = useAsync<ReportDto[]>(() => authApi.reports(organizationId), [organizationId]);
  const [indicateur, setIndicateur] = useState<string>("availabilityRate");

  // Du plus ancien au plus recent : c'est le sens de lecture d'une courbe.
  const chronologie = [...(reports.data ?? [])].reverse();
  const meta = KPI_LABELS[indicateur];

  const points: Point[] = chronologie
    .filter((r) => typeof r.kpi[indicateur] === "number")
    .map((r) => ({ period: r.period, value: r.kpi[indicateur] as number }));

  return (
    <Panel loading={reports.loading} error={reports.error}>
      {reports.data && reports.data.length > 0 && meta ? (
        <div className="space-y-10">
          <section className="surface-card p-6" aria-labelledby="titre-evolution">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 id="titre-evolution" className="font-heading text-lg font-bold text-navy-950">
                  Évolution — {meta.label}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {points.length} période{points.length > 1 ? "s" : ""} publiée
                  {points.length > 1 ? "s" : ""}. Survolez la courbe pour lire une valeur.
                </p>
              </div>

              {/* Un seul indicateur a la fois : superposer des mesures d'echelles
                  differentes sur deux axes rendrait la lecture trompeuse. */}
              <label className="text-sm">
                <span className="sr-only">Indicateur affiché</span>
                <select
                  value={indicateur}
                  onChange={(event) => setIndicateur(event.target.value)}
                  className="rounded-md border border-navy-950/15 bg-mist-white px-3 py-2 text-sm text-navy-950"
                >
                  {Object.entries(KPI_LABELS).map(([cle, valeur]) => (
                    <option key={cle} value={cle}>
                      {valeur.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <TrendChart points={points} format={meta.format} label={meta.label} />
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{meta.hint}</p>
          </section>

          <section aria-labelledby="titre-historique">
            <h2 id="titre-historique" className="font-heading text-lg font-bold text-navy-950">
              Historique mensuel
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Les valeurs exactes de chaque période. C&apos;est aussi la version lisible de la
              courbe ci-dessus.
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-navy-950/8 bg-mist-white">
              <table className="w-full min-w-[42rem] text-sm">
                <caption className="sr-only">
                  Indicateurs mensuels agrégés, de la période la plus récente à la plus ancienne
                </caption>
                <thead>
                  <tr className="border-b border-navy-950/8 text-start">
                    <th scope="col" className="px-5 py-3 text-start font-heading font-semibold text-navy-950">
                      Période
                    </th>
                    {Object.values(KPI_LABELS).map((valeur) => (
                      <th
                        key={valeur.label}
                        scope="col"
                        className="px-5 py-3 text-end font-heading font-semibold text-navy-950"
                      >
                        {valeur.label}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3 text-end font-heading font-semibold text-navy-950">
                      Publié le
                    </th>
                    <th scope="col" className="px-5 py-3 text-end font-heading font-semibold text-navy-950">
                      <span className="sr-only">Télécharger</span>
                      PDF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.data.map((report) => (
                    <tr key={report.id} className="border-b border-navy-950/5 last:border-0">
                      <th scope="row" className="px-5 py-3 text-start font-medium text-navy-950">
                        {formatPeriodLong(report.period)}
                      </th>
                      {Object.entries(KPI_LABELS).map(([cle, valeur]) => {
                        const brut = report.kpi[cle];
                        return (
                          <td key={cle} className="px-5 py-3 text-end tabular-nums text-slate-600">
                            {typeof brut === "number" ? valeur.format(brut) : "—"}
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-end text-slate-400">
                        {report.publishedAt
                          ? new Date(report.publishedAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-end">
                        <a
                          href={authApi.reportPdfUrl(organizationId, report.period)}
                          download
                          className="inline-flex items-center gap-1.5 font-semibold text-petrol-600 hover:underline"
                        >
                          <IconDownload />
                          <span className="sr-only">
                            Rapport de {formatPeriodLong(report.period)} au format PDF
                          </span>
                          <span aria-hidden="true">PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
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
