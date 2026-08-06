/**
 * API publique du noyau d'autorisation (guide, section 3.3).
 *
 * `can`, `accessibleOrganizationIds` et `resolveScope` sont des fonctions
 * pures : elles peuvent etre appelees depuis n'importe quel module. Le
 * chargement de l'acteur, lui, passe par le port `ActorRepository`.
 */

export {
  accessibleOrganizationIds,
  can,
  resolveScope,
  type Action,
  type Actor,
  type Membership,
  type ResourceRef,
} from "./domain/authorization.js";

export type { ActorRepository } from "./domain/ports.js";

export { PrismaActorRepository } from "./infrastructure/prisma-actor-repository.js";
