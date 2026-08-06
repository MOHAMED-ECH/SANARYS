import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AcceptInviteRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  MeResponseSchema,
  MfaConfirmResponseSchema,
  MfaDisableRequestSchema,
  MfaEnrollResponseSchema,
  MfaStatusResponseSchema,
  MfaVerifyRequestSchema,
  RequestPasswordResetSchema,
  ResetPasswordRequestSchema,
} from "@sanarys/schemas";
import { errorResponses } from "../../../lib/http.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import type { UserProfile } from "../domain/ports.js";
import type { AuthModule } from "../index.js";
import { MFA_CHALLENGE_TTL_MS } from "../application/use-cases.js";
import {
  MFA_CHALLENGE_COOKIE,
  clearMfaChallengeCookie,
  clearSessionCookies,
  setMfaChallengeCookie,
  setSessionCookies,
} from "./cookies.js";

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
          response: { 200: LoginResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const result = await module.logIn.execute({
            email: request.body.email,
            password: request.body.password,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
          });

          // Second facteur actif : aucune session n'est ouverte ici. Le defi
          // part en cookie httpOnly, et la reponse ne dit rien de plus que
          // « il manque une etape ».
          if (result.kind === "mfa_required") {
            setMfaChallengeCookie(reply, result.challengeToken, {
              secure: secureCookies,
              maxAgeSeconds: MFA_CHALLENGE_TTL_MS / 1000,
            });
            return reply.send({ mfaRequired: true as const });
          }

          setSessionCookies(
            reply,
            { session: result.sessionToken, csrf: module.newCsrfToken() },
            { secure: secureCookies },
          );

          return reply.send(toMeResponse(result.profile));
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.post(
      "/auth/mfa/verify",
      {
        // Cadence volontairement serree : le defi ne vit que cinq minutes, mais
        // un code a six chiffres reste devinable si on laisse essayer sans fin.
        config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
        schema: {
          tags: ["auth"],
          summary: "Termine la connexion en vérifiant le second facteur",
          body: MfaVerifyRequestSchema,
          response: { 200: MeResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const challengeToken = request.cookies[MFA_CHALLENGE_COOKIE];
          const result = await module.completeMfaLogIn.execute({
            challengeToken: challengeToken ?? "",
            code: request.body.code,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
          });

          clearMfaChallengeCookie(reply);
          setSessionCookies(
            reply,
            { session: result.sessionToken, csrf: module.newCsrfToken() },
            { secure: secureCookies },
          );

          return reply.send(toMeResponse(result.profile));
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/auth/mfa",
      {
        preHandler: app.requireAuth,
        schema: {
          tags: ["auth"],
          summary: "État du second facteur pour l'utilisateur courant",
          response: { 200: MfaStatusResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        return reply.send(await module.getMfaStatus.execute(request.actor!.userId));
      },
    );

    app.post(
      "/auth/mfa/enroll",
      {
        preHandler: app.requireAuth,
        schema: {
          tags: ["auth"],
          summary: "Commence l'enrôlement : génère un secret, sans l'activer",
          response: { 200: MfaEnrollResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          return reply.send(await module.startMfaEnrollment.execute(request.actor!.userId));
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.post(
      "/auth/mfa/confirm",
      {
        preHandler: app.requireAuth,
        config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
        schema: {
          tags: ["auth"],
          summary: "Active le second facteur et remet les codes de secours",
          body: MfaVerifyRequestSchema,
          response: { 200: MfaConfirmResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          return reply.send(
            await module.confirmMfaEnrollment.execute({
              userId: request.actor!.userId,
              code: request.body.code,
              ip: request.ip,
            }),
          );
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.post(
      "/auth/mfa/disable",
      {
        preHandler: app.requireAuth,
        config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
        schema: {
          tags: ["auth"],
          summary: "Désactive le second facteur, mot de passe exigé",
          body: MfaDisableRequestSchema,
          response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          await module.disableMfa.execute({
            userId: request.actor!.userId,
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
