import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { RecordAnalyticsEventUseCase } from "./application/use-cases.js";
import { PrismaAnalyticsEventRepository } from "./infrastructure/prisma-analytics-repository.js";
import { createAnalyticsRoutes } from "./presentation/routes.js";

/** API publique du module analytics (guide, section 3.3). */

export { ALLOWED_EVENTS, sanitizeEventProperties } from "./domain/tracking-plan.js";

export interface AnalyticsModule {
  readonly recordAnalyticsEvent: RecordAnalyticsEventUseCase;
}

export function createAnalyticsModule(deps: { prisma: PrismaClient }): AnalyticsModule {
  return {
    recordAnalyticsEvent: new RecordAnalyticsEventUseCase(
      new PrismaAnalyticsEventRepository(deps.prisma),
    ),
  };
}

export function analyticsRoutes(module: AnalyticsModule): FastifyPluginAsyncZod {
  return createAnalyticsRoutes(module);
}
