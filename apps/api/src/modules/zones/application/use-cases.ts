import type { IndustrialZoneRepository, IndustrialZoneSummary } from "../domain/ports.js";
import { orderForPublicListing } from "../domain/zone.js";

/**
 * Cas d'usage du module zones (guide, section 4.6) : charger, appeler le
 * domaine, retourner. Aucun code HTTP, aucun acces ORM.
 */
export class ListIndustrialZonesUseCase {
  constructor(private readonly zones: IndustrialZoneRepository) {}

  async execute(): Promise<IndustrialZoneSummary[]> {
    return orderForPublicListing(await this.zones.listAll());
  }
}
