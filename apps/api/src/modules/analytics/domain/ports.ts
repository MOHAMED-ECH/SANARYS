/**
 * Ports du module analytics. Aucune mention de Prisma ni d'un outil de mesure
 * tiers : changer de destination ne doit toucher que l'infrastructure.
 */

export interface TrackedEvent {
  readonly name: string;
  /** Deja filtre par le plan de marquage : ne contient que des cles autorisees. */
  readonly properties: Record<string, unknown>;
  readonly sessionRef: string | null;
}

export interface AnalyticsEventRepository {
  record(event: TrackedEvent): Promise<void>;
}
