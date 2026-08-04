import type { MembershipRole, PrismaClient, StaffRole } from "@sanarys/db";

/**
 * Service d'autorisation central.
 *
 * Principe : utilisateur -> appartenances -> roles -> permissions -> perimetre
 * de donnees -> autorise / refuse. Aucune route ne compare un identifiant
 * d'organisation "a la main" ; tout passe par `can()` et par le scoping
 * `accessibleOrganizationIds()`.
 *
 * Regles non negociables :
 *  - un utilisateur d'une PME ne voit jamais les donnees d'une autre PME ;
 *  - l'administrateur d'un groupement voit ses PME membres, en agrege ;
 *  - le personnel SANARYS n'est jamais "membre" d'une organisation cliente :
 *    son acces vient de `User.staffRole` et il est journalise ;
 *  - refus par defaut : toute action non explicitement autorisee est refusee.
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

export interface ResourceRef {
  /** Organisation proprietaire de la ressource visee. */
  organizationId?: string;
}

/**
 * Charge le contexte d'autorisation d'un utilisateur : ses appartenances et
 * le perimetre d'organisations qu'il peut atteindre (lui-meme + enfants s'il
 * administre un groupement).
 */
export async function loadActor(prisma: PrismaClient, userId: string): Promise<Actor | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: true },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const memberships: Membership[] = user.memberships.map((m) => ({
    organizationId: m.organizationId,
    role: m.role,
  }));

  const directIds = memberships.map((m) => m.organizationId);

  // Un administrateur ou gestionnaire de groupement atteint aussi ses PME membres.
  const parentIds = memberships
    .filter((m) => m.role === "ORG_ADMIN" || m.role === "ZONE_MANAGER")
    .map((m) => m.organizationId);

  const children = parentIds.length
    ? await prisma.organization.findMany({
        where: { parentId: { in: parentIds } },
        select: { id: true },
      })
    : [];

  return {
    userId: user.id,
    staffRole: user.staffRole,
    memberships,
    scopeOrganizationIds: [...new Set([...directIds, ...children.map((c) => c.id)])],
  };
}

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
