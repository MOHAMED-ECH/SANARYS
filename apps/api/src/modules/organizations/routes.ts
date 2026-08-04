import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { InviteUserRequestSchema } from "@sanarys/schemas";
import { errorResponses } from "../../lib/http.js";
import { accessibleOrganizationIds, can } from "../authz/index.js";

/**
 * Portail client. Toute lecture est doublement protegee :
 *  1. decision d'autorisation via `can()` ;
 *  2. scoping systematique de la requete sur le perimetre de l'acteur.
 *
 * Les rapports ne contiennent que des agregats : aucune donnee de sante
 * individuelle n'existe dans ce modele (cf. schema Prisma).
 */

const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["GROUPEMENT", "COMPANY", "ZONE_MANAGER"]),
  industrialZoneName: z.string().nullable(),
  memberCount: z.number(),
  siteCount: z.number(),
});

const ContractSchema = z.object({
  id: z.string(),
  label: z.string(),
  modules: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: z.string(),
  parties: z.array(
    z.object({
      organizationId: z.string(),
      organizationName: z.string(),
      sharePercent: z.number().nullable(),
    }),
  ),
});

const ReportSchema = z.object({
  id: z.string(),
  period: z.string(),
  kpi: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  publishedAt: z.string().nullable(),
});

const MemberSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(["ORG_ADMIN", "HSE_MANAGER", "COMPANY_DIRECTOR", "ZONE_MANAGER", "VIEWER"]),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED"]),
  mfaEnabled: z.boolean(),
  invitedAt: z.string(),
  activatedAt: z.string().nullable(),
});

export const organizationsRoutes: FastifyPluginAsyncZod = async (app) => {
  /** Verifie l'autorisation ET renvoie le scope applicable, ou null si refus. */
  function guard(request: { actor?: Parameters<typeof can>[0] }, organizationId: string, action: Parameters<typeof can>[1]) {
    const actor = request.actor;
    if (!actor) return null;
    if (!can(actor, action, { organizationId })) return null;
    const scope = accessibleOrganizationIds(actor);
    return scope.includes(organizationId) ? scope : null;
  }

  app.get(
    "/organizations/:id",
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ["portail"],
        summary: "Organisation accessible à l'utilisateur",
        params: z.object({ id: z.string() }),
        response: { 200: OrganizationSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      const scope = guard(request, request.params.id, "organization:read");
      if (!scope) {
        await app.audit(request, {
          action: "portal.access_denied",
          resourceType: "organization",
          resourceId: request.params.id,
        });
        // Meme reponse qu'une ressource inexistante : aucune divulgation.
        return reply.code(404).send({ message: "Organisation introuvable." });
      }

      const organization = await app.prisma.organization.findFirst({
        where: { id: request.params.id, ...(scope.length ? { id: { in: scope } } : {}) },
        include: {
          industrialZone: true,
          _count: { select: { children: true, sites: true } },
        },
      });

      if (!organization) return reply.code(404).send({ message: "Organisation introuvable." });

      return reply.send({
        id: organization.id,
        name: organization.name,
        type: organization.type,
        industrialZoneName: organization.industrialZone?.name ?? null,
        memberCount: organization._count.children,
        siteCount: organization._count.sites,
      });
    },
  );

  app.get(
    "/organizations/:id/contracts",
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ["portail"],
        summary: "Contrats de l'organisation",
        params: z.object({ id: z.string() }),
        response: { 200: z.array(ContractSchema), ...errorResponses },
      },
    },
    async (request, reply) => {
      const scope = guard(request, request.params.id, "contract:read");
      if (!scope) return reply.code(404).send({ message: "Organisation introuvable." });

      // Contrats portes par l'organisation OU auxquels elle est partie prenante,
      // dans les deux cas restreints au perimetre de l'acteur.
      const contracts = await app.prisma.contract.findMany({
        where: {
          OR: [
            { organizationId: request.params.id },
            { parties: { some: { organizationId: request.params.id } } },
          ],
          organization: { id: { in: scope } },
        },
        include: { parties: { include: { organization: true } } },
        orderBy: { startDate: "desc" },
      });

      await app.audit(request, {
        action: "portal.contracts_listed",
        resourceType: "organization",
        resourceId: request.params.id,
        metadata: { count: contracts.length },
      });

      return reply.send(
        contracts.map((contract) => ({
          id: contract.id,
          label: contract.label,
          modules: contract.modules,
          startDate: contract.startDate.toISOString(),
          endDate: contract.endDate?.toISOString() ?? null,
          status: contract.status,
          parties: contract.parties.map((party) => ({
            organizationId: party.organizationId,
            organizationName: party.organization.name,
            sharePercent: party.shareRatio !== null ? Math.round(party.shareRatio * 1000) / 10 : null,
          })),
        })),
      );
    },
  );

  app.get(
    "/organizations/:id/reports",
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ["portail"],
        summary: "Rapports mensuels agrégés publiés",
        params: z.object({ id: z.string() }),
        response: { 200: z.array(ReportSchema), ...errorResponses },
      },
    },
    async (request, reply) => {
      const scope = guard(request, request.params.id, "report:read");
      if (!scope) return reply.code(404).send({ message: "Organisation introuvable." });

      const reports = await app.prisma.report.findMany({
        where: {
          organizationId: request.params.id,
          organization: { id: { in: scope } },
          // Un rapport non publie n'est jamais visible cote client.
          publishedAt: { not: null },
        },
        orderBy: { period: "desc" },
      });

      await app.audit(request, {
        action: "portal.reports_listed",
        resourceType: "organization",
        resourceId: request.params.id,
        metadata: { count: reports.length },
      });

      return reply.send(
        reports.map((report) => ({
          id: report.id,
          period: report.period,
          kpi: report.kpiJson as Record<string, number | string | boolean>,
          publishedAt: report.publishedAt?.toISOString() ?? null,
        })),
      );
    },
  );

  app.get(
    "/organizations/:id/members",
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ["portail"],
        summary: "Membres de l'organisation",
        params: z.object({ id: z.string() }),
        response: { 200: z.array(MemberSchema), ...errorResponses },
      },
    },
    async (request, reply) => {
      const scope = guard(request, request.params.id, "organization:read");
      if (!scope) return reply.code(404).send({ message: "Organisation introuvable." });

      const memberships = await app.prisma.organizationMembership.findMany({
        where: { organizationId: request.params.id, organization: { id: { in: scope } } },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      });

      await app.audit(request, {
        action: "portal.members_listed",
        resourceType: "organization",
        resourceId: request.params.id,
        metadata: { count: memberships.length },
      });

      return reply.send(
        memberships.map((membership) => ({
          userId: membership.userId,
          fullName: membership.user.fullName,
          email: membership.user.email,
          role: membership.role,
          status: membership.user.status,
          mfaEnabled: membership.user.mfaEnabled,
          invitedAt: membership.user.invitedAt.toISOString(),
          activatedAt: membership.user.activatedAt?.toISOString() ?? null,
        })),
      );
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
        params: z.object({ id: z.string() }),
        body: InviteUserRequestSchema,
        response: { 201: z.object({ id: z.string() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      const scope = guard(request, request.params.id, "member:invite");
      if (!scope) return reply.code(403).send({ message: "Action non autorisée." });

      const email = request.body.email.trim().toLowerCase();
      const existing = await app.prisma.user.findUnique({ where: { email } });

      const user =
        existing ??
        (await app.prisma.user.create({
          data: { email, fullName: request.body.fullName, status: "INVITED" },
        }));

      await app.prisma.organizationMembership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: request.params.id } },
        update: { role: request.body.role },
        create: { userId: user.id, organizationId: request.params.id, role: request.body.role },
      });

      const token = await app.auth.createInvite(user.id);
      await app.notifications.send({
        to: email,
        channel: "EMAIL",
        template: "portal.invite",
        variables: { token, organizationId: request.params.id },
      });

      await app.audit(request, {
        action: "portal.user_invited",
        resourceType: "organization",
        resourceId: request.params.id,
        metadata: { invitedUserId: user.id, role: request.body.role },
      });

      return reply.code(201).send({ id: user.id });
    },
  );
};
