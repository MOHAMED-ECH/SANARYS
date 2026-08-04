import { z } from "zod";

/** Corps de reponse d'erreur unique pour toute l'API (guide, section 11.1). */
export const ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

/**
 * Statuts d'erreur declares sur les routes. Ils correspondent aux categories
 * d'erreurs de domaine traduites par `error-mapper`.
 */
export const errorResponses = {
  400: ErrorResponseSchema,
  401: ErrorResponseSchema,
  403: ErrorResponseSchema,
  404: ErrorResponseSchema,
  409: ErrorResponseSchema,
  422: ErrorResponseSchema,
  429: ErrorResponseSchema,
  503: ErrorResponseSchema,
} as const;
