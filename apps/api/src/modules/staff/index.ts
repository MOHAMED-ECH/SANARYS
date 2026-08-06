import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { AuditTrailPort } from "../../shared/audit/audit-trail.js";
import { SystemClock, type ClockPort } from "../../shared/time/system-clock.js";
import {
  GetLeadDetailUseCase,
  ListLeadQueueUseCase,
  UpdateLeadUseCase,
} from "./application/use-cases.js";
import { PrismaStaffLeadRepository } from "./infrastructure/prisma-staff-lead-repository.js";
import { createStaffRoutes } from "./presentation/routes.js";

/** API publique du module staff (guide, section 3.3). */

export interface StaffModule {
  readonly listLeadQueue: ListLeadQueueUseCase;
  readonly getLeadDetail: GetLeadDetailUseCase;
  readonly updateLead: UpdateLeadUseCase;
}

export interface StaffModuleDependencies {
  readonly prisma: PrismaClient;
  readonly audit: AuditTrailPort;
  readonly clock?: ClockPort | undefined;
}

export function createStaffModule(deps: StaffModuleDependencies): StaffModule {
  const core = {
    leads: new PrismaStaffLeadRepository(deps.prisma),
    audit: deps.audit,
    clock: deps.clock ?? new SystemClock(),
  };

  return {
    listLeadQueue: new ListLeadQueueUseCase(core),
    getLeadDetail: new GetLeadDetailUseCase(core),
    updateLead: new UpdateLeadUseCase(core),
  };
}

export function staffRoutes(module: StaffModule): FastifyPluginAsyncZod {
  return createStaffRoutes(module);
}
