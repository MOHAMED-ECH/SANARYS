import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { CrmPort } from "../../integrations/crm/index.js";
import type { NotificationPort } from "../../integrations/notifications/index.js";
import { SystemClock, type ClockPort } from "../../shared/time/system-clock.js";
import {
  CheckLeadExistsUseCase,
  MarkLeadAuditRequestedUseCase,
  SubmitLeadUseCase,
} from "./application/use-cases.js";
import { PrismaLeadRepository } from "./infrastructure/prisma-lead-repository.js";
import { PrismaSimulationFacts } from "./infrastructure/prisma-simulation-facts.js";
import { createLeadsRoutes } from "./presentation/routes.js";

/**
 * API publique du module leads (guide, section 3.3).
 *
 * `markLeadAuditRequested` est le point d'entree utilise par le module
 * audit-requests : les modules se parlent par leurs API publiques, jamais en
 * ecrivant dans les tables les uns des autres.
 */

export { buildDedupeKey, priorityFromScore, scoreLead } from "./domain/lead.js";
export type { LeadSnapshot } from "./domain/ports.js";

export interface LeadsModule {
  readonly submitLead: SubmitLeadUseCase;
  readonly checkLeadExists: CheckLeadExistsUseCase;
  readonly markLeadAuditRequested: MarkLeadAuditRequestedUseCase;
}

export interface LeadsModuleDependencies {
  readonly prisma: PrismaClient;
  readonly crm: CrmPort;
  readonly notifications: NotificationPort;
  readonly clock?: ClockPort | undefined;
}

export function createLeadsModule(deps: LeadsModuleDependencies): LeadsModule {
  const leads = new PrismaLeadRepository(deps.prisma);

  return {
    submitLead: new SubmitLeadUseCase({
      leads,
      simulationFacts: new PrismaSimulationFacts(deps.prisma),
      crm: deps.crm,
      notifications: deps.notifications,
      clock: deps.clock ?? new SystemClock(),
    }),
    checkLeadExists: new CheckLeadExistsUseCase(leads),
    markLeadAuditRequested: new MarkLeadAuditRequestedUseCase(leads),
  };
}

export function leadsRoutes(module: LeadsModule): FastifyPluginAsyncZod {
  return createLeadsRoutes(module);
}
