import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ListIndustrialZonesUseCase } from "./application/use-cases.js";
import { PrismaIndustrialZoneRepository } from "./infrastructure/prisma-zone-repository.js";
import { createZonesRoutes } from "./presentation/routes.js";

/**
 * API publique du module zones (guide, section 3.3). Les imports profonds vers
 * `infrastructure/` ou `domain/` depuis l'exterieur du module sont interdits.
 */

export type { IndustrialZoneSummary } from "./domain/ports.js";

export interface ZonesModule {
  readonly listIndustrialZones: ListIndustrialZonesUseCase;
}

export function createZonesModule(deps: { prisma: PrismaClient }): ZonesModule {
  return {
    listIndustrialZones: new ListIndustrialZonesUseCase(
      new PrismaIndustrialZoneRepository(deps.prisma),
    ),
  };
}

export function zonesRoutes(module: ZonesModule): FastifyPluginAsyncZod {
  return createZonesRoutes(module);
}
