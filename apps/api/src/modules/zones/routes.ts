import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { IndustrialZoneSchema } from "@sanarys/schemas";

export const zonesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/zones",
    {
      schema: {
        tags: ["zones"],
        summary: "Liste des zones industrielles referencees",
        response: { 200: z.array(IndustrialZoneSchema) },
      },
    },
    async () => {
      const zones = await app.prisma.industrialZone.findMany({
        orderBy: [{ isPilot: "desc" }, { city: "asc" }],
      });
      return zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        city: zone.city,
        region: zone.region,
        lat: zone.lat,
        lng: zone.lng,
        isPilot: zone.isPilot,
      }));
    },
  );
};
