import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { AuditRequestResponseSchema, CreateAuditRequestSchema } from "@sanarys/schemas";
import { errorResponses } from "../../lib/http.js";

export const auditRequestsRoutes: FastifyPluginAsyncZod = async (app) => {
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

      const lead = await app.prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return reply.code(404).send({ message: "Lead introuvable." });
      }

      const auditRequest = await app.prisma.auditRequest.create({
        data: {
          leadId,
          preferredDate: preferredDate ? new Date(preferredDate) : null,
          notes: notes ?? null,
        },
      });

      // Le lead progresse dans le cycle commercial et l'historique le trace.
      await app.prisma.lead.update({
        where: { id: leadId },
        data: { status: "AUDIT_REQUESTED", priority: "HIGH" },
      });
      await app.prisma.leadEvent.create({
        data: {
          leadId,
          type: "AUDIT_REQUESTED",
          message: preferredDate
            ? `Audit terrain demandé (date souhaitée : ${new Date(preferredDate).toLocaleDateString("fr-FR")}).`
            : "Audit terrain demandé.",
        },
      });

      await app.notifications.send({
        to: "commercial@sanarys.ma",
        channel: "EMAIL",
        template: "audit.requested",
        variables: { auditRequestId: auditRequest.id, leadId, companyName: lead.companyName },
      });

      app.log.info({ auditRequestId: auditRequest.id, leadId }, "demande d'audit enregistree");

      return reply.code(201).send({
        id: auditRequest.id,
        status: auditRequest.status,
        createdAt: auditRequest.createdAt.toISOString(),
      });
    },
  );
};
