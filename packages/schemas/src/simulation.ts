import { z } from "zod";

/**
 * Contrats partages front/back du simulateur CSPS (cahier des charges, section 8).
 * Le simulateur ne produit JAMAIS un devis contractuel : le resultat est toujours
 * indicatif, horodate, rattache a une version de regles, et invite a un audit terrain.
 */

export const SectorEnum = z.enum([
  "AUTOMOBILE",
  "LOGISTIQUE",
  "TEXTILE",
  "AGROALIMENTAIRE",
  "PLASTURGIE",
  "EVENEMENTIEL",
  "ASSURANCE",
  "AUTRE",
]);
export type Sector = z.infer<typeof SectorEnum>;

export const RiskLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const SizeBracketEnum = z.enum(["LT_20", "B20_50", "B50_150", "GTE_150"]);

export const ExistingStaffEnum = z.enum(["NONE", "NURSE", "DOCTOR"]);

export const ReportingLevelEnum = z.enum(["BASIC", "DETAILED"]);

export const PreferredChannelEnum = z.enum(["EMAIL", "PHONE", "WHATSAPP"]);

export const DesiredModuleEnum = z.enum(["NURSE", "DOCTOR", "INFIRMARY"]);

// --- Etapes du wizard --------------------------------------------------------

export const ZoneStepSchema = z.object({
  city: z.string().min(1).max(120),
  zoneName: z.string().min(1).max(160),
  surfaceM2: z.number().positive().max(10_000_000).optional(),
  roadAccess: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  industrialZoneId: z.string().optional(),
});
export type ZoneStep = z.infer<typeof ZoneStepSchema>;

export const CompaniesStepSchema = z.object({
  numberOfCompanies: z.number().int().min(1).max(500),
  sizeBrackets: z.array(SizeBracketEnum).min(1),
  totalHeadcount: z.number().int().min(1).max(200_000),
  alreadyInterestedCount: z.number().int().min(0).optional(),
});
export type CompaniesStep = z.infer<typeof CompaniesStepSchema>;

export const ActivityStepSchema = z.object({
  sectors: z.array(SectorEnum).min(1),
  riskLevel: RiskLevelEnum,
  constraints: z.string().max(1000).optional(),
  hasHazardousMaterials: z.boolean(),
});
export type ActivityStep = z.infer<typeof ActivityStepSchema>;

export const ScheduleStepSchema = z.object({
  workingDays: z.array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])).min(1),
  nightWork: z.boolean(),
  weekendWork: z.boolean(),
  seasonalPeaks: z.boolean(),
  seasonalNote: z.string().max(500).optional(),
});
export type ScheduleStep = z.infer<typeof ScheduleStepSchema>;

export const ExistingSetupStepSchema = z.object({
  hasAmbulance: z.boolean(),
  hasInfirmary: z.boolean(),
  existingStaff: ExistingStaffEnum,
  hasOccupationalHealthConvention: z.boolean(),
  hasExternalContracts: z.boolean(),
  externalContractsNote: z.string().max(500).optional(),
});
export type ExistingSetupStep = z.infer<typeof ExistingSetupStepSchema>;

export const ExpectationsStepSchema = z.object({
  targetResponseTimeMinutes: z.number().positive().max(120).optional(),
  desiredModules: z.array(DesiredModuleEnum).default([]),
  reportingLevel: ReportingLevelEnum,
  trainingInterest: z.boolean(),
  auditInterest: z.boolean(),
});
export type ExpectationsStep = z.infer<typeof ExpectationsStepSchema>;

export const ContactStepSchema = z.object({
  name: z.string().min(1).max(160),
  role: z.string().max(160).optional(),
  company: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Le consentement est requis pour poursuivre." }),
  }),
  consentVersion: z.string().default("2026.08.0"),
  preferredChannel: PreferredChannelEnum.optional(),
});
export type ContactStep = z.infer<typeof ContactStepSchema>;

// --- Entree agregee (sauvegarde incrementale via PATCH) --------------------

export const SimulationInputSchema = z.object({
  zone: ZoneStepSchema.optional(),
  companies: CompaniesStepSchema.optional(),
  activity: ActivityStepSchema.optional(),
  schedule: ScheduleStepSchema.optional(),
  existingSetup: ExistingSetupStepSchema.optional(),
  expectations: ExpectationsStepSchema.optional(),
  contact: ContactStepSchema.optional(),
});
export type SimulationInput = z.infer<typeof SimulationInputSchema>;

/** Sous-ensemble requis pour pouvoir executer le moteur de regles ("complete"). */
export const SimulationInputCompleteSchema = z.object({
  zone: ZoneStepSchema,
  companies: CompaniesStepSchema,
  activity: ActivityStepSchema,
  schedule: ScheduleStepSchema,
  existingSetup: ExistingSetupStepSchema,
  expectations: ExpectationsStepSchema,
  contact: ContactStepSchema,
});

// --- Resultat ----------------------------------------------------------------

export const RuleOutcomeSchema = z.object({
  ruleId: z.string(),
  rationale: z.string(),
});

export const SimulationResultSchema = z.object({
  ruleSetVersion: z.string(),
  vehicleType: RuleOutcomeSchema.extend({ code: z.enum(["TYPE_B", "TYPE_C"]) }),
  suggestedModules: z.array(RuleOutcomeSchema.extend({ code: DesiredModuleEnum })),
  coverage: RuleOutcomeSchema.extend({
    targetLabel: z.string(),
    disclaimer: z.string(),
  }),
  costShare: RuleOutcomeSchema.extend({ formula: z.string() }),
  assumptions: z.array(z.string()),
  generatedAt: z.string(),
});
export type SimulationResult = z.infer<typeof SimulationResultSchema>;

// --- Contrats API --------------------------------------------------------------

export const StartSimulationResponseSchema = z.object({
  id: z.string(),
  resumeToken: z.string(),
});

export const PatchSimulationRequestSchema = z.object({
  step: z.enum(["zone", "companies", "activity", "schedule", "existingSetup", "expectations", "contact"]),
  data: z.record(z.string(), z.unknown()),
});

export const SimulationRecordSchema = z.object({
  id: z.string(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]),
  input: SimulationInputSchema,
  result: SimulationResultSchema.nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type SimulationRecord = z.infer<typeof SimulationRecordSchema>;

export const CompleteSimulationResponseSchema = z.object({
  id: z.string(),
  result: SimulationResultSchema,
  pdfUrl: z.string(),
});
