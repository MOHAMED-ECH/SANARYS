import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Prisma } from "@sanarys/db";
import { AuthService, safeEqual } from "../modules/auth/service.js";
import { loadActor, type Actor } from "../modules/authz/index.js";

export const SESSION_COOKIE = "sanarys_session";
export const CSRF_COOKIE = "sanarys_csrf";
export const CSRF_HEADER = "x-sanarys-csrf";

declare module "fastify" {
  interface FastifyInstance {
    auth: AuthService;
    /** preHandler : exige une session valide et charge l'acteur d'autorisation. */
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler : exige un membre du personnel SANARYS. */
    requireStaff: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    audit: (
      request: FastifyRequest,
      entry: {
        action: string;
        resourceType: string;
        resourceId?: string;
        metadata?: Record<string, unknown>;
      },
    ) => Promise<void>;
  }

  interface FastifyRequest {
    actor?: Actor;
    sessionId?: string;
  }
}

/**
 * Protection CSRF par "double soumission" : un cookie non httpOnly porte un
 * jeton que le client doit renvoyer dans un en-tete. Une requete d'ecriture
 * declenchee par un site tiers ne peut pas lire ce cookie et echoue donc.
 */
function verifyCsrf(request: FastifyRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const cookie = request.cookies[CSRF_COOKIE];
  const header = request.headers[CSRF_HEADER];
  if (!cookie || typeof header !== "string") return false;
  return safeEqual(cookie, header);
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  const auth = new AuthService(app.prisma);
  app.decorate("auth", auth);

  app.decorate(
    "audit",
    async (
      request: FastifyRequest,
      entry: {
        action: string;
        resourceType: string;
        resourceId?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      await app.prisma.auditLog.create({
        data: {
          actorUserId: request.actor?.userId ?? null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          ip: request.ip,
          metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    },
  );

  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!verifyCsrf(request)) {
      return reply.code(403).send({ message: "Requête refusée.", code: "CSRF" });
    }

    const token = request.cookies[SESSION_COOKIE];
    if (!token) {
      return reply.code(401).send({ message: "Authentification requise." });
    }

    const session = await auth.resolveSession(token);
    if (!session) {
      return reply.code(401).send({ message: "Session expirée ou révoquée." });
    }

    const actor = await loadActor(app.prisma, session.userId);
    if (!actor) {
      return reply.code(401).send({ message: "Compte indisponible." });
    }

    request.actor = actor;
    request.sessionId = session.sessionId;
  });

  app.decorate("requireStaff", async (request: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(request, reply);
    if (reply.sent) return;

    if (!request.actor?.staffRole) {
      await app.audit(request, {
        action: "staff.access_denied",
        resourceType: "staff",
        metadata: { path: request.url },
      });
      return reply.code(403).send({ message: "Accès réservé au personnel SANARYS." });
    }
  });
});
