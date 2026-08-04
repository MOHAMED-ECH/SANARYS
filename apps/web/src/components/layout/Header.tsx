"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Logo } from "./Logo";
import { ButtonLink } from "../ui/Button";

const NAV = [
  { href: "/modele-csps", label: "Le modèle CSPS" },
  { href: "/solutions", label: "Solutions" },
  { href: "/secteurs", label: "Secteurs" },
  { href: "/zones", label: "Zones & couverture" },
  { href: "/qualite-conformite", label: "Qualité" },
  { href: "/ressources", label: "Ressources" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Referme le menu mobile a chaque navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-950/8 bg-mist-white/95 backdrop-blur">
      <div className="container-page flex min-h-[72px] items-center justify-between gap-6 py-3">
        <Link href="/" aria-label="SANARYS, accueil" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Navigation principale" className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-fast",
                      active
                        ? "text-petrol-600"
                        : "text-slate-600 hover:bg-navy-950/5 hover:text-navy-950",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <ButtonLink href="/connexion" variant="ghost" size="md" className="whitespace-nowrap">
            Espace client
          </ButtonLink>
          <ButtonLink href="/simulateur" variant="primary" size="md" className="whitespace-nowrap">
            Simuler mon CSPS
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-navy-950/15 px-3 py-2 text-sm font-semibold text-navy-950 xl:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
          Menu
        </button>
      </div>

      {open ? (
        <div id="menu-mobile" className="border-t border-navy-950/8 bg-mist-white xl:hidden">
          <div className="container-page py-4">
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-3 text-base font-medium text-navy-950 hover:bg-navy-950/5"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <ButtonLink href="/simulateur" variant="primary" size="lg">
                Simuler mon CSPS
              </ButtonLink>
              <ButtonLink href="/connexion" variant="secondary" size="lg">
                Espace client
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
