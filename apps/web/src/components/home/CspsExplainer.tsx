"use client";

import { useState } from "react";
import clsx from "clsx";
import { CspsZoneDiagram } from "../csps/CspsZoneDiagram";
import { CSPS_STEPS } from "@/content/site";

/**
 * Explication du modele CSPS en trois etapes. Le diagramme reagit a l'etape
 * selectionnee : chaque affirmation textuelle a sa contrepartie visuelle.
 * Navigation clavier complete (les etapes sont de vrais boutons).
 */
export function CspsExplainer() {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 lg:order-1">
        <ol className="space-y-3">
          {CSPS_STEPS.map((item, index) => {
            const active = step === index;
            return (
              <li key={item.number}>
                <button
                  type="button"
                  onClick={() => setStep(index as 0 | 1 | 2)}
                  aria-current={active ? "step" : undefined}
                  className={clsx(
                    "w-full rounded-lg border p-5 text-start transition-all duration-base",
                    active
                      ? "border-petrol-600/30 bg-mist-white shadow-card"
                      : "border-transparent bg-transparent hover:bg-mist-white/60",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={clsx(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold transition-colors duration-base",
                        active ? "bg-copper-500 text-mist-white" : "bg-navy-950/8 text-navy-950",
                      )}
                    >
                      {item.number}
                    </span>
                    <div>
                      <h3
                        className={clsx(
                          "font-heading text-lg font-bold transition-colors",
                          active ? "text-navy-950" : "text-slate-600",
                        )}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={clsx(
                          "mt-1.5 text-[0.95rem] leading-relaxed transition-colors",
                          active ? "text-slate-600" : "text-slate-400",
                        )}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="order-1 lg:order-2">
        <div className="surface-card p-6">
          <CspsZoneDiagram step={step} />
        </div>
      </div>
    </div>
  );
}
