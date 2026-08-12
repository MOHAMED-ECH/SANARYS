import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { SERVICES } from "@/content/site";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.summary,
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  const others = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <Section tone="navy">
        <nav aria-label="Fil d'Ariane" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-mist-50/60">
            <li>
              <Link href="/" className="hover:text-mist-white">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/solutions" className="hover:text-mist-white">
                Solutions
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-mist-white">
              {service.title}
            </li>
          </ol>
        </nav>

        <div className="max-w-3xl">
          <p className="eyebrow text-copper-300">Solution {service.number}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-mist-white md:text-5xl">
            {service.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-mist-50/80">{service.summary}</p>
        </div>
      </Section>

      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeader eyebrow="Le problème" title="Pourquoi ce service existe" />
            <p className="text-[1.05rem] leading-relaxed">{service.problem}</p>

            <h3 className="mt-8 font-heading text-lg font-bold text-navy-950">
              À qui s&apos;adresse ce service
            </h3>
            <p className="mt-2 leading-relaxed text-slate-600">{service.audience}</p>
          </div>

          <div className="surface-card p-7">
            <h2 className="font-heading text-xl font-bold text-navy-950">
              Ce que comprend la prestation
            </h2>
            <ul className="mt-5 space-y-3">
              {service.included.map((item) => (
                <li key={item} className="flex gap-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  >
                    <circle cx="10" cy="10" r="9" fill="#E3F2F1" />
                    <path
                      d="M6 10.2l2.6 2.6L14 7.4"
                      stroke="#0E6E7A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[0.98rem] leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <SectionHeader eyebrow="Déroulement" title="Comment se déroule la mise en place" />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {service.steps.map((step, index) => (
            <li key={step} className="border-t-2 border-copper-500/30 pt-5">
              <span className="font-heading text-sm font-bold text-copper-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 font-heading font-semibold leading-snug text-navy-950">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="light">
        <div className="rounded-lg border-s-4 border-petrol-600 bg-mist-50 p-6">
          <h2 className="font-heading text-lg font-bold text-navy-950">
            Ce que nous vous demanderons
          </h2>
          <p className="mt-2 leading-relaxed">
            Une visite du site ou de la zone, une description des activités et des horaires, et
            l&apos;identification d&apos;un référent sécurité. Aucune information industrielle
            confidentielle n&apos;est nécessaire pour dimensionner un dispositif.
          </p>
        </div>

        <h2 className="mt-12 font-heading text-xl font-bold text-navy-950">Autres solutions</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                href={`/solutions/${other.slug}`}
                className="block h-full rounded-lg border border-navy-950/8 p-5 transition-colors duration-base hover:border-petrol-600/30 hover:bg-mist-50"
              >
                <h3 className="font-heading font-bold text-navy-950">{other.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{other.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="sand">
        <div className="mx-auto max-w-2xl text-center">
          <span className="accent-rule" />
          <h2 className="mt-6 text-3xl font-bold text-navy-950">
            Discutons de votre besoin
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Un audit terrain gratuit permet de dimensionner précisément le dispositif adapté à votre
            site ou à votre zone.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/audit" size="lg">
              Demander un audit terrain
            </ButtonLink>
            <ButtonLink href="/simulateur" variant="secondary" size="lg">
              Simuler mon CSPS
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
