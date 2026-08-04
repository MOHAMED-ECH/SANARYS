import { z } from "zod";

/**
 * Auth Phase 2 - session premiere partie (cookie httpOnly, rotation, revocation),
 * derriere une interface remplacable. PAS un fournisseur OIDC/SSO : a substituer
 * avant toute mise en production reelle (cahier des charges section 16.1).
 *
 * Ces schemas sont des CONTRATS D'API uniquement - jamais les modeles Prisma.
 */

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AcceptInviteRequestSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(12).max(200),
});
export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequestSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(12).max(200),
});

export const MembershipRoleEnum = z.enum([
  "ORG_ADMIN",
  "HSE_MANAGER",
  "COMPANY_DIRECTOR",
  "ZONE_MANAGER",
  "VIEWER",
]);
export type MembershipRole = z.infer<typeof MembershipRoleEnum>;

export const StaffRoleEnum = z.enum(["ADMIN", "SALES", "OPERATIONS"]);

export const OrgTypeEnum = z.enum(["GROUPEMENT", "COMPANY", "ZONE_MANAGER"]);

export const MembershipDtoSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  organizationType: OrgTypeEnum,
  role: MembershipRoleEnum,
});

export const MeResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  staffRole: StaffRoleEnum.nullable(),
  memberships: z.array(MembershipDtoSchema),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const InviteUserRequestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(160),
  role: MembershipRoleEnum,
});
