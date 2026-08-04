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
import { createNotificationAdapter, type NotificationPort } from "./integrations/notifications/index.js";
import { createCrmAdapter, type CrmPort } from "./integrations/crm/index.js";
import { createStorageAdapter, type StoragePort } from "./integrations/storage/index.js";
import { authPlugin } from "./plugins/auth.js";
import { zonesRoutes } from "./modules/zones/routes.js";
import { simulationsRoutes } from "./modules/simulations/routes.js";
import { leadsRoutes } from "./modules/leads/routes.js";
import { auditRequestsRoutes } from "./modules/audit-requests/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
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

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
    },
    // Correlation id sur chaque requete (observabilite, revue section 5).
    genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
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
  // Son comportement propre est verifie par un test dedie.
  if (env.NODE_ENV !== "test") {
    await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: "SANARYS 360 API",
        description:
          "API d'acquisition et de portail client SANARYS. Les resultats du simulateur sont indicatifs et non contractuels.",
        version: "0.1.0",
      },
      servers: [{ url: `http://localhost:${env.API_PORT}` }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  // Dependances partagees (adaptateurs mockes clairement identifies).
  app.decorate("prisma", prisma);
  app.decorate("notifications", createNotificationAdapter(env.NOTIFICATIONS_ADAPTER));
  app.decorate("crm", createCrmAdapter(env.CRM_ADAPTER));
  app.decorate("storage", createStorageAdapter(env.STORAGE_DIR));

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  });

  // Authentification, autorisation et journal d'audit (decore requireAuth/requireStaff).
  await app.register(authPlugin);

  await app.register(zonesRoutes, { prefix: "/api/v1" });
  await app.register(simulationsRoutes, { prefix: "/api/v1" });
  await app.register(leadsRoutes, { prefix: "/api/v1" });
  await app.register(auditRequestsRoutes, { prefix: "/api/v1" });
  await app.register(analyticsRoutes, { prefix: "/api/v1" });
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(staffRoutes, { prefix: "/api/v1" });
  await app.register(organizationsRoutes, { prefix: "/api/v1" });

  return app;
}
