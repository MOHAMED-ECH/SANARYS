"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { color } from "@sanarys/design-tokens";

/**
 * Visualisations du portail.
 *
 * Une seule serie par graphique : pas de palette categorielle, donc pas de
 * question de distinction de teintes. Le trait porte la couleur operationnelle
 * (petrol), le texte reste en encre — jamais colore par la donnee.
 *
 * Le sens d'une variation n'est JAMAIS porte par la couleur seule. Rouge et
 * vert sont a peine separables en deuteranopie (ecart mesure de 5,0 la ou il
 * en faudrait 8) : chaque tendance affiche donc une fleche, un signe et un
 * libelle en toutes lettres. La couleur ne fait que confirmer.
 */

export interface Point {
  /** Periode « AAAA-MM ». */
  readonly period: string;
  readonly value: number;
}

/** Sens dans lequel une hausse est une bonne nouvelle. */
export type Direction = "higher" | "lower" | "neutral";

const GRAPH = {
  line: color.petrol[600],
  area: color.petrol[500],
  grid: color.navy[950],
} as const;

/** Coordonnees normalisees d'une serie dans une boite donnee. */
function project(points: readonly Point[], width: number, height: number, pad = 0) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Une serie plate ne doit pas diviser par zero, ni s'ecraser sur un bord.
  const span = max - min || Math.abs(max) || 1;
  const usable = height - pad * 2;

  return points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : (index / (points.length - 1)) * width,
    y: pad + usable - ((point.value - min) / span) * usable,
  }));
}

/**
 * Courbe miniature, dans une carte d'indicateur.
 *
 * Decorative au sens strict : elle donne la forme, pas les valeurs. Celles-ci
 * sont lisibles en clair dans la carte qui la contient et dans le tableau de
 * la page rapports — la courbe n'est donc jamais le seul acces a la donnee.
 */
export function Sparkline({ points, className }: { points: readonly Point[]; className?: string }) {
  const gradientId = useId();
  if (points.length < 2) return null;

  const W = 120;
  const H = 32;
  const projected = project(points, W, H, 3);
  const trace = projected.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={clsx("h-8 w-full", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GRAPH.area} stopOpacity="0.18" />
          <stop offset="100%" stopColor={GRAPH.area} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${trace} ${W},${H}`} fill={`url(#${gradientId})`} />
      <polyline
        points={trace}
        fill="none"
        stroke={GRAPH.line}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Pas de marqueur de fin : le trace est etire horizontalement pour
          remplir la carte, ce qui transformerait un cercle en ovale. La valeur
          courante est de toute facon affichee en grand juste au-dessus. */}
    </svg>
  );
}

/**
 * Courbe d'evolution, avec survol.
 *
 * Un graphique HTML est interactif par nature : le survol affiche la periode
 * et la valeur exacte, ce qui evite d'etiqueter chaque point.
 */
export function TrendChart({
  points,
  format,
  label,
}: {
  points: readonly Point[];
  format: (value: number) => string;
  /** Nomme la serie : avec une seule serie, il tient lieu de legende. */
  label: string;
}) {
  const gradientId = useId();
  const [survole, setSurvole] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-slate-600">
        Une seule période disponible : l&apos;évolution apparaîtra dès le rapport suivant.
      </p>
    );
  }

  const W = 720;
  const H = 220;
  const PAD = 14;
  const projected = project(points, W, H, PAD);
  const trace = projected.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const actif = survole === null ? null : projected[survole];

  const valeurs = points.map((p) => p.value);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);

  return (
    <figure className="mt-6">
      <div className="relative">
        {/* Le trace s'etire librement pour occuper toute la carte : a echelle
            uniforme il flotterait au centre avec du vide de chaque cote. Les
            traits gardent leur epaisseur grace a vectorEffect, et les elements
            ronds (point survole) sont poses en HTML par-dessus plutot qu'en
            SVG, ou l'etirement les transformerait en ovales. */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${label} — évolution sur ${points.length} mois, de ${formatPeriodShort(points[0]!.period)} à ${formatPeriodShort(points[points.length - 1]!.period)}. Les valeurs exactes figurent dans le tableau ci-dessous.`}
          onMouseLeave={() => setSurvole(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GRAPH.area} stopOpacity="0.16" />
              <stop offset="100%" stopColor={GRAPH.area} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grille discrete : trois reperes horizontaux, rien de plus. */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={PAD + (H - PAD * 2) * f}
              y2={PAD + (H - PAD * 2) * f}
              stroke={GRAPH.grid}
              strokeOpacity="0.07"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <polygon points={`0,${H} ${trace} ${W},${H}`} fill={`url(#${gradientId})`} />
          <polyline
            points={trace}
            fill="none"
            stroke={GRAPH.line}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {actif ? (
            <line
              x1={actif.x}
              x2={actif.x}
              y1={PAD}
              y2={H - PAD}
              stroke={GRAPH.line}
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {/* Zones de survol larges : viser un trait de 2px serait injouable. */}
          {projected.map((p, index) => (
            <rect
              key={p.period}
              x={index === 0 ? 0 : p.x - W / (points.length - 1) / 2}
              y="0"
              width={W / (points.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setSurvole(index)}
            />
          ))}
        </svg>

        {/* Bornes de l'echelle : sans elles, la courbe ne dit rien de l'ordre
            de grandeur. Deux reperes suffisent, le detail est dans le tableau. */}
        <span className="pointer-events-none absolute start-0 top-0 text-xs tabular-nums text-slate-400">
          {format(max)}
        </span>
        <span className="pointer-events-none absolute bottom-0 start-0 text-xs tabular-nums text-slate-400">
          {format(min)}
        </span>

        {actif ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-mist-white bg-petrol-600"
              style={{ left: `${(actif.x / W) * 100}%`, top: `${(actif.y / H) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md bg-navy-950 px-3 py-1.5 text-xs text-mist-white shadow-lg"
              style={{ left: `${(actif.x / W) * 100}%`, top: `${(actif.y / H) * 100}%` }}
            >
              <span className="block font-semibold">{format(actif.value)}</span>
              <span className="block text-mist-50/70">{formatPeriodShort(actif.period)}</span>
            </div>
          </>
        ) : null}
      </div>

      <figcaption className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{formatPeriodShort(points[0]!.period)}</span>
        <span>{formatPeriodShort(points[points.length - 1]!.period)}</span>
      </figcaption>
    </figure>
  );
}

export interface Trend {
  readonly deltaLabel: string;
  readonly sentiment: "good" | "bad" | "neutral";
}

/**
 * Compare la derniere periode a la precedente.
 *
 * `direction` dit dans quel sens une hausse est une bonne nouvelle. C'est la
 * nuance qui evite l'erreur classique : un nombre d'interventions en hausse
 * affiche en vert laisserait croire a une amelioration, alors qu'il signale
 * simplement plus d'accidents. Ce compteur est donc neutre.
 */
export function computeTrend(
  points: readonly Point[],
  direction: Direction,
  format: (value: number) => string,
): Trend | null {
  if (points.length < 2) return null;

  const actuel = points[points.length - 1]!.value;
  const precedent = points[points.length - 2]!.value;
  const ecart = actuel - precedent;

  if (Math.abs(ecart) < 1e-9) {
    return { deltaLabel: "stable", sentiment: "neutral" };
  }

  const signe = ecart > 0 ? "+" : "−";
  const deltaLabel = `${signe}${format(Math.abs(ecart))}`;

  if (direction === "neutral") return { deltaLabel, sentiment: "neutral" };
  const favorable = direction === "higher" ? ecart > 0 : ecart < 0;
  return { deltaLabel, sentiment: favorable ? "good" : "bad" };
}

export function formatPeriodShort(period: string): string {
  const [annee, mois] = period.split("-").map(Number);
  if (!annee || !mois) return period;
  return new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function formatPeriodLong(period: string): string {
  const [annee, mois] = period.split("-").map(Number);
  if (!annee || !mois) return period;
  return new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
