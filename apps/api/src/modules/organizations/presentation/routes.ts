import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { InviteUserRequestSchema } from "@sanarys/schemas";
import { errorResponses } from "../../../lib/http.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import type { OrganizationsModule } from "../index.js";
import {
  ContractSchema,
  MemberSchema,
  OrganizationSchema,
  ReportSchema,
} from "./schemas.js";

/**
 * Portail client — couche presentation.
 *
 * Les routes ne comparent aucun identifiant d'organisation : la decision et le
 * perimetre sont calcules dans les cas d'usage, a partir de l'acteur charge par
 * `requireAuth`. Un refus remonte en erreur metier et devient un 404 ou un 403
 * selon ce que le domaine a decide, jamais selon un choix pris ici.
 */
export function createOrganizationsRoutes(module: OrganizationsModule): FastifyPluginAsyncZod {
  return async (app) => {
    const params = z.object({ id: z.string() });

    app.get(
      "/organizations/:id",
      {
        preHandler: app.requireAuth,
        schema: {
          tags: ["portail"],
          summary: "Organisation accessible à l'utilisateur",
          params,
          response: { 200: OrganizationSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const organization = await module.getOrganization.execute({
            actor: request.actor!,
            organizationId: request.params.id,
            ip: request.ip,
          });
          return reply.send(organization);
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/organizations/:id/contracts",
      {
        preHandler: app.requireAuth,
        schema: {
          tags: ["portail"],
          summary: "Contrats de l'organisation",
          params,
          response: { 200: z.array(ContractSchema), ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const contracts = await module.listContracts.execute({
            actor: request.actor!,
            organizationId: request.params.id,
            ip: request.ip,
          });

          return reply.send(
            contracts.map((contract) => ({
              ...contract,
              modules: [...contract.modules],
              startDate: contract.startDate.toISOString(),
              endDate: contract.endDate?.toISOString() ?? null,
              parties: contract.parties.map((party) => ({ ...party })),
            })),
          );
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/organizations/:id/reports",
      {
        preHandler: app.requireAuth,
        schema: {
          tags: ["portail"],
          summary: "Rapports mensuels agrégés publiés",
          params,
          response: { 200: z.array(ReportSchema), ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const reports = await module.listReports.execute({
            actor: request.actor!,
            organizationId: request.params.id,
            ip: request.ip,
          });

          return reply.send(
            reports.map((report) => ({
              ...report,
              publishedAt: report.publishedAt?.toISOString() ?? null,
            })),
          );
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/organizations/:id/members",
      {
        preHandler: app.requireAuth,
        schema: {
          tags: ["portail"],
          summary: "Membres de l'organisation",
          params,
          response: { 200: z.array(MemberSchema), ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const members = await module.listMembers.execute({
            actor: request.actor!,
            organizationId: request.params.id,
            ip: request.ip,
          });

          return reply.send(
            members.map((member) => ({
              ...member,
              invitedAt: member.invitedAt.toISOString(),
              activatedAt: member.activatedAt?.toISOString() ?? null,
            })),
          );
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.post(
      "/organizations/:id/users/invite",
      {
        preHandler: app.requireAuth,
        config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
        schema: {
          tags: ["portail"],
          summary: "Invite un utilisateur dans l'organisation",
          params,
          body: InviteUserRequestSchema,
          response: { 201: z.object({ id: z.string() }), ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const { userId } = await module.inviteMember.execute({
            actor: request.actor!,
            organizationId: request.params.id,
            ip: request.ip,
            email: request.body.email,
            fullName: request.body.fullName,
            role: request.body.role,
          });
          return reply.code(201).send({ id: userId });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );
  };
}
