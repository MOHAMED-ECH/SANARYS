/**
 * Ports du portail client.
 *
 * Chaque methode de lecture prend un `scope` : la liste d'organisations que
 * l'acteur peut atteindre. Ce n'est pas une commodite, c'est la garantie
 * d'isolation — un depot qui ignorerait ce parametre laisserait fuir les
 * donnees d'une autre PME. Le type l'impose donc a l'appel.
 */

export interface OrganizationView {
  readonly id: string;
  readonly name: string;
  readonly type: "GROUPEMENT" | "COMPANY" | "ZONE_MANAGER";
  readonly industrialZoneName: string | null;
  readonly memberCount: number;
  readonly siteCount: number;
}

export interface ContractPartyView {
  readonly organizationId: string;
  readonly organizationName: string;
  /** Quote-part en pourcentage, arrondie au dixieme. Null si non repartie. */
  readonly sharePercent: number | null;
}

export interface ContractView {
  readonly id: string;
  readonly label: string;
  readonly modules: readonly string[];
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly status: string;
  readonly parties: readonly ContractPartyView[];
}

export interface ReportView {
  readonly id: string;
  readonly period: string;
  readonly kpi: Record<string, number | string | boolean>;
  readonly publishedAt: Date | null;
}

export interface MemberView {
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: "ORG_ADMIN" | "HSE_MANAGER" | "COMPANY_DIRECTOR" | "ZONE_MANAGER" | "VIEWER";
  readonly status: "INVITED" | "ACTIVE" | "SUSPENDED";
  readonly mfaEnabled: boolean;
  readonly invitedAt: Date;
  readonly activatedAt: Date | null;
}

export interface OrganizationRepository {
  findInScope(organizationId: string, scope: readonly string[]): Promise<OrganizationView | null>;
  listContracts(organizationId: string, scope: readonly string[]): Promise<ContractView[]>;
  /** Ne retourne que les rapports publies : un brouillon n'est jamais visible. */
  listPublishedReports(organizationId: string, scope: readonly string[]): Promise<ReportView[]>;
  listMembers(organizationId: string, scope: readonly string[]): Promise<MemberView[]>;
}

export interface MembershipRepository {
  /** Cree le compte s'il n'existe pas, sans jamais ecraser un compte existant. */
  ensureUser(data: { email: string; fullName: string }): Promise<{ id: string }>;
  assignRole(data: { userId: string; organizationId: string; role: string }): Promise<void>;
}

/** Emission de l'invitation : deleguee au module auth via son API publique. */
export interface InviteIssuerPort {
  issue(userId: string): Promise<string>;
}
