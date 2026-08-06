import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, type AuthModule } from "../modules/auth/index.js";
import type { Actor, ActorRepository } from "../modules/authz/index.js";
import type { AuditTrailPort } from "../shared/audit/audit-trail.js";
import { safeEqual } from "../shared/cryptography/constant-time.js";

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler : exige une session valide et charge l'acteur d'autorisation. */
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler : exige un membre du personnel SANARYS. */
    requireStaff: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    actor?: Actor;
    sessionId?: string;
  }
}

export interface AuthPluginDependencies {
  readonly auth: AuthModule;
  readonly actors: ActorRepository;
  readonly audit: AuditTrailPort;
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

/**
 * Garde d'entree HTTP. C'est de la presentation : elle traduit un cookie en
 * acteur d'autorisation, et un refus en statut. Toute la logique de session
 * vit dans le module auth, celle des droits dans le noyau authz.
 */
export function createAuthPlugin(deps: AuthPluginDependencies) {
  return fp(async (app: FastifyInstance) => {
    app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
      if (!verifyCsrf(request)) {
        return reply.code(403).send({ message: "Requête refusée.", code: "CSRF" });
      }

      const token = request.cookies[SESSION_COOKIE];
      if (!token) {
        return reply.code(401).send({ message: "Authentification requise." });
      }

      const session = await deps.auth.resolveSession.execute(token);
      if (!session) {
        return reply.code(401).send({ message: "Session expirée ou révoquée." });
      }

      // Le compte est relu a chaque requete : une suspension prend effet
      // immediatement, sans attendre l'expiration de la session.
      const actor = await deps.actors.load(session.userId);
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
        // Une tentative d'acces au back-office par un compte client est un
        // signal de securite : elle est tracee, meme refusee.
        await deps.audit.record({
          actorUserId: request.actor?.userId ?? null,
          action: "staff.access_denied",
          resourceType: "staff",
          ip: request.ip,
          metadata: { path: request.url },
        });
        return reply.code(403).send({ message: "Accès réservé au personnel SANARYS." });
      }
    });
  });
}
