import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponses } from "../../lib/http.js";
import { can } from "../authz/index.js";

/**
 * File de leads interne SANARYS.
 *
 * Sans cette file, un lead cree par le site public n'existerait nulle part
 * pour l'equipe commerciale : le CRM etant mocke dans ce build, c'est ici
 * que la demande d'un dirigeant devient reellement exploitable.
 */

const LeadListItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  priority: z.string(),
  score: z.number().nullable(),
  companyName: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string().nullable(),
  preferredChannel: z.string().nullable(),
  source: z.string().nullable(),
  zoneName: z.string().nullable(),
  ownerRef: z.string().nullable(),
  nextActionAt: z.string().nullable(),
  hasSimulation: z.boolean(),
  auditRequestCount: z.number(),
  crmSyncStatus: z.string(),
  createdAt: z.string(),
});

const LeadDetailSchema = LeadListItemSchema.extend({
  consentMarketing: z.boolean(),
  consentVersion: z.string().nullable(),
  consentTimestamp: z.string().nullable(),
  simulationId: z.string().nullable(),
  events: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      message: z.string().nullable(),
      actorRef: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

const UpdateLeadSchema = z.object({
  status: z
    .enum(["NEW", "QUALIFIED", "CONTACTED", "AUDIT_REQUESTED", "PROPOSAL_SENT", "CLOSED_LOST", "CLOSED_WON"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  ownerRef: z.string().max(120).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  note: z.string().max(1000).optional(),
});

export const staffRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/staff/leads",
    {
      preHandler: app.requireStaff,
      schema: {
        tags: ["staff"],
        summary: "File des leads commerciaux",
        querystring: z.object({
          status: z.string().optional(),
          priority: z.string().optional(),
          overdue: z.enum(["true", "false"]).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(50),
        }),
        response: {
          200: z.object({ items: z.array(LeadListItemSchema), total: z.number() }),
          ...errorResponses,
        },
      },
    },
    async (request, reply) => {
      if (!can(request.actor!, "lead:read")) {
        return reply.code(403).send({ message: "Accès non autorisé à la file commerciale." });
      }

      const { status, priority, overdue, limit } = request.query;

      const where = {
        ...(status ? { status: status as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...(overdue === "true" ? { nextActionAt: { lt: new Date() } } : {}),
      };

      const [leads, total] = await Promise.all([
        app.prisma.lead.findMany({
          where,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: limit,
          include: { industrialZone: true, _count: { select: { auditRequests: true } } },
        }),
        app.prisma.lead.count({ where }),
      ]);

      await app.audit(request, {
        action: "staff.leads_listed",
        resourceType: "lead",
        metadata: { count: leads.length },
      });

      return reply.send({
        total,
        items: leads.map((lead) => ({
          id: lead.id,
          status: lead.status,
          priority: lead.priority,
          score: lead.score,
          companyName: lead.companyName,
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          contactPhone: lead.contactPhone,
          preferredChannel: lead.preferredChannel,
          source: lead.source,
          zoneName: lead.industrialZone?.name ?? null,
          ownerRef: lead.ownerRef,
          nextActionAt: lead.nextActionAt?.toISOString() ?? null,
          hasSimulation: Boolean(lead.simulationId),
          auditRequestCount: lead._count.auditRequests,
          crmSyncStatus: lead.crmSyncStatus,
          createdAt: lead.createdAt.toISOString(),
        })),
      });
    },
  );

  app.get(
    "/staff/leads/:id",
    {
      preHandler: app.requireStaff,
      schema: {
        tags: ["staff"],
        summary: "Détail d'un lead et historique commercial",
        params: z.object({ id: z.string() }),
        response: { 200: LeadDetailSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      if (!can(request.actor!, "lead:read")) {
        return reply.code(403).send({ message: "Accès non autorisé." });
      }

      const lead = await app.prisma.lead.findUnique({
        where: { id: request.params.id },
        include: {
          industrialZone: true,
          events: { orderBy: { createdAt: "desc" } },
          _count: { select: { auditRequests: true } },
        },
      });

      if (!lead) return reply.code(404).send({ message: "Lead introuvable." });

      await app.audit(request, {
        action: "staff.lead_viewed",
        resourceType: "lead",
        resourceId: lead.id,
      });

      return reply.send({
        id: lead.id,
        status: lead.status,
        priority: lead.priority,
        score: lead.score,
        companyName: lead.companyName,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        preferredChannel: lead.preferredChannel,
        source: lead.source,
        zoneName: lead.industrialZone?.name ?? null,
        ownerRef: lead.ownerRef,
        nextActionAt: lead.nextActionAt?.toISOString() ?? null,
        hasSimulation: Boolean(lead.simulationId),
        auditRequestCount: lead._count.auditRequests,
        crmSyncStatus: lead.crmSyncStatus,
        createdAt: lead.createdAt.toISOString(),
        consentMarketing: lead.consentMarketing,
        consentVersion: lead.consentVersion,
        consentTimestamp: lead.consentTimestamp?.toISOString() ?? null,
        simulationId: lead.simulationId,
        events: lead.events.map((event) => ({
          id: event.id,
          type: event.type,
          message: event.message,
          actorRef: event.actorRef,
          createdAt: event.createdAt.toISOString(),
        })),
      });
    },
  );

  app.patch(
    "/staff/leads/:id",
    {
      preHandler: app.requireStaff,
      schema: {
        tags: ["staff"],
        summary: "Fait avancer un lead dans le cycle commercial",
        params: z.object({ id: z.string() }),
        body: UpdateLeadSchema,
        response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      if (!can(request.actor!, "lead:write")) {
        return reply.code(403).send({ message: "Accès non autorisé." });
      }

      const lead = await app.prisma.lead.findUnique({ where: { id: request.params.id } });
      if (!lead) return reply.code(404).send({ message: "Lead introuvable." });

      const { status, priority, ownerRef, nextActionAt, note } = request.body;

      await app.prisma.lead.update({
        where: { id: lead.id },
        data: {
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(ownerRef !== undefined ? { ownerRef } : {}),
          ...(nextActionAt !== undefined
            ? { nextActionAt: nextActionAt ? new Date(nextActionAt) : null }
            : {}),
        },
      });

      // Chaque changement laisse une trace consultable dans l'historique.
      const changes: string[] = [];
      if (status && status !== lead.status) changes.push(`statut : ${lead.status} → ${status}`);
      if (priority && priority !== lead.priority) changes.push(`priorité : ${priority}`);
      if (ownerRef !== undefined) changes.push(`affecté à : ${ownerRef ?? "personne"}`);

      await app.prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          type: note ? "NOTE" : "UPDATED",
          message: note ?? (changes.length ? changes.join(" · ") : "Mise à jour."),
          actorRef: request.actor!.userId,
        },
      });

      await app.audit(request, {
        action: "staff.lead_updated",
        resourceType: "lead",
        resourceId: lead.id,
        metadata: { status, priority },
      });

      return reply.send({ ok: true });
    },
  );
};
