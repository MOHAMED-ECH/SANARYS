import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { CreateLeadRequestSchema, LeadResponseSchema } from "@sanarys/schemas";
import { errorResponses } from "../../lib/http.js";
import { LeadService } from "./service.js";

export const leadsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new LeadService(app.prisma);

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
      const { lead, isNew } = await service.createOrUpdate(request.body);

      // Synchronisation CRM (adaptateur no-op dans ce build). La file interne
      // /staff/leads reste la source consultable en toutes circonstances.
      const crmStatus = await app.crm.syncLead({
        leadId: lead.id,
        contactName: lead.contactName,
        companyName: lead.companyName,
        contactEmail: lead.contactEmail,
        source: lead.source ?? undefined,
        campaign: lead.campaign ?? undefined,
      });
      await app.prisma.lead.update({
        where: { id: lead.id },
        data: { crmSyncStatus: crmStatus },
      });

      // Notification de prise en charge (adaptateur console dans ce build).
      await app.notifications.send({
        to: "commercial@sanarys.ma",
        channel: "EMAIL",
        template: isNew ? "lead.created" : "lead.updated",
        variables: { leadId: lead.id, companyName: lead.companyName, priority: lead.priority },
      });

      app.log.info({ leadId: lead.id, isNew, priority: lead.priority }, "lead enregistre");

      return reply.code(201).send({
        id: lead.id,
        status: lead.status,
        createdAt: lead.createdAt.toISOString(),
      });
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
    async (request) => {
      const count = await app.prisma.lead.count({ where: { id: request.params.id } });
      return { exists: count > 0 };
    },
  );
};
