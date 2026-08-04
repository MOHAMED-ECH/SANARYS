"use client";

import { useState } from "react";
import clsx from "clsx";
import type { IndustrialZoneDto } from "@sanarys/schemas";

/**
 * Carte schematique des zones referencees.
 *
 * Choix assume : il s'agit d'une representation SCHEMATIQUE, sans fond
 * cartographique ni calcul d'itineraire. Elle ne depend d'aucun fournisseur
 * de tuiles externe, fonctionne hors ligne et ne transmet aucune donnee de
 * navigation a un tiers. Une carte routee reelle (fournisseur, cache,
 * attribution, strategie de repli) releve d'un lot ulterieur.
 *
 * Accessibilite : la carte est purement illustrative (aria-hidden) et la
 * liste ci-contre porte l'information. Aucune interaction n'est exclusive
 * a la carte.
 */

// Bornes approximatives du Maroc utile (zones industrielles du littoral atlantique et du nord).
const BOUNDS = { minLat: 32.6, maxLat: 36.0, minLng: -8.4, maxLng: -5.0 };

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { x, y };
}

export function ZonesMap({ zones }: { zones: IndustrialZoneDto[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const located = zones.filter((zone) => zone.lat !== null && zone.lng !== null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
      {/* Liste : source d'information principale, accessible au clavier. */}
      <div>
        <h3 className="font-heading text-lg font-bold text-navy-950">Zones référencées</h3>
        <p className="mt-1 text-sm text-slate-600">
          {zones.length} zone{zones.length > 1 ? "s" : ""} au référentiel. Les zones pilotes sont
          prioritaires pour un premier déploiement.
        </p>

        <ul className="mt-5 divide-y divide-navy-950/8 border-y border-navy-950/8">
          {zones.map((zone) => (
            <li key={zone.id}>
              <button
                type="button"
                onMouseEnter={() => setSelected(zone.id)}
                onFocus={() => setSelected(zone.id)}
                onMouseLeave={() => setSelected(null)}
                onBlur={() => setSelected(null)}
                className={clsx(
                  "flex w-full items-center justify-between gap-4 px-2 py-4 text-start transition-colors duration-fast",
                  selected === zone.id && "bg-petrol-100/50",
                )}
              >
                <span>
                  <span className="block font-heading font-semibold text-navy-950">{zone.name}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">
                    {zone.city}
                    {zone.region ? ` · ${zone.region}` : ""}
                  </span>
                </span>
                {zone.isPilot ? (
                  <span className="shrink-0 rounded-full bg-copper-500/12 px-3 py-1 text-xs font-semibold text-copper-500">
                    Zone pilote
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-slate-600/70">Éligible</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {zones.length === 0 ? (
          <p className="mt-5 rounded-md border border-navy-950/10 bg-mist-50 p-5 text-sm leading-relaxed">
            Le référentiel des zones n&apos;est pas accessible pour le moment. Vous pouvez tout de
            même lancer une simulation en saisissant librement le nom de votre zone.
          </p>
        ) : null}
      </div>

      {/* Carte schématique : illustration, jamais la seule source d'information. */}
      <div className="surface-card p-6">
        <svg viewBox="0 0 100 100" className="h-auto w-full" role="presentation" aria-hidden="true">
          <defs>
            <pattern id="zonegrid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M8 0H0v8" fill="none" stroke="#0A1730" strokeOpacity="0.05" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#zonegrid)" rx="3" />

          {/* Trait de cote stylise : repere visuel, pas une frontiere exacte. */}
          <path
            d="M8 4 C 16 18, 22 30, 28 44 C 34 58, 42 70, 52 82 C 60 90, 70 94, 82 96"
            fill="none"
            stroke="#128796"
            strokeOpacity="0.35"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />

          {located.map((zone) => {
            const { x, y } = project(zone.lat!, zone.lng!);
            const active = selected === zone.id;
            return (
              <g key={zone.id}>
                {active ? (
                  <circle cx={x} cy={y} r="6" fill="#0E6E7A" fillOpacity="0.16" />
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={zone.isPilot ? 2.4 : 1.8}
                  fill={zone.isPilot ? "#B5652C" : "#0E6E7A"}
                  stroke="#FFFFFF"
                  strokeWidth="0.6"
                />
                <text
                  x={x + 3.5}
                  y={y + 1}
                  fontSize="2.6"
                  fill={active ? "#0A1730" : "#4A5568"}
                  fontWeight={active ? 700 : 400}
                >
                  {zone.city}
                </text>
              </g>
            );
          })}
        </svg>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Représentation schématique des zones référencées. Elle ne constitue pas une carte
          géographique exacte et n&apos;affiche aucun calcul d&apos;itinéraire : les temps
          d&apos;intervention réels sont établis lors de l&apos;audit terrain.
        </p>
      </div>
    </div>
  );
}
