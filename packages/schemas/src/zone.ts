import { z } from "zod";

export const IndustrialZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  region: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  isPilot: z.boolean(),
});
export type IndustrialZoneDto = z.infer<typeof IndustrialZoneSchema>;
