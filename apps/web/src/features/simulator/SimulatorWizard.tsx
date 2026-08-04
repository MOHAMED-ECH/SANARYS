"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import {
  ActivityStepSchema,
  CompaniesStepSchema,
  ContactStepSchema,
  ExistingSetupStepSchema,
  ExpectationsStepSchema,
  ScheduleStepSchema,
  ZoneStepSchema,
} from "@sanarys/schemas";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { STEPS, useSimulator, type StepKey } from "./useSimulator";
import {
  ActivityStepForm,
  CompaniesStepForm,
  ContactStepForm,
  ExistingSetupStepForm,
  ExpectationsStepForm,
  ScheduleStepForm,
  ZoneStepForm,
} from "./steps";
import { SimulationResultView } from "./SimulationResultView";

/** Les mêmes schémas Zod que ceux appliqués par l'API : une seule source de vérité. */
const STEP_SCHEMAS = {
  zone: ZoneStepSchema,
  companies: CompaniesStepSchema,
  activity: ActivityStepSchema,
  schedule: ScheduleStepSchema,
  existingSetup: ExistingSetupStepSchema,
  expectations: ExpectationsStepSchema,
  contact: ContactStepSchema,
} as const;

export function SimulatorWizard({
  zones,
  initialSimulationId,
}: {
  zones: IndustrialZoneDto[];
  initialSimulationId?: string | undefined;
}) {
  const simulator = useSimulator(initialSimulationId);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [auditSent, setAuditSent] = useState(false);
  const [auditPending, setAuditPending] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const stepKey = simulator.step.key as StepKey;

  // Charge le brouillon de l'étape courante depuis l'état déjà connu.
  useEffect(() => {
    const existing = (simulator.input as Record<string, unknown>)[stepKey];
    setDraft((existing as Record<string, unknown>) ?? {});
    setErrors({});
  }, [stepKey, simulator.input]);

  // Déplace le focus sur le titre de l'étape : parcours clavier et lecteur d'écran.
  useEffect(() => {
    headingRef.current?.focus();
  }, [simulator.stepIndex, simulator.status]);

  const isLastStep = simulator.stepIndex === STEPS.length - 1;

  async function handleNext() {
    const schema = STEP_SCHEMAS[stepKey];
    const parsed = schema.safeParse(draft);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      headingRef.current?.focus();
      return;
    }

    await simulator.saveStep(stepKey, parsed.data as Record<string, unknown>);

    if (isLastStep) {
      await simulator.complete();
    } else {
      simulator.next();
    }
  }

  async function handleRequestAudit() {
    if (!simulator.simulationId || auditPending) return;
    const contact = simulator.input.contact;
    const zone = simulator.input.zone;
    if (!contact) return;

    setAuditPending(true);
    try {
      const lead = await api.createLead({
        contactName: contact.name,
        contactRole: contact.role,
        companyName: contact.company,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        preferredChannel: contact.preferredChannel,
        industrialZoneId: zone?.industrialZoneId,
        source: "simulateur",
        consentMarketing: contact.consent === true,
        consentVersion: contact.consentVersion ?? "2026.08.0",
        simulationId: simulator.simulationId,
      });
      await api.createAuditRequest({ leadId: lead.id });
      void api.track("request_audit", { type_organisation: "PME" });
      setAuditSent(true);
    } catch {
      simulator.setError("Votre demande n'a pas pu être transmise. Merci de réessayer.");
    } finally {
      setAuditPending(false);
    }
  }

  const progress = useMemo(
    () => Math.round(((simulator.stepIndex + (simulator.status === "done" ? 1 : 0)) / STEPS.length) * 100),
    [simulator.stepIndex, simulator.status],
  );

  if (simulator.status === "loading") {
    return (
      <div className="surface-card p-10 text-center" aria-live="polite">
        <p className="text-slate-600">Préparation de votre simulation…</p>
      </div>
    );
  }

  // --- Résultat ------------------------------------------------------------
  if (simulator.status === "done" && simulator.result && simulator.simulationId) {
    return (
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          Résultat de votre simulation
        </h2>

        {auditSent ? (
          <div
            role="status"
            className="mb-8 rounded-lg border border-success/30 bg-success/10 p-6"
          >
            <h3 className="font-heading text-lg font-bold text-navy-950">
              Votre demande d&apos;audit est enregistrée
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Un conseiller SANARYS vous recontacte pour convenir d&apos;une date de visite. Vous
              pouvez dès maintenant télécharger votre récapitulatif.
            </p>
          </div>
        ) : null}

        <SimulationResultView
          simulationId={simulator.simulationId}
          input={simulator.input}
          result={simulator.result}
          onRequestAudit={handleRequestAudit}
        />
      </div>
    );
  }

  // --- Wizard --------------------------------------------------------------
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
      {/* Fil d'étapes */}
      <nav aria-label="Étapes du simulateur" className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-sm font-semibold text-slate-600">
          Étape {simulator.stepIndex + 1} sur {STEPS.length}
        </p>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-950/10"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression"
        >
          <div
            className="h-full rounded-full bg-petrol-600 transition-all duration-slow"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-6 hidden space-y-1 lg:block">
          {STEPS.map((step, index) => {
            const done = index < simulator.stepIndex;
            const current = index === simulator.stepIndex;
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => (index <= simulator.stepIndex ? simulator.goTo(index) : undefined)}
                  disabled={index > simulator.stepIndex}
                  aria-current={current ? "step" : undefined}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors duration-fast",
                    current && "bg-petrol-100/70 font-semibold text-navy-950",
                    done && "text-slate-600 hover:bg-navy-950/5",
                    !current && !done && "cursor-not-allowed text-slate-600/45",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      current && "bg-copper-500 text-mist-white",
                      done && "bg-petrol-600 text-mist-white",
                      !current && !done && "bg-navy-950/8 text-slate-600/60",
                    )}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  {step.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Formulaire de l'étape */}
      <div>
        <div className="surface-card p-6 md:p-8">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-2xl font-bold text-navy-950 focus:outline-none"
          >
            {simulator.step.title}
          </h2>

          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
              Merci de corriger les champs signalés avant de continuer.
            </p>
          ) : null}

          {simulator.error ? (
            <p role="alert" className="mt-4 rounded-md bg-warning/10 px-4 py-3 text-sm text-navy-950">
              {simulator.error}
            </p>
          ) : null}

          <div className="mt-7">
            {stepKey === "zone" ? (
              <ZoneStepForm value={draft} onChange={setDraft} errors={errors} zones={zones} />
            ) : null}
            {stepKey === "companies" ? (
              <CompaniesStepForm value={draft} onChange={setDraft} errors={errors} />
            ) : null}
            {stepKey === "activity" ? (
              <ActivityStepForm value={draft} onChange={setDraft} errors={errors} />
            ) : null}
            {stepKey === "schedule" ? (
              <ScheduleStepForm value={draft} onChange={setDraft} errors={errors} />
            ) : null}
            {stepKey === "existingSetup" ? (
              <ExistingSetupStepForm value={draft} onChange={setDraft} errors={errors} />
            ) : null}
            {stepKey === "expectations" ? (
              <ExpectationsStepForm value={draft} onChange={setDraft} errors={errors} />
            ) : null}
            {stepKey === "contact" ? (
              <ContactStepForm value={draft} onChange={setDraft} errors={errors} />
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={simulator.previous}
            disabled={simulator.stepIndex === 0}
            size="lg"
          >
            Retour
          </Button>
          <Button
            onClick={handleNext}
            size="lg"
            disabled={simulator.status === "computing"}
            variant={isLastStep ? "accent" : "primary"}
          >
            {simulator.status === "computing"
              ? "Calcul en cours…"
              : isLastStep
                ? "Obtenir ma configuration"
                : "Continuer"}
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Votre progression est enregistrée automatiquement. Vous pouvez fermer cette page et revenir
          plus tard depuis le même navigateur, sans créer de compte.
        </p>
      </div>
    </div>
  );
}
