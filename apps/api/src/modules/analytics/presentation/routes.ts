import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AnalyticsModule } from "../index.js";

/**
 * Contrat de transport. Les bornes (longueurs, types acceptes) sont une
 * protection d'entree ; le filtrage metier des proprietes reste dans le domaine.
 */
const TrackEventSchema = z.object({
  name: z.string().max(60),
  properties: z
    .record(z.string(), z.union([z.string().max(80), z.number(), z.boolean()]))
    .default({}),
  sessionRef: z.string().max(64).optional(),
});

export function createAnalyticsRoutes(module: AnalyticsModule): FastifyPluginAsyncZod {
  return async (app) => {
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
        const outcome = await module.recordAnalyticsEvent.execute({
          name,
          properties,
          ...(sessionRef === undefined ? {} : { sessionRef }),
        });

        // 202 dans les deux cas : accepter ou ecarter reste indiscernable pour
        // l'appelant, qui n'a pas a decouvrir le plan de marquage par sondage.
        return reply.code(202).send(outcome);
      },
    );
  };
}
