/**
 * Ports du module zones. Le domaine declare ce dont il a besoin ; aucune de ces
 * interfaces ne mentionne Prisma ni un schema SQL (guide, section 5.5).
 */

/**
 * Modele de lecture expose hors du module. Ce n'est jamais un objet ORM.
 *
 * Region et coordonnees sont facultatives : une zone peut etre referencee avant
 * d'avoir ete geolocalisee. La carte doit donc savoir composer avec leur
 * absence — et l'alternative en tableau, elle, reste toujours complete.
 */
export interface IndustrialZoneSummary {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly region: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly isPilot: boolean;
}

export interface IndustrialZoneRepository {
  listAll(): Promise<IndustrialZoneSummary[]>;
}
