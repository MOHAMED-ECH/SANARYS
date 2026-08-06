import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponses } from "../../../lib/http.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import type { QueuedLead } from "../domain/ports.js";
import type { StaffModule } from "../index.js";

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
    .enum([
      "NEW",
      "QUALIFIED",
      "CONTACTED",
      "AUDIT_REQUESTED",
      "PROPOSAL_SENT",
      "CLOSED_LOST",
      "CLOSED_WON",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  ownerRef: z.string().max(120).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  note: z.string().max(1000).optional(),
});

const serializeLead = (lead: QueuedLead) => ({
  ...lead,
  nextActionAt: lead.nextActionAt?.toISOString() ?? null,
  createdAt: lead.createdAt.toISOString(),
});

export function createStaffRoutes(module: StaffModule): FastifyPluginAsyncZod {
  return async (app) => {
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
        try {
          const { items, total } = await module.listLeadQueue.execute({
            actor: request.actor!,
            ip: request.ip,
            status: request.query.status,
            priority: request.query.priority,
            overdue: request.query.overdue === "true",
            limit: request.query.limit,
          });

          return reply.send({ total, items: items.map(serializeLead) });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
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
        try {
          const lead = await module.getLeadDetail.execute({
            actor: request.actor!,
            ip: request.ip,
            leadId: request.params.id,
          });

          return reply.send({
            ...serializeLead(lead),
            consentMarketing: lead.consentMarketing,
            consentVersion: lead.consentVersion,
            consentTimestamp: lead.consentTimestamp?.toISOString() ?? null,
            simulationId: lead.simulationId,
            events: lead.events.map((event) => ({
              ...event,
              createdAt: event.createdAt.toISOString(),
            })),
          });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
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
        const { status, priority, ownerRef, nextActionAt, note } = request.body;

        try {
          await module.updateLead.execute({
            actor: request.actor!,
            ip: request.ip,
            leadId: request.params.id,
            update: {
              ...(status === undefined ? {} : { status }),
              ...(priority === undefined ? {} : { priority }),
              ...(ownerRef === undefined ? {} : { ownerRef }),
              ...(nextActionAt === undefined
                ? {}
                : { nextActionAt: nextActionAt ? new Date(nextActionAt) : null }),
              ...(note === undefined ? {} : { note }),
            },
          });

          return reply.send({ ok: true });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );
  };
}
