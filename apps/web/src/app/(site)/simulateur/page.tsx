import type { Metadata } from "next";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import { SimulatorWizard } from "@/features/simulator/SimulatorWizard";

export const metadata: Metadata = {
  title: "Simulateur CSPS",
  description:
    "Estimez en quelques minutes le dispositif sanitaire mutualisé adapté à votre zone industrielle : type d'ambulance, modules, couverture et clé de répartition indicative.",
};

// Le simulateur est interactif : rendu à la demande, jamais mis en cache statique.
export const dynamic = "force-dynamic";

async function loadZones(): Promise<IndustrialZoneDto[]> {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
  try {
    const response = await fetch(`${base}/zones`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as IndustrialZoneDto[];
  } catch {
    // L'API peut être indisponible : le simulateur reste utilisable en saisie libre.
    return [];
  }
}

export default async function SimulateurPage({
  searchParams,
}: {
  searchParams: Promise<{ sim?: string }>;
}) {
  const { sim } = await searchParams;
  const zones = await loadZones();

  return (
    <div className="bg-mist-50">
      <div className="container-page py-12 md:py-16">
        <header className="mb-10 max-w-prose">
          <p className="eyebrow">Simulateur CSPS</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-navy-950 md:text-4xl">
            Estimez le dispositif adapté à votre zone
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Sept étapes, environ cinq minutes. Vous obtenez une configuration indicative expliquée
            règle par règle, un récapitulatif PDF et la possibilité de demander un audit terrain.
          </p>
        </header>

        <SimulatorWizard zones={zones} initialSimulationId={sim} />
      </div>
    </div>
  );
}
