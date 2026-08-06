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
import {
  createNotificationAdapter,
  type NotificationPort,
} from "./integrations/notifications/index.js";
import { createCrmAdapter, type CrmPort } from "./integrations/crm/index.js";
import { createStorageAdapter, type StoragePort } from "./integrations/storage/index.js";
import { authPlugin } from "./plugins/auth.js";
import { createSimulationsModule, simulationsRoutes } from "./modules/simulations/index.js";
import { createZonesModule, zonesRoutes } from "./modules/zones/index.js";
import { createLeadsModule, leadsRoutes } from "./modules/leads/index.js";
import { createAuditRequestsModule, auditRequestsRoutes } from "./modules/audit-requests/index.js";
import { createAnalyticsModule, analyticsRoutes } from "./modules/analytics/index.js";
import { authRoutes } from "./modules/auth/routes.js";
import { staffRoutes } from "./modules/staff/routes.js";
import { organizationsRoutes } from "./modules/organizations/routes.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
    notifications: NotificationPort;
    crm: CrmPort;
    storage: StoragePort;
  }
}

/**
 * Composeur d'application : c'est ici que les modules sont instancies avec
 * leurs dependances concretes (guide, section 5.5). Un module ne choisit
 * jamais lui-meme son infrastructure.
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

  // Adaptateurs techniques partages (mockes clairement identifies).
  const storage = createStorageAdapter(env.STORAGE_DIR);
  app.decorate("prisma", prisma);
  app.decorate("notifications", createNotificationAdapter(env.NOTIFICATIONS_ADAPTER));
  app.decorate("crm", createCrmAdapter(env.CRM_ADAPTER));
  app.decorate("storage", storage);

  await app.register(authPlugin);

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  });

  // --- Modules refondus en couches -----------------------------------------
  const notifications = app.notifications;
  const crm = app.crm;

  const simulations = createSimulationsModule({ prisma, storage });
  const zones = createZonesModule({ prisma });
  const analytics = createAnalyticsModule({ prisma });
  const leads = createLeadsModule({ prisma, crm, notifications });
  // audit-requests depend du module leads, pas de ses tables : la demande
  // d'audit fait progresser le lead via l'API publique de celui-ci.
  const auditRequests = createAuditRequestsModule({ prisma, notifications, leads });

  await app.register(simulationsRoutes(simulations), { prefix: "/api/v1" });
  await app.register(zonesRoutes(zones), { prefix: "/api/v1" });
  await app.register(leadsRoutes(leads), { prefix: "/api/v1" });
  await app.register(auditRequestsRoutes(auditRequests), { prefix: "/api/v1" });
  await app.register(analyticsRoutes(analytics), { prefix: "/api/v1" });

  // --- Modules restant a refondre ------------------------------------------
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(staffRoutes, { prefix: "/api/v1" });
  await app.register(organizationsRoutes, { prefix: "/api/v1" });

  return app;
}
