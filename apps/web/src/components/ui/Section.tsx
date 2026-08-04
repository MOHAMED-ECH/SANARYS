import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "light" | "mist" | "sand" | "navy";

const TONES: Record<Tone, string> = {
  light: "bg-mist-white",
  mist: "bg-mist-50",
  sand: "bg-sand-200",
  navy: "bg-navy-950 text-mist-white",
};

export function Section({
  tone = "light",
  className,
  children,
  id,
}: {
  tone?: Tone | undefined;
  className?: string | undefined;
  children: ReactNode;
  id?: string | undefined;
}) {
  return (
    <section id={id} className={clsx(TONES[tone], "py-16 md:py-24", className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  onNavy = false,
}: {
  eyebrow?: string | undefined;
  title: string;
  lead?: string | undefined;
  align?: "left" | "center" | undefined;
  onNavy?: boolean | undefined;
}) {
  return (
    <header
      className={clsx("mb-10 max-w-prose md:mb-14", align === "center" && "mx-auto text-center")}
    >
      {eyebrow ? (
        <p className={clsx("eyebrow mb-3", onNavy && "text-copper-300")}>{eyebrow}</p>
      ) : null}
      <h2
        className={clsx(
          "text-3xl font-bold leading-tight md:text-4xl",
          onNavy && "text-mist-white",
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p className={clsx("mt-4 text-lg leading-relaxed", onNavy ? "text-mist-50/80" : "text-slate-600")}>
          {lead}
        </p>
      ) : null}
    </header>
  );
}
