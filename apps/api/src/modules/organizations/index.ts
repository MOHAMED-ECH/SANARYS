import type { PrismaClient } from "@sanarys/db";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { NotificationPort } from "../../integrations/notifications/index.js";
import type { StoragePort } from "../../integrations/storage/index.js";
import type { AuditTrailPort } from "../../shared/audit/audit-trail.js";
import type { AuthModule } from "../auth/index.js";
import {
  GetOrganizationUseCase,
  InviteMemberUseCase,
  ListContractsUseCase,
  DownloadDocumentUseCase,
  ListDocumentsUseCase,
  ListMembersUseCase,
  ListReportsUseCase,
} from "./application/use-cases.js";
import { AuthModuleInviteIssuer } from "./infrastructure/auth-module-invite-issuer.js";
import {
  PrismaMembershipRepository,
  PrismaOrganizationRepository,
} from "./infrastructure/prisma-organization-repository.js";
import { createOrganizationsRoutes } from "./presentation/routes.js";

/** API publique du module organizations (guide, section 3.3). */

export interface OrganizationsModule {
  readonly getOrganization: GetOrganizationUseCase;
  readonly listContracts: ListContractsUseCase;
  readonly listReports: ListReportsUseCase;
  readonly listMembers: ListMembersUseCase;
  readonly listDocuments: ListDocumentsUseCase;
  readonly downloadDocument: DownloadDocumentUseCase;
  readonly inviteMember: InviteMemberUseCase;
}

export interface OrganizationsModuleDependencies {
  readonly prisma: PrismaClient;
  readonly notifications: NotificationPort;
  readonly audit: AuditTrailPort;
  readonly storage: StoragePort;
  /** L'emission des invitations reste la charge du module auth. */
  readonly auth: AuthModule;
}

export function createOrganizationsModule(
  deps: OrganizationsModuleDependencies,
): OrganizationsModule {
  const organizations = new PrismaOrganizationRepository(deps.prisma);
  const read = { organizations, audit: deps.audit };

  return {
    getOrganization: new GetOrganizationUseCase(read),
    listContracts: new ListContractsUseCase(read),
    listReports: new ListReportsUseCase(read),
    listMembers: new ListMembersUseCase(read),
    listDocuments: new ListDocumentsUseCase(read),
    downloadDocument: new DownloadDocumentUseCase({ ...read, storage: deps.storage }),
    inviteMember: new InviteMemberUseCase({
      memberships: new PrismaMembershipRepository(deps.prisma),
      invites: new AuthModuleInviteIssuer(deps.auth),
      notifications: deps.notifications,
      audit: deps.audit,
    }),
  };
}

export function organizationsRoutes(module: OrganizationsModule): FastifyPluginAsyncZod {
  return createOrganizationsRoutes(module);
}
