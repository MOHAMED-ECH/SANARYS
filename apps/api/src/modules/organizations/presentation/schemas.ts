import { z } from "zod";

/**
 * Contrats de transport du portail. Ils vivent dans la couche presentation :
 * ce sont les formes exposees en HTTP, pas les modeles du domaine.
 */

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["GROUPEMENT", "COMPANY", "ZONE_MANAGER"]),
  industrialZoneName: z.string().nullable(),
  memberCount: z.number(),
  siteCount: z.number(),
});

export const ContractSchema = z.object({
  id: z.string(),
  label: z.string(),
  modules: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: z.string(),
  parties: z.array(
    z.object({
      organizationId: z.string(),
      organizationName: z.string(),
      sharePercent: z.number().nullable(),
    }),
  ),
});

export const ReportSchema = z.object({
  id: z.string(),
  period: z.string(),
  kpi: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  publishedAt: z.string().nullable(),
});

export const MemberSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(["ORG_ADMIN", "HSE_MANAGER", "COMPANY_DIRECTOR", "ZONE_MANAGER", "VIEWER"]),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED"]),
  mfaEnabled: z.boolean(),
  invitedAt: z.string(),
  activatedAt: z.string().nullable(),
});

/** Metadonnees d'un document du portail. Le contenu passe par la route de telechargement. */
export const DocumentSchema = z.object({
  id: z.string(),
  kind: z.enum(["CONTRACT", "REPORT", "SIMULATION_SUMMARY", "OTHER"]),
  label: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nullable(),
  createdAt: z.string(),
});
