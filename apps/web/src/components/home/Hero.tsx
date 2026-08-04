import { ButtonLink } from "../ui/Button";
import { CspsZoneDiagramAuto } from "../csps/CspsZoneDiagram";
import { COMMITMENTS, SITE } from "@/content/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      {/* Halo petrole discret, sans image lourde ni video en lecture auto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-petrol-600/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-copper-500/10 blur-3xl"
      />

      <div className="container-page relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="animate-fade-up">
          <p className="eyebrow text-copper-300">Zones industrielles marocaines</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] text-mist-white md:text-5xl lg:text-[3.4rem]">
            {SITE.headline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist-50/80">
            {SITE.subheadline}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/simulateur" variant="accent" size="lg">
              Simuler mon CSPS
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10h11M11 6l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ButtonLink>
            <ButtonLink
              href="/audit"
              size="lg"
              className="border border-mist-white/25 bg-transparent text-mist-white hover:border-mist-white/60 hover:bg-mist-white/5"
            >
              Demander un audit terrain
            </ButtonLink>
          </div>

          <p className="mt-5 text-sm text-mist-50/55">
            Audit terrain gratuit · Résultat de simulation immédiat · Sans engagement
          </p>
        </div>

        <div className="relative">
          <div className="rounded-lg border border-mist-white/10 bg-mist-white/5 p-6 backdrop-blur-sm">
            <CspsZoneDiagramAuto />
            <p className="mt-4 text-center text-sm text-mist-50/70">
              Un point d&apos;ancrage central, un rayonnement sur toute la zone, un coût partagé
              entre les PME membres.
            </p>
          </div>
        </div>
      </div>

      {/* Bandeau d'engagements : chiffres sourcables, formules sans absolu. */}
      <div className="relative border-t border-mist-white/10">
        <div className="container-page grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {COMMITMENTS.map((item) => (
            <div key={item.label} className="py-7 lg:px-6 lg:first:ps-0">
              <p className="font-heading text-3xl font-extrabold text-mist-white">{item.value}</p>
              <p className="mt-1 font-heading text-sm font-semibold text-copper-300">{item.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-mist-50/60">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
