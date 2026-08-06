import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "node:crypto";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { prisma } from "@sanarys/db";
import { env } from "./env.js";
import { createNotificationAdapter } from "./integrations/notifications/index.js";
import { createCrmAdapter } from "./integrations/crm/index.js";
import { createStorageAdapter } from "./integrations/storage/index.js";
import { createAuthPlugin } from "./plugins/auth.js";
import { PrismaAuditTrail } from "./shared/audit/prisma-audit-trail.js";
import { PrismaActorRepository } from "./modules/authz/index.js";
import { createSimulationsModule, simulationsRoutes } from "./modules/simulations/index.js";
import { createZonesModule, zonesRoutes } from "./modules/zones/index.js";
import { createLeadsModule, leadsRoutes } from "./modules/leads/index.js";
import { createAuditRequestsModule, auditRequestsRoutes } from "./modules/audit-requests/index.js";
import { createAnalyticsModule, analyticsRoutes } from "./modules/analytics/index.js";
import { createAuthModule, authRoutes } from "./modules/auth/index.js";
import { createStaffModule, staffRoutes } from "./modules/staff/index.js";
import { createOrganizationsModule, organizationsRoutes } from "./modules/organizations/index.js";

/**
 * Composeur d'application : c'est ici que les modules sont instancies avec
 * leurs dependances concretes (guide, section 5.5). Un module ne choisit
 * jamais lui-meme son infrastructure.
 *
 * L'instance Fastify ne porte plus ni `prisma`, ni les adaptateurs : ces
 * decorations avaient fini par servir de porte derobee vers la base depuis
 * n'importe quelle route. Les dependances passent desormais par les
 * constructeurs de modules, et le compilateur refuse tout raccourci.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const isDevelopment = env.NODE_ENV === "development";

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      ...(isDevelopment
        ? { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } } }
        : {}),
    },
    // Identifiant de correlation sur chaque requete (guide, section 14).
    genReqId: (req) => {
      const header = req.headers["x-request-id"];
      return typeof header === "string" ? header : randomUUID();
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });

  // Le limiteur de debit est actif partout SAUF en test automatise, ou les
  // suites enchainent volontairement des dizaines de requetes identiques.
  if (env.NODE_ENV !== "test") {
    await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: "SANARYS 360 API",
        description:
          "API d'acquisition et de portail client SANARYS. Les résultats du simulateur sont indicatifs et non contractuels.",
        version: "0.1.0",
      },
      servers: [{ url: `http://localhost:${env.API_PORT}` }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  });

  // --- Adaptateurs techniques partages (mockes clairement identifies) ------
  const storage = createStorageAdapter(env.STORAGE_DIR);
  const notifications = createNotificationAdapter(env.NOTIFICATIONS_ADAPTER);
  const crm = createCrmAdapter(env.CRM_ADAPTER);

  // --- Instanciation des modules -------------------------------------------
  // Chaque module recoit ses dependances ; aucun ne choisit lui-meme son
  // infrastructure, et aucun n'ecrit dans les tables d'un autre.
  const audit = new PrismaAuditTrail(prisma);
  const actors = new PrismaActorRepository(prisma);

  const auth = createAuthModule({ prisma, notifications, audit });
  const simulations = createSimulationsModule({ prisma, storage });
  const zones = createZonesModule({ prisma });
  const analytics = createAnalyticsModule({ prisma });
  const leads = createLeadsModule({ prisma, crm, notifications });
  // audit-requests depend du module leads, pas de ses tables : la demande
  // d'audit fait progresser le lead via l'API publique de celui-ci.
  const auditRequests = createAuditRequestsModule({ prisma, notifications, leads });
  // Le portail delegue l'emission des invitations au module auth, pour la
  // meme raison : la politique des jetons appartient a un seul endroit.
  const organizations = createOrganizationsModule({ prisma, notifications, audit, auth });
  const staff = createStaffModule({ prisma, audit });

  // La garde d'authentification a besoin du module auth et du chargeur
  // d'acteurs : elle est donc enregistree apres eux.
  await app.register(createAuthPlugin({ auth, actors, audit }));

  await app.register(authRoutes(auth), { prefix: "/api/v1" });
  await app.register(simulationsRoutes(simulations), { prefix: "/api/v1" });
  await app.register(zonesRoutes(zones), { prefix: "/api/v1" });
  await app.register(leadsRoutes(leads), { prefix: "/api/v1" });
  await app.register(auditRequestsRoutes(auditRequests), { prefix: "/api/v1" });
  await app.register(analyticsRoutes(analytics), { prefix: "/api/v1" });
  await app.register(organizationsRoutes(organizations), { prefix: "/api/v1" });
  await app.register(staffRoutes(staff), { prefix: "/api/v1" });

  return app;
}
