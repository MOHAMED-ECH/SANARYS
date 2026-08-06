import { MEDIA } from "@/content/media";

/**
 * La zone industrielle vue en coupe, avec le CSPS implante en son centre.
 *
 * C'est l'argument de vente entier en une image : un dispositif unique, au
 * milieu, dont la couverture atteint toutes les entreprises voisines. Un
 * schema plutot qu'une photo, et c'est un choix : une photo d'ambulance ne
 * montrerait qu'un vehicule, jamais la mutualisation — qui est precisement ce
 * que SANARYS vend.
 *
 * Le rendu est un SVG statique : aucune image a telecharger, aucun decalage de
 * mise en page, et une nettete identique a toutes les densites d'ecran.
 */

const GROUND = 300;
const CENTER_X = 800;

interface Building {
  readonly x: number;
  readonly width: number;
  readonly height: number;
  readonly roof?: "saw" | "stack" | undefined;
  /** Entreprise reliee au CSPS par un itineraire. */
  readonly linked?: boolean | undefined;
}

const BUILDINGS: readonly Building[] = [
  { x: 40, width: 110, height: 68 },
  { x: 172, width: 78, height: 112, roof: "stack", linked: true },
  { x: 272, width: 132, height: 84, roof: "saw" },
  { x: 424, width: 92, height: 58, linked: true },
  { x: 538, width: 118, height: 96, roof: "saw" },
  { x: 916, width: 102, height: 72, linked: true },
  { x: 1040, width: 138, height: 100, roof: "saw" },
  { x: 1198, width: 84, height: 62 },
  { x: 1304, width: 116, height: 114, roof: "stack", linked: true },
  { x: 1442, width: 122, height: 78 },
];

/** Toit en dents de scie : la silhouette d'atelier reconnaissable entre toutes. */
function sawRoof(x: number, width: number, top: number) {
  const teeth = Math.max(2, Math.round(width / 34));
  const step = width / teeth;
  const points: string[] = [`${x},${top}`];

  for (let i = 0; i < teeth; i += 1) {
    points.push(`${x + i * step + step * 0.5},${top - 14}`, `${x + (i + 1) * step},${top}`);
  }

  return points.join(" ");
}

export function ZonePanorama() {
  return (
    <svg
      viewBox="0 0 1600 360"
      className="h-auto w-full"
      role="img"
      aria-label={MEDIA.zonePanorama.alt}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="zp-glow" cx="50%" cy="82%" r="46%">
          <stop offset="0%" stopColor="#128796" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#128796" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="zp-anchor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#128796" />
          <stop offset="100%" stopColor="#0E6E7A" />
        </linearGradient>
        {/* Les cercles de couverture s'arretent au sol : ils representent une
            portee au niveau du terrain, pas une bulle autour du batiment. */}
        <clipPath id="zp-above-ground">
          <rect x="0" y="0" width="1600" height={GROUND} />
        </clipPath>
      </defs>

      <rect x="0" y="60" width="1600" height="300" fill="url(#zp-glow)" />

      <g clipPath="url(#zp-above-ground)">
        {[186, 256, 326].map((radius, index) => (
          <circle
            key={radius}
            cx={CENTER_X}
            cy={GROUND}
            r={radius}
            fill="none"
            stroke="#128796"
            strokeWidth={1.5}
            strokeDasharray="5 9"
            opacity={0.55 - index * 0.13}
          />
        ))}
      </g>

      {/* Itineraires depuis le point d'ancrage vers les entreprises desservies. */}
      {BUILDINGS.filter((b) => b.linked).map((building) => {
        const target = building.x + building.width / 2;
        const midpoint = (CENTER_X + target) / 2;
        return (
          <path
            key={`route-${building.x}`}
            d={`M ${CENTER_X} ${GROUND - 6} Q ${midpoint} ${GROUND - 150} ${target} ${GROUND - 6}`}
            fill="none"
            stroke="#D99A64"
            strokeWidth={1.8}
            strokeDasharray="4 6"
            opacity={0.8}
          />
        );
      })}

      {BUILDINGS.map((building) => {
        const top = GROUND - building.height;
        return (
          <g key={building.x}>
            <rect
              x={building.x}
              y={top}
              width={building.width}
              height={building.height}
              fill="#122448"
              stroke="#F7F8FA"
              strokeOpacity={0.16}
              strokeWidth={1}
            />
            {building.roof === "saw" ? (
              <polyline
                points={sawRoof(building.x, building.width, top)}
                fill="#122448"
                stroke="#F7F8FA"
                strokeOpacity={0.16}
                strokeWidth={1}
              />
            ) : null}
            {building.roof === "stack" ? (
              <rect
                x={building.x + building.width * 0.68}
                y={top - 34}
                width={13}
                height={34}
                fill="#122448"
                stroke="#F7F8FA"
                strokeOpacity={0.16}
                strokeWidth={1}
              />
            ) : null}
            {/* Fenetres : quelques reperes d'echelle, pas un damier complet. */}
            {Array.from({ length: Math.max(2, Math.floor(building.width / 40)) }).map((_, i) => (
              <rect
                key={i}
                x={building.x + 14 + i * 38}
                y={top + 18}
                width={11}
                height={11}
                fill="#F7F8FA"
                opacity={0.13}
              />
            ))}
          </g>
        );
      })}

      {/* Le CSPS : seul batiment eclaire, seul a porter un marqueur. */}
      <g>
        <rect x={730} y={GROUND - 122} width={140} height={122} fill="url(#zp-anchor)" />
        <rect
          x={730}
          y={GROUND - 122}
          width={140}
          height={122}
          fill="none"
          stroke="#E3F2F1"
          strokeOpacity={0.5}
          strokeWidth={1.5}
        />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={748 + col * 38}
              y={GROUND - 104 + row * 34}
              width={16}
              height={16}
              fill="#F7F8FA"
              opacity={0.42}
            />
          )),
        )}
        <circle cx={CENTER_X} cy={GROUND - 158} r={22} fill="#A85B26" />
        <path
          d={`M ${CENTER_X} ${GROUND - 170} v 24 M ${CENTER_X - 12} ${GROUND - 158} h 24`}
          stroke="#FFFFFF"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      </g>

      <line
        x1="0"
        y1={GROUND}
        x2="1600"
        y2={GROUND}
        stroke="#F7F8FA"
        strokeOpacity={0.28}
        strokeWidth={1.5}
      />
    </svg>
  );
}
