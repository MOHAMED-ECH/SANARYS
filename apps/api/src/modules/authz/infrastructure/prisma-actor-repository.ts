import type { PrismaClient } from "@sanarys/db";
import { PARENT_ROLES, type Actor, type Membership } from "../domain/authorization.js";
import type { ActorRepository } from "../domain/ports.js";

/**
 * Charge le contexte d'autorisation d'un utilisateur : ses appartenances et le
 * perimetre d'organisations qu'il peut atteindre (lui-meme + PME filles s'il
 * administre un groupement).
 *
 * Un compte non actif ne produit aucun acteur : un compte suspendu perd ses
 * droits immediatement, sans attendre l'expiration de sa session.
 */
export class PrismaActorRepository implements ActorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async load(userId: string): Promise<Actor | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (!user || user.status !== "ACTIVE") return null;

    const memberships: Membership[] = user.memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
    }));

    const directIds = memberships.map((m) => m.organizationId);

    const parentIds = memberships
      .filter((m) => PARENT_ROLES.includes(m.role))
      .map((m) => m.organizationId);

    const children = parentIds.length
      ? await this.prisma.organization.findMany({
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
}
