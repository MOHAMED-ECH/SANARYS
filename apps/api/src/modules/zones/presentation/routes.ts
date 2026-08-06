import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { IndustrialZoneSchema } from "@sanarys/schemas";
import type { ZonesModule } from "../index.js";

/**
 * Couche presentation : traduction HTTP uniquement. Elle valide, appelle un cas
 * d'usage, serialise. Aucune regle metier, aucun acces ORM (guide, section 10.1).
 */
export function createZonesRoutes(module: ZonesModule): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      "/zones",
      {
        schema: {
          tags: ["zones"],
          summary: "Liste des zones industrielles referencees",
          response: { 200: z.array(IndustrialZoneSchema) },
        },
      },
      async () => module.listIndustrialZones.execute(),
    );
  };
}
