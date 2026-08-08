import { z } from "zod";
import { PreferredChannelEnum } from "./simulation.js";

export const CreateLeadRequestSchema = z.object({
  contactName: z.string().min(1).max(160),
  contactRole: z.string().max(160).optional(),
  companyName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).optional(),
  preferredChannel: PreferredChannelEnum.optional(),
  industrialZoneId: z.string().optional(),
  source: z.string().max(120).optional(),
  campaign: z.string().max(120).optional(),
  consentMarketing: z.boolean(),
  consentVersion: z.string().default("2026.08.0"),
  simulationId: z.string().optional(),
  simulationResumeToken: z.string().min(10).optional(),
});
export type CreateLeadRequest = z.infer<typeof CreateLeadRequestSchema>;

export const LeadResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
