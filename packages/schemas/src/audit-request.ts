import { z } from "zod";

export const CreateAuditRequestSchema = z.object({
  leadId: z.string(),
  preferredDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateAuditRequest = z.infer<typeof CreateAuditRequestSchema>;

export const AuditRequestResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
