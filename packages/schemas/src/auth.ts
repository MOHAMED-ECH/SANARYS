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

/**
 * Reponse de /auth/login.
 *
 * Un mot de passe correct n'ouvre plus forcement une session : quand le second
 * facteur est actif, il ouvre un defi. Le contrat expose donc deux formes, et
 * le client est oblige de les distinguer — c'est exactement ce qu'on veut,
 * plutot qu'un champ optionnel qu'on oublie de tester.
 */
export const MfaRequiredResponseSchema = z.object({
  mfaRequired: z.literal(true),
});

export const LoginResponseSchema = z.union([MfaRequiredResponseSchema, MeResponseSchema]);
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Code de second facteur : six chiffres TOTP, ou un code de secours.
 *
 * La borne haute est volontairement large : les codes de secours sont plus
 * longs que les codes TOTP, et l'utilisateur peut les recopier avec des
 * separateurs.
 */
export const MfaCodeSchema = z
  .string()
  .trim()
  .min(6)
  .max(24)
  .describe("Code à six chiffres de l'application d'authentification, ou code de secours");

export const MfaVerifyRequestSchema = z.object({
  code: MfaCodeSchema,
});
export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequestSchema>;

export const MfaStatusResponseSchema = z.object({
  enabled: z.boolean(),
  /** Nombre de codes de secours encore utilisables. */
  remainingRecoveryCodes: z.number().int().min(0),
});
export type MfaStatusResponse = z.infer<typeof MfaStatusResponseSchema>;

export const MfaEnrollResponseSchema = z.object({
  /** Secret base32, pour une saisie manuelle si le QR code est inutilisable. */
  secret: z.string(),
  /** URI `otpauth://` a encoder en QR code. */
  uri: z.string(),
});
export type MfaEnrollResponse = z.infer<typeof MfaEnrollResponseSchema>;

/** Les codes de secours ne sont retournes qu'ici, une seule fois. */
export const MfaConfirmResponseSchema = z.object({
  recoveryCodes: z.array(z.string()),
});
export type MfaConfirmResponse = z.infer<typeof MfaConfirmResponseSchema>;

export const MfaDisableRequestSchema = z.object({
  password: z.string().min(8).max(200),
});
export type MfaDisableRequest = z.infer<typeof MfaDisableRequestSchema>;

export const InviteUserRequestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(160),
  role: MembershipRoleEnum,
});
