import { z } from "zod";

/** Corps de reponse d'erreur unique pour toute l'API. */
export const ErrorResponseSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

export const errorResponses = {
  400: ErrorResponseSchema,
  401: ErrorResponseSchema,
  403: ErrorResponseSchema,
  404: ErrorResponseSchema,
  409: ErrorResponseSchema,
  422: ErrorResponseSchema,
  503: ErrorResponseSchema,
} as const;
