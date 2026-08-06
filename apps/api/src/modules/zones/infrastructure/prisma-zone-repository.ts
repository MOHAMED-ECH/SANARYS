import type { PrismaClient } from "@sanarys/db";
import type { IndustrialZoneRepository, IndustrialZoneSummary } from "../domain/ports.js";

/**
 * Seul fichier du module zones qui connaisse Prisma (guide, section 10.1).
 * Il traduit la ligne de base en modele de lecture : aucun objet ORM ne
 * franchit cette frontiere.
 */
export class PrismaIndustrialZoneRepository implements IndustrialZoneRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listAll(): Promise<IndustrialZoneSummary[]> {
    const rows = await this.prisma.industrialZone.findMany();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      region: row.region,
      lat: row.lat,
      lng: row.lng,
      isPilot: row.isPilot,
    }));
  }
}
