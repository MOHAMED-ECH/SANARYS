import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Prisma } from "@sanarys/db";
import { z } from "zod";

/**
 * Plan de marquage (cahier des charges section 21.2).
 *
 * Regle stricte : liste blanche d'evenements ET de proprietes. Aucune donnee
 * identifiante (email, telephone, nom), aucun texte libre, aucune donnee de
 * sante ne transite ici. Toute propriete hors liste blanche est ecartee.
 */
const ALLOWED_EVENTS: Record<string, readonly string[]> = {
  view_solution: ["service", "langue", "secteur"],
  start_simulation: ["source", "campagne", "variante"],
  complete_step: ["step_id", "duree", "erreurs"],
  view_result: ["scenario", "modules"],
  request_audit: ["type_organisation", "zone"],
  book_meeting: ["canal", "delai"],
  download_resource: ["asset_id", "theme"],
  portal_login: ["organisation_type", "succes"],
  report_view: ["report_type", "periode"],
  ticket_created: ["categorie", "criticite"],
};

const TrackEventSchema = z.object({
  name: z.string().max(60),
  properties: z
    .record(z.string(), z.union([z.string().max(80), z.number(), z.boolean()]))
    .default({}),
  sessionRef: z.string().max(64).optional(),
});

/** Ne conserve que les proprietes explicitement autorisees pour cet evenement. */
export function sanitizeEventProperties(
  name: string,
  properties: Record<string, unknown>,
): Record<string, unknown> | null {
  const allowed = ALLOWED_EVENTS[name];
  if (!allowed) return null;

  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in properties) {
      result[key] = properties[key];
    }
  }
  return result;
}

export const analyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/events",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
      schema: {
        tags: ["analytics"],
        summary: "Enregistre un evenement du plan de marquage (liste blanche stricte)",
        body: TrackEventSchema,
        response: { 202: z.object({ accepted: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const { name, properties, sessionRef } = request.body;
      const sanitized = sanitizeEventProperties(name, properties);

      if (!sanitized) {
        // Evenement hors plan de marquage : refuse sans detailler.
        return reply.code(202).send({ accepted: false });
      }

      await app.prisma.analyticsEvent.create({
        data: {
          name,
          properties: sanitized as Prisma.InputJsonValue,
          sessionRef: sessionRef ?? null,
        },
      });

      return reply.code(202).send({ accepted: true });
    },
  );
};
