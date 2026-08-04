import clsx from "clsx";

/**
 * Marque SANARYS. Le monogramme evoque un point d'ancrage rayonnant :
 * un noyau (le CSPS) et une onde de couverture (la zone desservie).
 */
export function Logo({ onDark = false, className }: { onDark?: boolean | undefined; className?: string | undefined }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r="14"
          stroke={onDark ? "#128796" : "#0E6E7A"}
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />
        <circle cx="16" cy="16" r="9" stroke={onDark ? "#128796" : "#0E6E7A"} strokeWidth="1.5" />
        <circle cx="16" cy="16" r="4.5" fill="#B5652C" />
        <path
          d="M16 13.6v4.8M13.6 16h4.8"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={clsx(
          "font-heading text-xl font-extrabold tracking-[0.14em]",
          onDark ? "text-mist-white" : "text-navy-950",
        )}
      >
        SANARYS
      </span>
    </span>
  );
}
