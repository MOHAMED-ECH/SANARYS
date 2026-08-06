import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { AuditRequestResponseSchema, CreateAuditRequestSchema } from "@sanarys/schemas";
import { errorResponses } from "../../../lib/http.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import type { AuditRequestsModule } from "../index.js";

/**
 * Couche presentation. Le lead introuvable remonte du domaine sous forme
 * d'erreur metier ; c'est ici, et seulement ici, qu'elle devient un 404
 * (guide, section 12.2).
 */
export function createAuditRequestsRoutes(module: AuditRequestsModule): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      "/audit-requests",
      {
        config: { rateLimit: { max: 15, timeWindow: "1 minute" } },
        schema: {
          tags: ["audit-requests"],
          summary: "Demande d'audit terrain rattachee a un lead",
          body: CreateAuditRequestSchema,
          response: { 201: AuditRequestResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        const { leadId, preferredDate, notes } = request.body;

        try {
          const auditRequest = await module.requestAudit.execute({
            leadId,
            ...(preferredDate === undefined ? {} : { preferredDate }),
            ...(notes === undefined ? {} : { notes }),
          });

          app.log.info({ auditRequestId: auditRequest.id, leadId }, "demande d'audit enregistree");

          return reply.code(201).send({
            id: auditRequest.id,
            status: auditRequest.status,
            createdAt: auditRequest.createdAt.toISOString(),
          });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );
  };
}
