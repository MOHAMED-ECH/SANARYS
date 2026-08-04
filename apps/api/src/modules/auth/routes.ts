import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import {
  AcceptInviteRequestSchema,
  LoginRequestSchema,
  MeResponseSchema,
  RequestPasswordResetSchema,
  ResetPasswordRequestSchema,
} from "@sanarys/schemas";
import { errorResponses } from "../../lib/http.js";
import { CSRF_COOKIE, SESSION_COOKIE } from "../../plugins/auth.js";
import { AccountLockedError, InvalidCredentialsError, InvalidTokenError, generateToken } from "./service.js";

const SESSION_MAX_AGE = 12 * 3600;

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const isProduction = process.env.NODE_ENV === "production";

  function setSessionCookies(reply: FastifyReply, token: string) {
    const csrf = generateToken();
    reply
      .setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: SESSION_MAX_AGE,
      })
      // Lisible par le client : il doit le renvoyer dans l'en-tete anti-CSRF.
      .setCookie(CSRF_COOKIE, csrf, {
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
  }

  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
      schema: {
        tags: ["auth"],
        summary: "Ouvre une session (authentification de premiere partie)",
        body: LoginRequestSchema,
        response: { 200: MeResponseSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      try {
        const user = await app.auth.verifyCredentials(email, password);

        // Rotation : toute nouvelle connexion revoque les sessions precedentes.
        await app.auth.revokeAllSessions(user.id);
        const { token } = await app.auth.createSession(user.id, {
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        });
        setSessionCookies(reply, token);

        await app.prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            action: "auth.login_success",
            resourceType: "session",
            ip: request.ip,
          },
        });

        const memberships = await app.prisma.organizationMembership.findMany({
          where: { userId: user.id },
          include: { organization: true },
        });

        return reply.send({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          staffRole: user.staffRole,
          memberships: memberships.map((m) => ({
            organizationId: m.organizationId,
            organizationName: m.organization.name,
            organizationType: m.organization.type,
            role: m.role,
          })),
        });
      } catch (error) {
        await app.prisma.auditLog.create({
          data: {
            action: "auth.login_failure",
            resourceType: "session",
            ip: request.ip,
            metadata: { reason: error instanceof AccountLockedError ? "locked" : "invalid" },
          },
        });

        if (error instanceof AccountLockedError) {
          return reply.code(429).send({ message: error.message, code: "ACCOUNT_LOCKED" });
        }
        if (error instanceof InvalidCredentialsError) {
          return reply.code(401).send({ message: "Identifiants invalides." });
        }
        throw error;
      }
    },
  );

  app.post(
    "/auth/logout",
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ["auth"],
        summary: "Ferme la session courante",
        response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      if (request.sessionId) {
        await app.auth.revokeSession(request.sessionId);
      }
      await app.audit(request, { action: "auth.logout", resourceType: "session" });
      return reply
        .clearCookie(SESSION_COOKIE, { path: "/" })
        .clearCookie(CSRF_COOKIE, { path: "/" })
        .send({ ok: true });
    },
  );

  app.get(
    "/auth/me",
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ["auth"],
        summary: "Utilisateur courant et ses appartenances",
        response: { 200: MeResponseSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.actor!.userId },
        include: { memberships: { include: { organization: true } } },
      });
      if (!user) return reply.code(401).send({ message: "Compte indisponible." });

      return reply.send({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        staffRole: user.staffRole,
        memberships: user.memberships.map((m) => ({
          organizationId: m.organizationId,
          organizationName: m.organization.name,
          organizationType: m.organization.type,
          role: m.role,
        })),
      });
    },
  );

  app.post(
    "/auth/accept-invite",
    {
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
      schema: {
        tags: ["auth"],
        summary: "Active un compte depuis une invitation",
        body: AcceptInviteRequestSchema,
        response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      try {
        const user = await app.auth.acceptInvite(request.body.token, request.body.password);
        await app.prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            action: "auth.invite_accepted",
            resourceType: "user",
            resourceId: user.id,
            ip: request.ip,
          },
        });
        return reply.send({ ok: true });
      } catch (error) {
        if (error instanceof InvalidTokenError) {
          return reply.code(400).send({ message: error.message, code: "INVALID_INVITE" });
        }
        throw error;
      }
    },
  );

  app.post(
    "/auth/request-password-reset",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        tags: ["auth"],
        summary: "Demande un lien de réinitialisation",
        body: RequestPasswordResetSchema,
        response: { 202: z.object({ ok: z.boolean() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      const token = await app.auth.createPasswordReset(request.body.email);

      if (token) {
        // Adaptateur mocke : le lien est journalise, jamais reellement envoye.
        await app.notifications.send({
          to: request.body.email,
          channel: "EMAIL",
          template: "auth.password_reset",
          variables: { token },
        });
      }

      // Reponse identique que le compte existe ou non : aucune enumeration.
      return reply.code(202).send({ ok: true });
    },
  );

  app.post(
    "/auth/reset-password",
    {
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
      schema: {
        tags: ["auth"],
        summary: "Définit un nouveau mot de passe et révoque les sessions",
        body: ResetPasswordRequestSchema,
        response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      try {
        const user = await app.auth.resetPassword(request.body.token, request.body.password);
        await app.prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            action: "auth.password_reset",
            resourceType: "user",
            resourceId: user.id,
            ip: request.ip,
          },
        });
        return reply.send({ ok: true });
      } catch (error) {
        if (error instanceof InvalidTokenError) {
          return reply.code(400).send({ message: error.message, code: "INVALID_RESET" });
        }
        throw error;
      }
    },
  );
};
