"use client";

import { useState } from "react";
import type { IndustrialZoneDto } from "@sanarys/schemas";
import { ChoiceCard, ChoiceGroup, SelectField, TextField, ToggleField } from "@/components/ui/Field";

/**
 * Les sept etapes du simulateur. Chaque etape est un composant controle qui
 * remonte ses donnees validees ; la validation serveur (Zod partage) reste
 * l'autorite finale, la validation locale sert uniquement au confort.
 */

export interface StepProps<T> {
  value: Partial<T>;
  onChange: (value: Record<string, unknown>) => void;
  errors: Record<string, string>;
}

const SECTOR_OPTIONS = [
  { value: "AUTOMOBILE", label: "Automobile & câblage" },
  { value: "LOGISTIQUE", label: "Logistique & entreposage" },
  { value: "TEXTILE", label: "Textile & confection" },
  { value: "AGROALIMENTAIRE", label: "Agroalimentaire" },
  { value: "PLASTURGIE", label: "Plasturgie & chimie" },
  { value: "EVENEMENTIEL", label: "Événementiel" },
  { value: "ASSURANCE", label: "Assurance" },
  { value: "AUTRE", label: "Autre" },
] as const;

const SIZE_BRACKETS = [
  { value: "LT_20", label: "Moins de 20 salariés" },
  { value: "B20_50", label: "20 à 50 salariés" },
  { value: "B50_150", label: "50 à 150 salariés" },
  { value: "GTE_150", label: "Plus de 150 salariés" },
] as const;

const DAYS = [
  { value: "MON", label: "Lundi" },
  { value: "TUE", label: "Mardi" },
  { value: "WED", label: "Mercredi" },
  { value: "THU", label: "Jeudi" },
  { value: "FRI", label: "Vendredi" },
  { value: "SAT", label: "Samedi" },
  { value: "SUN", label: "Dimanche" },
] as const;

function toggleInArray<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

// --- Etape 1 : zone -------------------------------------------------------

export function ZoneStepForm({
  value,
  onChange,
  errors,
  zones,
}: StepProps<Record<string, unknown>> & { zones: IndustrialZoneDto[] }) {
  const selectedZoneId = (value.industrialZoneId as string) ?? "";

  return (
    <div className="space-y-6">
      <SelectField
        label="Sélectionnez une zone référencée"
        hint="Si votre zone n'apparaît pas, choisissez « Autre zone » et renseignez son nom."
        value={selectedZoneId}
        onChange={(event) => {
          const zone = zones.find((z) => z.id === event.target.value);
          onChange({
            ...value,
            industrialZoneId: event.target.value || undefined,
            ...(zone ? { city: zone.city, zoneName: zone.name } : {}),
          });
        }}
      >
        <option value="">Autre zone / non listée</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name} — {zone.city}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Ville"
          required
          value={(value.city as string) ?? ""}
          error={errors.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          placeholder="Casablanca"
        />
        <TextField
          label="Nom de la zone industrielle"
          required
          value={(value.zoneName as string) ?? ""}
          error={errors.zoneName}
          onChange={(event) => onChange({ ...value, zoneName: event.target.value })}
          placeholder="Zone Industrielle Bouskoura"
        />
      </div>

      <TextField
        label="Surface approximative de la zone (m²)"
        type="number"
        min={0}
        value={(value.surfaceM2 as number | undefined) ?? ""}
        error={errors.surfaceM2}
        hint="Une estimation suffit. Elle aide à apprécier les distances internes."
        onChange={(event) =>
          onChange({
            ...value,
            surfaceM2: event.target.value ? Number(event.target.value) : undefined,
          })
        }
        placeholder="450000"
      />

      <TextField
        label="Accès routiers et contraintes de circulation"
        value={(value.roadAccess as string) ?? ""}
        hint="Entrées principales, barrières, sens uniques, points de congestion connus."
        onChange={(event) => onChange({ ...value, roadAccess: event.target.value })}
        placeholder="Deux entrées, barrière contrôlée côté nord"
      />
    </div>
  );
}

// --- Etape 2 : entreprises ------------------------------------------------

export function CompaniesStepForm({ value, onChange, errors }: StepProps<Record<string, unknown>>) {
  const brackets = (value.sizeBrackets as string[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Nombre d'entreprises concernées"
          type="number"
          min={1}
          required
          value={(value.numberOfCompanies as number | undefined) ?? ""}
          error={errors.numberOfCompanies}
          onChange={(event) =>
            onChange({
              ...value,
              numberOfCompanies: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          placeholder="6"
        />
        <TextField
          label="Effectif total cumulé"
          type="number"
          min={1}
          required
          value={(value.totalHeadcount as number | undefined) ?? ""}
          error={errors.totalHeadcount}
          hint="Tous salariés confondus sur les entreprises concernées."
          onChange={(event) =>
            onChange({
              ...value,
              totalHeadcount: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          placeholder="620"
        />
      </div>

      <ChoiceGroup
        legend="Tailles d'entreprises représentées"
        hint="Plusieurs réponses possibles."
        error={errors.sizeBrackets}
      >
        {SIZE_BRACKETS.map((bracket) => (
          <ChoiceCard
            key={bracket.value}
            type="checkbox"
            label={bracket.label}
            checked={brackets.includes(bracket.value)}
            onChange={() => onChange({ ...value, sizeBrackets: toggleInArray(brackets, bracket.value) })}
          />
        ))}
      </ChoiceGroup>

      <TextField
        label="Entreprises déjà intéressées par la démarche"
        type="number"
        min={0}
        value={(value.alreadyInterestedCount as number | undefined) ?? ""}
        hint="Utile pour évaluer la maturité du groupement."
        onChange={(event) =>
          onChange({
            ...value,
            alreadyInterestedCount: event.target.value ? Number(event.target.value) : undefined,
          })
        }
        placeholder="3"
      />
    </div>
  );
}

// --- Etape 3 : activite ---------------------------------------------------

export function ActivityStepForm({ value, onChange, errors }: StepProps<Record<string, unknown>>) {
  const sectors = (value.sectors as string[]) ?? [];

  return (
    <div className="space-y-6">
      <ChoiceGroup
        legend="Secteurs d'activité présents sur la zone"
        hint="Plusieurs réponses possibles."
        error={errors.sectors}
        columns={3}
      >
        {SECTOR_OPTIONS.map((sector) => (
          <ChoiceCard
            key={sector.value}
            type="checkbox"
            label={sector.label}
            checked={sectors.includes(sector.value)}
            onChange={() => onChange({ ...value, sectors: toggleInArray(sectors, sector.value) })}
          />
        ))}
      </ChoiceGroup>

      <ChoiceGroup
        legend="Comment situez-vous le niveau de risque des activités ?"
        hint="Cette appréciation est déclarative. L'audit terrain établit l'évaluation formelle."
        error={errors.riskLevel}
        columns={3}
      >
        <ChoiceCard
          name="risk"
          label="Faible"
          hint="Bureaux, assemblage léger"
          checked={value.riskLevel === "LOW"}
          onChange={() => onChange({ ...value, riskLevel: "LOW" })}
        />
        <ChoiceCard
          name="risk"
          label="Modéré"
          hint="Manutention, logistique"
          checked={value.riskLevel === "MEDIUM"}
          onChange={() => onChange({ ...value, riskLevel: "MEDIUM" })}
        />
        <ChoiceCard
          name="risk"
          label="Élevé"
          hint="Presses, chimie, produits dangereux"
          checked={value.riskLevel === "HIGH"}
          onChange={() => onChange({ ...value, riskLevel: "HIGH" })}
        />
      </ChoiceGroup>

      <ToggleField
        label="Des produits dangereux sont-ils manipulés ou stockés ?"
        hint="Une réponse générale suffit. Nous ne demandons aucun détail industriel confidentiel."
        checked={value.hasHazardousMaterials as boolean | undefined}
        error={errors.hasHazardousMaterials}
        onChange={(checked) => onChange({ ...value, hasHazardousMaterials: checked })}
      />

      <TextField
        label="Contraintes particulières"
        value={(value.constraints as string) ?? ""}
        hint="Zones ATEX, accès restreints, co-activité, travaux en cours…"
        onChange={(event) => onChange({ ...value, constraints: event.target.value })}
      />
    </div>
  );
}

// --- Etape 4 : horaires ---------------------------------------------------

export function ScheduleStepForm({ value, onChange, errors }: StepProps<Record<string, unknown>>) {
  const days = (value.workingDays as string[]) ?? [];

  return (
    <div className="space-y-6">
      <ChoiceGroup
        legend="Jours d'activité de la zone"
        error={errors.workingDays}
        columns={3}
      >
        {DAYS.map((day) => (
          <ChoiceCard
            key={day.value}
            type="checkbox"
            label={day.label}
            checked={days.includes(day.value)}
            onChange={() => onChange({ ...value, workingDays: toggleInArray(days, day.value) })}
          />
        ))}
      </ChoiceGroup>

      <ToggleField
        label="Y a-t-il du travail de nuit ?"
        hint="Le travail de nuit modifie le dimensionnement de la présence infirmière."
        checked={value.nightWork as boolean | undefined}
        error={errors.nightWork}
        onChange={(checked) => onChange({ ...value, nightWork: checked })}
      />

      <ToggleField
        label="Y a-t-il une activité le week-end ?"
        checked={value.weekendWork as boolean | undefined}
        error={errors.weekendWork}
        onChange={(checked) => onChange({ ...value, weekendWork: checked })}
      />

      <ToggleField
        label="Connaissez-vous des pics saisonniers ?"
        checked={value.seasonalPeaks as boolean | undefined}
        error={errors.seasonalPeaks}
        onChange={(checked) => onChange({ ...value, seasonalPeaks: checked })}
      />

      {value.seasonalPeaks === true ? (
        <TextField
          label="Périodes de pic"
          value={(value.seasonalNote as string) ?? ""}
          onChange={(event) => onChange({ ...value, seasonalNote: event.target.value })}
          placeholder="Septembre à décembre"
        />
      ) : null}
    </div>
  );
}

// --- Etape 5 : dispositif existant ---------------------------------------

export function ExistingSetupStepForm({ value, onChange, errors }: StepProps<Record<string, unknown>>) {
  return (
    <div className="space-y-6">
      <ToggleField
        label="Une ambulance est-elle déjà présente sur la zone ?"
        checked={value.hasAmbulance as boolean | undefined}
        error={errors.hasAmbulance}
        onChange={(checked) => onChange({ ...value, hasAmbulance: checked })}
      />

      <ToggleField
        label="Une infirmerie existe-t-elle déjà ?"
        checked={value.hasInfirmary as boolean | undefined}
        error={errors.hasInfirmary}
        onChange={(checked) => onChange({ ...value, hasInfirmary: checked })}
      />

      <ChoiceGroup
        legend="Personnel médical déjà en place"
        error={errors.existingStaff}
        columns={3}
      >
        <ChoiceCard
          name="existingStaff"
          label="Aucun"
          checked={value.existingStaff === "NONE"}
          onChange={() => onChange({ ...value, existingStaff: "NONE" })}
        />
        <ChoiceCard
          name="existingStaff"
          label="Infirmier(ère)"
          checked={value.existingStaff === "NURSE"}
          onChange={() => onChange({ ...value, existingStaff: "NURSE" })}
        />
        <ChoiceCard
          name="existingStaff"
          label="Médecin"
          checked={value.existingStaff === "DOCTOR"}
          onChange={() => onChange({ ...value, existingStaff: "DOCTOR" })}
        />
      </ChoiceGroup>

      <ToggleField
        label="Existe-t-il une convention de médecine du travail ?"
        checked={value.hasOccupationalHealthConvention as boolean | undefined}
        error={errors.hasOccupationalHealthConvention}
        onChange={(checked) => onChange({ ...value, hasOccupationalHealthConvention: checked })}
      />

      <ToggleField
        label="Des contrats externes de secours sont-ils en cours ?"
        checked={value.hasExternalContracts as boolean | undefined}
        error={errors.hasExternalContracts}
        onChange={(checked) => onChange({ ...value, hasExternalContracts: checked })}
      />

      {value.hasExternalContracts === true ? (
        <TextField
          label="Nature de ces contrats"
          value={(value.externalContractsNote as string) ?? ""}
          onChange={(event) => onChange({ ...value, externalContractsNote: event.target.value })}
        />
      ) : null}
    </div>
  );
}

// --- Etape 6 : attentes ---------------------------------------------------

export function ExpectationsStepForm({ value, onChange, errors }: StepProps<Record<string, unknown>>) {
  const modules = (value.desiredModules as string[]) ?? [];

  return (
    <div className="space-y-6">
      <TextField
        label="Délai d'intervention souhaité (minutes)"
        type="number"
        min={1}
        value={(value.targetResponseTimeMinutes as number | undefined) ?? ""}
        hint="À titre indicatif. Le délai contractuel est arrêté après l'audit terrain."
        onChange={(event) =>
          onChange({
            ...value,
            targetResponseTimeMinutes: event.target.value ? Number(event.target.value) : undefined,
          })
        }
        placeholder="10"
      />

      <ChoiceGroup
        legend="Modules qui vous intéressent"
        hint="L'ambulance dédiée constitue le module socle : elle est toujours incluse."
        columns={3}
      >
        <ChoiceCard
          type="checkbox"
          label="Infirmier(ère) permanent(e)"
          checked={modules.includes("NURSE")}
          onChange={() => onChange({ ...value, desiredModules: toggleInArray(modules, "NURSE") })}
        />
        <ChoiceCard
          type="checkbox"
          label="Médecin dédié sur site"
          checked={modules.includes("DOCTOR")}
          onChange={() => onChange({ ...value, desiredModules: toggleInArray(modules, "DOCTOR") })}
        />
        <ChoiceCard
          type="checkbox"
          label="Infirmerie centrale aménagée"
          checked={modules.includes("INFIRMARY")}
          onChange={() => onChange({ ...value, desiredModules: toggleInArray(modules, "INFIRMARY") })}
        />
      </ChoiceGroup>

      <ChoiceGroup legend="Niveau de reporting attendu" error={errors.reportingLevel}>
        <ChoiceCard
          name="reporting"
          label="Standard"
          hint="Rapport mensuel d'activité et de disponibilité"
          checked={value.reportingLevel === "BASIC"}
          onChange={() => onChange({ ...value, reportingLevel: "BASIC" })}
        />
        <ChoiceCard
          name="reporting"
          label="Détaillé"
          hint="Indicateurs étendus, tendances et plans d'action"
          checked={value.reportingLevel === "DETAILED"}
          onChange={() => onChange({ ...value, reportingLevel: "DETAILED" })}
        />
      </ChoiceGroup>

      <ToggleField
        label="Souhaitez-vous des formations aux gestes de secours ?"
        checked={value.trainingInterest as boolean | undefined}
        error={errors.trainingInterest}
        onChange={(checked) => onChange({ ...value, trainingInterest: checked })}
      />

      <ToggleField
        label="Souhaitez-vous un audit terrain gratuit ?"
        checked={value.auditInterest as boolean | undefined}
        error={errors.auditInterest}
        onChange={(checked) => onChange({ ...value, auditInterest: checked })}
      />
    </div>
  );
}

// --- Etape 7 : contact ----------------------------------------------------

export function ContactStepForm({ value, onChange, errors }: StepProps<Record<string, unknown>>) {
  const [showConsentDetail, setShowConsentDetail] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Nom et prénom"
          required
          value={(value.name as string) ?? ""}
          error={errors.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          autoComplete="name"
        />
        <TextField
          label="Fonction"
          value={(value.role as string) ?? ""}
          onChange={(event) => onChange({ ...value, role: event.target.value })}
          placeholder="Directeur QHSE"
          autoComplete="organization-title"
        />
      </div>

      <TextField
        label="Entreprise"
        required
        value={(value.company as string) ?? ""}
        error={errors.company}
        onChange={(event) => onChange({ ...value, company: event.target.value })}
        autoComplete="organization"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Email professionnel"
          type="email"
          required
          value={(value.email as string) ?? ""}
          error={errors.email}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
          autoComplete="email"
        />
        <TextField
          label="Téléphone"
          type="tel"
          value={(value.phone as string) ?? ""}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
          autoComplete="tel"
          placeholder="+212 6 00 00 00 00"
        />
      </div>

      <ChoiceGroup legend="Canal de contact préféré" columns={3}>
        <ChoiceCard
          name="channel"
          label="Email"
          checked={value.preferredChannel === "EMAIL"}
          onChange={() => onChange({ ...value, preferredChannel: "EMAIL" })}
        />
        <ChoiceCard
          name="channel"
          label="Téléphone"
          checked={value.preferredChannel === "PHONE"}
          onChange={() => onChange({ ...value, preferredChannel: "PHONE" })}
        />
        <ChoiceCard
          name="channel"
          label="WhatsApp"
          checked={value.preferredChannel === "WHATSAPP"}
          onChange={() => onChange({ ...value, preferredChannel: "WHATSAPP" })}
        />
      </ChoiceGroup>

      {/* Mention de collecte au point de collecte (loi 09-08 / CNDP). */}
      <div className="rounded-md border border-navy-950/12 bg-mist-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.consent === true}
            onChange={(event) => onChange({ ...value, consent: event.target.checked })}
            className="mt-1 h-4 w-4 shrink-0 accent-petrol-600"
            aria-describedby="consent-detail"
          />
          <span className="text-sm leading-relaxed text-slate-600">
            J&apos;accepte que SANARYS utilise ces informations pour me recontacter au sujet de ma
            simulation et d&apos;un éventuel audit terrain.
            {errors.consent ? (
              <span role="alert" className="mt-1 block font-medium text-danger">
                {errors.consent}
              </span>
            ) : null}
          </span>
        </label>

        <button
          type="button"
          onClick={() => setShowConsentDetail((v) => !v)}
          aria-expanded={showConsentDetail}
          className="mt-3 text-xs font-semibold text-petrol-600 underline underline-offset-2"
        >
          {showConsentDetail ? "Masquer le détail" : "Que faisons-nous de vos données ?"}
        </button>

        {showConsentDetail ? (
          <div id="consent-detail" className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
            <p>
              <strong className="text-navy-950">Responsable :</strong> SANARYS.{" "}
              <strong className="text-navy-950">Finalité :</strong> répondre à votre demande et
              qualifier votre besoin.
            </p>
            <p>
              <strong className="text-navy-950">Destinataires :</strong> les équipes commerciales
              SANARYS uniquement.{" "}
              <strong className="text-navy-950">Durée :</strong> conservation limitée à la durée du
              suivi commercial.
            </p>
            <p>
              Vous disposez d&apos;un droit d&apos;accès, de rectification et d&apos;opposition,
              exerçable à contact@sanarys.ma. Traitement soumis à la loi 09-08 et aux exigences de la
              CNDP. Le retrait de votre consentement est aussi simple que son acceptation.
            </p>
            <p className="font-medium text-navy-950">
              Aucune donnée de santé n&apos;est collectée par ce formulaire.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
