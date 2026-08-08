"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SimulationInput, SimulationResult } from "@sanarys/schemas";
import { api } from "@/lib/api";

export const STEPS = [
  { key: "zone", label: "Zone", title: "Votre zone industrielle" },
  { key: "companies", label: "Entreprises", title: "Les entreprises concernées" },
  { key: "activity", label: "Activité", title: "Activités et niveau de risque" },
  { key: "schedule", label: "Horaires", title: "Rythme de travail" },
  { key: "existingSetup", label: "Existant", title: "Dispositif déjà en place" },
  { key: "expectations", label: "Attentes", title: "Vos attentes" },
  { key: "contact", label: "Contact", title: "Recevoir votre récapitulatif" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

const storageKey = (id: string) => `sanarys.sim.${id}`;

/**
 * Etat du simulateur. Le token de reprise reste dans le navigateur
 * (sessionStorage) et n'est jamais rendu dans l'URL : l'identifiant seul ne
 * permet pas de relire une simulation.
 */
export function useSimulator(initialSimulationId?: string) {
  const [simulationId, setSimulationId] = useState<string | null>(initialSimulationId ?? null);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [input, setInput] = useState<SimulationInput>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "computing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Demarre ou reprend une simulation au montage.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      setStatus("loading");
      try {
        if (initialSimulationId) {
          const token = sessionStorage.getItem(storageKey(initialSimulationId));
          if (token) {
            const record = await api.resumeSimulation(initialSimulationId, token);
            setResumeToken(token);
            setInput(record.input);
            setResult(record.result);
            setSimulationId(record.id);
            // Reprend a la premiere etape non renseignee.
            const firstEmpty = STEPS.findIndex(
              (step) => !(record.input as Record<string, unknown>)[step.key],
            );
            setStepIndex(firstEmpty === -1 ? STEPS.length - 1 : firstEmpty);
            setStatus(record.status === "COMPLETED" ? "done" : "ready");
            return;
          }
        }

        const started = await api.startSimulation();
        sessionStorage.setItem(storageKey(started.id), started.resumeToken);
        setSimulationId(started.id);
        setResumeToken(started.resumeToken);
        setStatus("ready");
        void api.track("start_simulation", { source: "simulateur" });
      } catch {
        setError("Impossible de démarrer le simulateur. Merci de réessayer dans un instant.");
        setStatus("idle");
      }
    })();
  }, [initialSimulationId]);

  const saveStep = useCallback(
    async (key: StepKey, data: Record<string, unknown>) => {
      if (!simulationId || !resumeToken) return;
      setInput((previous) => ({ ...previous, [key]: data }));
      try {
        await api.saveStep(simulationId, resumeToken, key, data);
        void api.track("complete_step", { step_id: key });
      } catch {
        // La progression reste en memoire : l'utilisateur n'est pas bloque.
        setError("Votre progression n'a pas pu être enregistrée sur nos serveurs.");
      }
    },
    [resumeToken, simulationId],
  );

  const next = useCallback(() => {
    setError(null);
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }, []);

  const previous = useCallback(() => {
    setError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setError(null);
    setStepIndex(index);
  }, []);

  const complete = useCallback(async () => {
    if (!simulationId || !resumeToken) return;
    setStatus("computing");
    setError(null);
    try {
      const response = await api.completeSimulation(simulationId, resumeToken);
      setResult(response.result);
      setStatus("done");
      void api.track("view_result", {
        scenario: response.result.vehicleType.code,
        modules: response.result.suggestedModules.length,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Le calcul n'a pas pu aboutir. Merci de réessayer.";
      setError(message);
      setStatus("ready");
    }
  }, [resumeToken, simulationId]);

  return {
    simulationId,
    resumeToken,
    input,
    result,
    stepIndex,
    step: STEPS[stepIndex]!,
    status,
    error,
    setError,
    saveStep,
    next,
    previous,
    goTo,
    complete,
  };
}
