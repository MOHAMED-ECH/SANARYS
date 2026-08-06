import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AcceptInviteRequestSchema,
  LoginRequestSchema,
  MeResponseSchema,
  RequestPasswordResetSchema,
  ResetPasswordRequestSchema,
} from "@sanarys/schemas";
import { errorResponses } from "../../../lib/http.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import type { UserProfile } from "../domain/ports.js";
import type { AuthModule } from "../index.js";
import { clearSessionCookies, setSessionCookies } from "./cookies.js";

/**
 * Couche presentation de l'authentification.
 *
 * Elle ne decide rien : les erreurs metier remontent des cas d'usage et leur
 * traduction en statut HTTP passe par le mappeur unique (guide, section 12.2).
 * Identifiants invalides et compte verrouille produisent donc des statuts
 * differents sans qu'aucun `reply.code()` ne soit ecrit ici a la main.
 */

const toMeResponse = (profile: UserProfile) => ({
  id: profile.id,
  email: profile.email,
  fullName: profile.fullName,
  staffRole: profile.staffRole,
  memberships: profile.memberships.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organizationName,
    organizationType: m.organizationType,
    role: m.role,
  })),
});

export function createAuthRoutes(module: AuthModule): FastifyPluginAsyncZod {
  return async (app) => {
    const secureCookies = process.env.NODE_ENV === "production";

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
        try {
          const { sessionToken, profile } = await module.logIn.execute({
            email: request.body.email,
            password: request.body.password,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
          });

          setSessionCookies(
            reply,
            { session: sessionToken, csrf: module.newCsrfToken() },
            { secure: secureCookies },
          );

          return reply.send(toMeResponse(profile));
        } catch (error) {
          return replyWithDomainError(reply, error);
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
        if (request.sessionId && request.actor) {
          await module.logOut.execute({
            sessionId: request.sessionId,
            userId: request.actor.userId,
            ip: request.ip,
          });
        }
        return clearSessionCookies(reply).send({ ok: true });
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
        try {
          const profile = await module.getCurrentUser.execute(request.actor!.userId);
          return reply.send(toMeResponse(profile));
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
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
          await module.acceptInvite.execute({
            token: request.body.token,
            password: request.body.password,
            ip: request.ip,
          });
          return reply.send({ ok: true });
        } catch (error) {
          return replyWithDomainError(reply, error);
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
        await module.requestPasswordReset.execute(request.body.email);
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
          await module.resetPassword.execute({
            token: request.body.token,
            password: request.body.password,
            ip: request.ip,
          });
          return reply.send({ ok: true });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );
  };
}
