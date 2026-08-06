import type { Actor } from "./authorization.js";

/**
 * Chargement du contexte d'autorisation.
 *
 * La decision (`can`) est pure ; sa matiere premiere — appartenances et
 * perimetre — doit bien venir de quelque part. Ce port est cette frontiere.
 */
export interface ActorRepository {
  /** Retourne null si le compte n'existe pas ou n'est pas actif. */
  load(userId: string): Promise<Actor | null>;
}
