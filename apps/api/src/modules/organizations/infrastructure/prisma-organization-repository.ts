import type { MembershipRole, PrismaClient } from "@sanarys/db";
import type {
  ContractView,
  MemberView,
  MembershipRepository,
  OrganizationRepository,
  OrganizationView,
  ReportView,
} from "../domain/ports.js";

/**
 * Seuls fichiers du portail qui connaissent Prisma (guide, section 10.1).
 *
 * Chaque requete applique le perimetre recu. Un perimetre vide ne signifie pas
 * "aucune restriction" : `{ in: [] }` ne retourne rien, ce qui est exactement
 * le comportement voulu — refus par defaut jusque dans le SQL.
 */
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findInScope(
    organizationId: string,
    scope: readonly string[],
  ): Promise<OrganizationView | null> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId, AND: { id: { in: [...scope] } } },
      include: {
        industrialZone: true,
        _count: { select: { children: true, sites: true } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      industrialZoneName: row.industrialZone?.name ?? null,
      memberCount: row._count.children,
      siteCount: row._count.sites,
    };
  }

  async listContracts(organizationId: string, scope: readonly string[]): Promise<ContractView[]> {
    // Contrats portes par l'organisation OU auxquels elle est partie prenante,
    // dans les deux cas restreints au perimetre de l'acteur.
    const rows = await this.prisma.contract.findMany({
      where: {
        OR: [
          { organizationId },
          { parties: { some: { organizationId } } },
        ],
      },
      include: { parties: { include: { organization: true } } },
      orderBy: { startDate: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      modules: row.modules,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      parties: row.parties.map((party) => ({
        organizationId: party.organizationId,
        organizationName: party.organization.name,
        sharePercent:
          party.shareRatio !== null ? Math.round(party.shareRatio * 1000) / 10 : null,
      })),
    }));
  }

  async listPublishedReports(
    organizationId: string,
    scope: readonly string[],
  ): Promise<ReportView[]> {
    const rows = await this.prisma.report.findMany({
      where: {
        organizationId,
        organization: { id: { in: [...scope] } },
        // Un rapport non publie n'est jamais visible cote client.
        publishedAt: { not: null },
      },
      orderBy: { period: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      period: row.period,
      kpi: row.kpiJson as Record<string, number | string | boolean>,
      publishedAt: row.publishedAt,
    }));
  }

  async listMembers(organizationId: string, scope: readonly string[]): Promise<MemberView[]> {
    const rows = await this.prisma.organizationMembership.findMany({
      where: { organizationId, organization: { id: { in: [...scope] } } },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      userId: row.userId,
      fullName: row.user.fullName,
      email: row.user.email,
      role: row.role,
      status: row.user.status,
      mfaEnabled: row.user.mfaEnabled,
      invitedAt: row.user.invitedAt,
      activatedAt: row.user.activatedAt,
    }));
  }
}

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureUser(data: { email: string; fullName: string }): Promise<{ id: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.user.create({
      data: { email: data.email, fullName: data.fullName, status: "INVITED" },
      select: { id: true },
    });
  }

  async assignRole(data: {
    userId: string;
    organizationId: string;
    role: string;
  }): Promise<void> {
    const role = data.role as MembershipRole;
    await this.prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: { userId: data.userId, organizationId: data.organizationId },
      },
      update: { role },
      create: { userId: data.userId, organizationId: data.organizationId, role },
    });
  }
}
