import clsx from "clsx";

/**
 * Icones de la navigation du portail.
 *
 * Dessinees a la main plutot qu'importees : cinq traits suffisent, et une
 * bibliotheque d'icones pour cinq pictogrammes ajouterait une dependance et
 * un style etranger a celui du reste du produit. Toutes partagent la meme
 * grille de 24, la meme epaisseur de trait et les memes terminaisons.
 */

const BASE = "shrink-0";

type IconProps = { className?: string | undefined };

function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={clsx(BASE, className)}
    >
      {children}
    </svg>
  );
}

export function IconDashboard({ className }: IconProps) {
  return (
    <Frame className={className}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </Frame>
  );
}

export function IconContract({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </Frame>
  );
}

export function IconReport({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Frame>
  );
}

export function IconMembers({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.6A6 6 0 0 1 21 20" />
    </Frame>
  );
}

export function IconSecurity({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M12 3l7 3v5.5c0 4.4-2.9 8.4-7 9.5-4.1-1.1-7-5.1-7-9.5V6z" />
      <path d="M9.2 12.2l2 2 3.6-3.9" />
    </Frame>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M15.5 16.5L20 12l-4.5-4.5M20 12H9" />
    </Frame>
  );
}

export function IconTrendUp({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </Frame>
  );
}

export function IconTrendDown({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M14 17h7v-7" />
    </Frame>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M12 3v12" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Frame>
  );
}
