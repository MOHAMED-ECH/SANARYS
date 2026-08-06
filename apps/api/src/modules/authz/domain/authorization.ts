import type { MembershipRole, StaffRole } from "@sanarys/db";

/**
 * Decision d'autorisation — noyau partage.
 *
 * Principe : utilisateur -> appartenances -> roles -> permissions -> perimetre
 * de donnees -> autorise / refuse. Aucune route ne compare un identifiant
 * d'organisation "a la main" ; tout passe par `can()` et par le scoping
 * `accessibleOrganizationIds()`.
 *
 * Ce fichier est entierement pur : aucune base, aucun reseau, aucune horloge.
 * C'est ce qui permet de tester la matrice de decision exhaustivement, et de
 * la relire sans dérouler une requete SQL.
 *
 * Regles non negociables :
 *  - un utilisateur d'une PME ne voit jamais les donnees d'une autre PME ;
 *  - l'administrateur d'un groupement voit ses PME membres, en agrege ;
 *  - le personnel SANARYS n'est jamais "membre" d'une organisation cliente :
 *    son acces vient de `User.staffRole` et il est journalise ;
 *  - refus par defaut : toute action non explicitement autorisee est refusee.
 *
 * Les types `MembershipRole` et `StaffRole` viennent du paquet db parce que ce
 * sont les enumerations du modele metier, pas des lignes ORM : le domaine peut
 * les nommer sans dependre de Prisma a l'execution.
 */

export type Action =
  | "organization:read"
  | "contract:read"
  | "report:read"
  | "member:invite"
  | "lead:read"
  | "lead:write";

export interface Membership {
  organizationId: string;
  role: MembershipRole;
}

export interface Actor {
  userId: string;
  staffRole: StaffRole | null;
  memberships: Membership[];
  /** Organisations accessibles, appartenances directes + PME du groupement administre. */
  scopeOrganizationIds: string[];
}

export interface ResourceRef {
  /** Organisation proprietaire de la ressource visee. */
  organizationId?: string;
}

/** Roles autorises a lire les donnees d'une organisation. */
const READ_ROLES: MembershipRole[] = [
  "ORG_ADMIN",
  "HSE_MANAGER",
  "COMPANY_DIRECTOR",
  "ZONE_MANAGER",
  "VIEWER",
];

/** Seuls ces roles peuvent inviter de nouveaux utilisateurs. */
const INVITE_ROLES: MembershipRole[] = ["ORG_ADMIN"];

/** Roles d'appartenance qui donnent acces aux PME filles d'un groupement. */
export const PARENT_ROLES: MembershipRole[] = ["ORG_ADMIN", "ZONE_MANAGER"];

function roleFor(actor: Actor, organizationId: string): MembershipRole | null {
  const direct = actor.memberships.find((m) => m.organizationId === organizationId);
  if (direct) return direct.role;
  // Acces herite via le groupement : droits de lecture agregee uniquement.
  return actor.scopeOrganizationIds.includes(organizationId) ? "VIEWER" : null;
}

/** Decision d'autorisation. Refus par defaut. */
export function can(actor: Actor, action: Action, resource: ResourceRef = {}): boolean {
  // Personnel SANARYS : acces au pipeline commercial uniquement.
  if (actor.staffRole) {
    if (action === "lead:read" || action === "lead:write") {
      return actor.staffRole === "ADMIN" || actor.staffRole === "SALES";
    }
    // Le staff n'accede pas aux espaces clients par ce chemin : un acces
    // support eventuel devra etre explicite, motive et journalise.
    return false;
  }

  // Les leads appartiennent au pipeline SANARYS : jamais accessibles aux clients.
  if (action === "lead:read" || action === "lead:write") return false;

  if (!resource.organizationId) return false;

  const role = roleFor(actor, resource.organizationId);
  if (!role) return false;

  switch (action) {
    case "organization:read":
    case "contract:read":
    case "report:read":
      return READ_ROLES.includes(role);
    case "member:invite":
      // L'invitation exige une appartenance DIRECTE : pas d'heritage.
      return (
        INVITE_ROLES.includes(role) &&
        actor.memberships.some((m) => m.organizationId === resource.organizationId)
      );
    default:
      return false;
  }
}

/**
 * Perimetre de scoping a appliquer systematiquement dans les requetes
 * (`where: { organizationId: { in: accessibleOrganizationIds(actor) } }`).
 * Une liste vide signifie "aucune donnee", jamais "toutes les donnees".
 */
export function accessibleOrganizationIds(actor: Actor): string[] {
  return actor.staffRole ? [] : actor.scopeOrganizationIds;
}

/**
 * Autorisation ET perimetre en une seule decision.
 *
 * Retourne la liste d'organisations sur laquelle la requete doit etre
 * restreinte, ou `null` si l'acces est refuse. Les deux verifications sont
 * indissociables : autoriser sans restreindre la requete laisserait passer
 * les donnees d'une autre organisation.
 */
export function resolveScope(
  actor: Actor,
  action: Action,
  organizationId: string,
): string[] | null {
  if (!can(actor, action, { organizationId })) return null;
  const scope = accessibleOrganizationIds(actor);
  return scope.includes(organizationId) ? scope : null;
}
