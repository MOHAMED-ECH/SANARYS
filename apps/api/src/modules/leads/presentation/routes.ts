import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { CreateLeadRequestSchema, LeadResponseSchema } from "@sanarys/schemas";
import { errorResponses } from "../../../lib/http.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import type { LeadsModule } from "../index.js";

/**
 * Couche presentation : traduction HTTP uniquement. Elle valide, appelle un cas
 * d'usage, serialise. Aucune regle metier, aucun acces ORM (guide, section 10.1).
 */
export function createLeadsRoutes(module: LeadsModule): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      "/leads",
      {
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
        schema: {
          tags: ["leads"],
          summary: "Enregistre une demande de contact (dedoublonnee, avec preuve de consentement)",
          body: CreateLeadRequestSchema,
          response: { 201: LeadResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const { lead, isNew } = await module.submitLead.execute(request.body);

          app.log.info({ leadId: lead.id, isNew, priority: lead.priority }, "lead enregistre");

          return reply.code(201).send({
            id: lead.id,
            status: lead.status,
            createdAt: lead.createdAt.toISOString(),
          });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/leads/:id/exists",
      {
        schema: {
          tags: ["leads"],
          summary: "Verifie l'existence d'un lead (utilise par le parcours de confirmation)",
          params: z.object({ id: z.string() }),
          response: { 200: z.object({ exists: z.boolean() }) },
        },
      },
      async (request) => module.checkLeadExists.execute(request.params.id),
    );
  };
}
