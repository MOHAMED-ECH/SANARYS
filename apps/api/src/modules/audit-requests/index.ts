import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { NotificationPort } from "../../integrations/notifications/index.js";
import type { LeadsModule } from "../leads/index.js";
import { RequestAuditUseCase } from "./application/use-cases.js";
import { LeadsModuleGateway } from "./infrastructure/leads-module-gateway.js";
import { PrismaAuditRequestRepository } from "./infrastructure/prisma-audit-request-repository.js";
import { createAuditRequestsRoutes } from "./presentation/routes.js";

/** API publique du module audit-requests (guide, section 3.3). */

export interface AuditRequestsModule {
  readonly requestAudit: RequestAuditUseCase;
}

export interface AuditRequestsModuleDependencies {
  readonly prisma: PrismaClient;
  readonly notifications: NotificationPort;
  /** Dependance de module a module, injectee par le composeur d'application. */
  readonly leads: LeadsModule;
}

export function createAuditRequestsModule(
  deps: AuditRequestsModuleDependencies,
): AuditRequestsModule {
  return {
    requestAudit: new RequestAuditUseCase({
      auditRequests: new PrismaAuditRequestRepository(deps.prisma),
      leads: new LeadsModuleGateway(deps.leads),
      notifications: deps.notifications,
    }),
  };
}

export function auditRequestsRoutes(module: AuditRequestsModule): FastifyPluginAsyncZod {
  return createAuditRequestsRoutes(module);
}
