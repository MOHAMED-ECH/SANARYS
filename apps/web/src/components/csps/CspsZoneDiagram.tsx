"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

/**
 * Visualisation du modele CSPS : plusieurs PME d'une zone industrielle reliees
 * a un point d'ancrage medical central qui rayonne sur tout le perimetre.
 *
 * Trois etapes narratives :
 *  1. les entreprises, isolees ;
 *  2. le point d'ancrage et son rayon de couverture ;
 *  3. le partage des couts entre membres.
 *
 * Accessibilite : le diagramme est decoratif au sens strict (aria-hidden) et
 * chaque etape est doublee d'un texte lisible. L'animation respecte
 * prefers-reduced-motion (etat final affiche immediatement, sans mouvement).
 */

const COMPANIES = [
  { id: "a", x: 22, y: 26, label: "PME A" },
  { id: "b", x: 74, y: 20, label: "PME B" },
  { id: "c", x: 84, y: 58, label: "PME C" },
  { id: "d", x: 62, y: 82, label: "PME D" },
  { id: "e", x: 26, y: 74, label: "PME E" },
  { id: "f", x: 12, y: 52, label: "PME F" },
] as const;

const ANCHOR = { x: 50, y: 50 };

export function CspsZoneDiagram({
  step,
  className,
}: {
  /** 0 = entreprises isolees, 1 = ancrage + rayon, 2 = partage des couts */
  step: 0 | 1 | 2;
  className?: string | undefined;
}) {
  const reduced = useReducedMotion();

  return (
    <div className={clsx("relative aspect-square w-full", className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full" role="presentation" aria-hidden="true">
        <defs>
          <radialGradient id="coverage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#128796" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#128796" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#128796" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0v10" fill="none" stroke="#0A1730" strokeOpacity="0.06" strokeWidth="0.4" />
          </pattern>
        </defs>

        {/* Trame de la zone industrielle */}
        <rect x="2" y="2" width="96" height="96" rx="4" fill="url(#grid)" />
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="4"
          fill="none"
          stroke="#0A1730"
          strokeOpacity="0.12"
          strokeWidth="0.6"
          strokeDasharray="3 2"
        />

        {/* Rayon de couverture (etapes 1 et 2) */}
        <motion.circle
          cx={ANCHOR.x}
          cy={ANCHOR.y}
          r="42"
          fill="url(#coverage)"
          initial={false}
          animate={{ opacity: step >= 1 ? 1 : 0, scale: step >= 1 ? 1 : 0.6 }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: "50% 50%" }}
        />
        <motion.circle
          cx={ANCHOR.x}
          cy={ANCHOR.y}
          r="42"
          fill="none"
          stroke="#0E6E7A"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          initial={false}
          animate={{ opacity: step >= 1 ? 0.55 : 0 }}
          transition={{ duration: reduced ? 0 : 0.4 }}
        />

        {/* Liaisons PME -> point d'ancrage */}
        {COMPANIES.map((company, index) => (
          <motion.line
            key={company.id}
            x1={company.x}
            y1={company.y}
            x2={ANCHOR.x}
            y2={ANCHOR.y}
            stroke={step >= 2 ? "#B5652C" : "#0E6E7A"}
            strokeWidth={step >= 2 ? 0.9 : 0.6}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: step >= 1 ? 1 : 0, opacity: step >= 1 ? 0.75 : 0 }}
            transition={{
              duration: reduced ? 0 : 0.45,
              delay: reduced ? 0 : 0.06 * index,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        ))}

        {/* Batiments PME */}
        {COMPANIES.map((company) => (
          <g key={company.id}>
            <motion.rect
              x={company.x - 4}
              y={company.y - 3.2}
              width="8"
              height="6.4"
              rx="1"
              fill="#FFFFFF"
              stroke={step >= 2 ? "#B5652C" : "#0A1730"}
              strokeOpacity={step >= 2 ? 0.8 : 0.25}
              strokeWidth="0.6"
              initial={false}
              animate={{ scale: step >= 2 ? 1.06 : 1 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
              style={{ transformOrigin: `${company.x}px ${company.y}px` }}
            />
            <path
              d={`M${company.x - 4} ${company.y - 3.2} L${company.x} ${company.y - 5.4} L${company.x + 4} ${company.y - 3.2}`}
              fill="#EDE3D2"
              stroke="#0A1730"
              strokeOpacity="0.2"
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* Onde de disponibilite permanente */}
        {step >= 1 && !reduced ? (
          <circle
            cx={ANCHOR.x}
            cy={ANCHOR.y}
            r="10"
            fill="none"
            stroke="#0E6E7A"
            strokeWidth="0.8"
            className="origin-center animate-pulse-ring"
            style={{ transformOrigin: "50% 50%" }}
          />
        ) : null}

        {/* Point d'ancrage CSPS */}
        <motion.g
          initial={false}
          animate={{ scale: step >= 1 ? 1 : 0.5, opacity: step >= 1 ? 1 : 0.25 }}
          transition={{ duration: reduced ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: "50% 50%" }}
        >
          <circle cx={ANCHOR.x} cy={ANCHOR.y} r="8" fill="#0A1730" />
          <circle cx={ANCHOR.x} cy={ANCHOR.y} r="5.6" fill="#B5652C" />
          <path
            d={`M${ANCHOR.x} ${ANCHOR.y - 3} V${ANCHOR.y + 3} M${ANCHOR.x - 3} ${ANCHOR.y} H${ANCHOR.x + 3}`}
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
    </div>
  );
}

/** Version autonome qui fait defiler les trois etapes, utilisee sur l'accueil. */
export function CspsZoneDiagramAuto({ className }: { className?: string | undefined }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<0 | 1 | 2>(reduced ? 2 : 0);

  useEffect(() => {
    if (reduced) {
      setStep(2);
      return;
    }
    const timers = [
      setTimeout(() => setStep(1), 900),
      setTimeout(() => setStep(2), 2400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  return <CspsZoneDiagram step={step} className={className} />;
}
