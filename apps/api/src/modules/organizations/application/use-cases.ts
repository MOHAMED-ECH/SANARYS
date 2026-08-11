import type { NotificationPort } from "../../../integrations/notifications/index.js";
import type { AuditTrailPort } from "../../../shared/audit/audit-trail.js";
import { accessibleOrganizationIds, resolveScope, type Action, type Actor } from "../../authz/index.js";
import { InviteNotAllowedError, OrganizationNotAccessibleError } from "../domain/errors.js";
import type {
  ContractView,
  DocumentPayload,
  DocumentView,
  InviteIssuerPort,
  MemberView,
  MembershipRepository,
  OrganizationRepository,
  OrganizationView,
  ReportView,
} from "../domain/ports.js";
import type { StoragePort } from "../../../integrations/storage/index.js";
import { DocumentNotAccessibleError } from "../domain/errors.js";

/**
 * Cas d'usage du portail client (guide, section 4.6).
 *
 * Toute lecture suit la meme sequence, sans exception possible :
 *  1. `resolveScope` decide ET calcule le perimetre ;
 *  2. le depot recoit ce perimetre et restreint sa requete ;
 *  3. l'acces est journalise.
 *
 * Le point 2 est ce qui distingue une autorisation d'une isolation : autoriser
 * la lecture d'une organisation sans restreindre la requete laisserait
 * remonter les lignes des organisations voisines.
 */

interface ReadDependencies {
  readonly organizations: OrganizationRepository;
  readonly audit: AuditTrailPort;
}

interface AccessContext {
  readonly actor: Actor;
  readonly organizationId: string;
  readonly ip?: string | undefined;
}

/** Decide, ou leve l'erreur metier adaptee apres avoir trace le refus. */
async function requireScope(
  deps: ReadDependencies,
  context: AccessContext,
  action: Action,
): Promise<string[]> {
  const scope = resolveScope(context.actor, action, context.organizationId);
  if (scope) return scope;

  await deps.audit.record({
    actorUserId: context.actor.userId,
    action: "portal.access_denied",
    resourceType: "organization",
    resourceId: context.organizationId,
    ip: context.ip,
    metadata: { attempted: action },
  });

  throw new OrganizationNotAccessibleError();
}

export class GetOrganizationUseCase {
  constructor(private readonly deps: ReadDependencies) {}

  async execute(context: AccessContext): Promise<OrganizationView> {
    const scope = await requireScope(this.deps, context, "organization:read");

    const organization = await this.deps.organizations.findInScope(context.organizationId, scope);
    if (!organization) throw new OrganizationNotAccessibleError();

    return organization;
  }
}

export class ListContractsUseCase {
  constructor(private readonly deps: ReadDependencies) {}

  async execute(context: AccessContext): Promise<ContractView[]> {
    const scope = await requireScope(this.deps, context, "contract:read");
    const contracts = await this.deps.organizations.listContracts(context.organizationId, scope);

    await this.deps.audit.record({
      actorUserId: context.actor.userId,
      action: "portal.contracts_listed",
      resourceType: "organization",
      resourceId: context.organizationId,
      ip: context.ip,
      metadata: { count: contracts.length },
    });

    return contracts;
  }
}

export class ListReportsUseCase {
  constructor(private readonly deps: ReadDependencies) {}

  async execute(context: AccessContext): Promise<ReportView[]> {
    const scope = await requireScope(this.deps, context, "report:read");
    const reports = await this.deps.organizations.listPublishedReports(
      context.organizationId,
      scope,
    );

    await this.deps.audit.record({
      actorUserId: context.actor.userId,
      action: "portal.reports_listed",
      resourceType: "organization",
      resourceId: context.organizationId,
      ip: context.ip,
      metadata: { count: reports.length },
    });

    return reports;
  }
}

export class ListDocumentsUseCase {
  constructor(private readonly deps: ReadDependencies) {}

  async execute(context: AccessContext): Promise<DocumentView[]> {
    const scope = await requireScope(this.deps, context, "document:read");
    const documents = await this.deps.organizations.listDocuments(context.organizationId, scope);

    await this.deps.audit.record({
      actorUserId: context.actor.userId,
      action: "portal.documents_listed",
      resourceType: "organization",
      resourceId: context.organizationId,
      ip: context.ip,
      metadata: { count: documents.length },
    });

    return documents;
  }
}

/**
 * Sert le contenu d'un document.
 *
 * L'autorisation ne se fait pas ici sur un identifiant d'organisation fourni
 * par l'appelant — il n'y en a pas : la requete ne porte que l'identifiant du
 * document. Le perimetre de l'acteur est donc passe au depot, qui ne retrouve
 * le document que s'il appartient a une organisation accessible. Un document
 * hors perimetre est introuvable, pas « interdit » : la reponse ne revele donc
 * pas son existence.
 *
 * Chaque telechargement est journalise nominativement. C'est le seul endroit
 * du portail ou une piece contractuelle quitte le systeme, et c'est exactement
 * ce qu'un audit voudra pouvoir reconstituer.
 */
export class DownloadDocumentUseCase {
  constructor(
    private readonly deps: ReadDependencies & { readonly storage: StoragePort },
  ) {}

  async execute(command: {
    actor: Actor;
    documentId: string;
    ip?: string | undefined;
  }): Promise<DocumentPayload> {
    const scope = accessibleOrganizationIds(command.actor);

    const document =
      scope.length === 0
        ? null
        : await this.deps.organizations.findDocumentInScope(command.documentId, scope);

    if (!document) {
      await this.deps.audit.record({
        actorUserId: command.actor.userId,
        action: "portal.document_denied",
        resourceType: "document",
        resourceId: command.documentId,
        ip: command.ip,
      });
      throw new DocumentNotAccessibleError();
    }

    const bytes = await this.deps.storage.get(document.storageKey);

    await this.deps.audit.record({
      actorUserId: command.actor.userId,
      action: "portal.document_downloaded",
      resourceType: "document",
      resourceId: document.id,
      ip: command.ip,
      metadata: { kind: document.kind, organizationId: document.organizationId },
    });

    return {
      fileName: fileNameFor(document),
      mimeType: document.mimeType,
      bytes,
    };
  }
}

/** Nom de fichier propose au navigateur, lisible et sans caractere hasardeux. */
function fileNameFor(document: DocumentView): string {
  const base = document.label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const extension = document.mimeType === "application/pdf" ? "pdf" : "bin";
  return `${base || "document"}.${extension}`;
}

export class ListMembersUseCase {
  constructor(private readonly deps: ReadDependencies) {}

  async execute(context: AccessContext): Promise<MemberView[]> {
    const scope = await requireScope(this.deps, context, "organization:read");
    const members = await this.deps.organizations.listMembers(context.organizationId, scope);

    await this.deps.audit.record({
      actorUserId: context.actor.userId,
      action: "portal.members_listed",
      resourceType: "organization",
      resourceId: context.organizationId,
      ip: context.ip,
      metadata: { count: members.length },
    });

    return members;
  }
}

export class InviteMemberUseCase {
  constructor(
    private readonly deps: {
      readonly memberships: MembershipRepository;
      readonly invites: InviteIssuerPort;
      readonly notifications: NotificationPort;
      readonly audit: AuditTrailPort;
    },
  ) {}

  async execute(
    context: AccessContext & { email: string; fullName: string; role: string },
  ): Promise<{ userId: string }> {
    // `member:invite` exige une appartenance DIRECTE : un administrateur de
    // groupement n'invite pas dans une PME fille par heritage.
    if (!resolveScope(context.actor, "member:invite", context.organizationId)) {
      await this.deps.audit.record({
        actorUserId: context.actor.userId,
        action: "portal.invite_denied",
        resourceType: "organization",
        resourceId: context.organizationId,
        ip: context.ip,
      });
      throw new InviteNotAllowedError();
    }

    const email = context.email.trim().toLowerCase();
    const user = await this.deps.memberships.ensureUser({ email, fullName: context.fullName });

    await this.deps.memberships.assignRole({
      userId: user.id,
      organizationId: context.organizationId,
      role: context.role,
    });

    const token = await this.deps.invites.issue(user.id);
    await this.deps.notifications.send({
      to: email,
      channel: "EMAIL",
      template: "portal.invite",
      variables: { token, organizationId: context.organizationId },
    });

    await this.deps.audit.record({
      actorUserId: context.actor.userId,
      action: "portal.user_invited",
      resourceType: "organization",
      resourceId: context.organizationId,
      ip: context.ip,
      metadata: { invitedUserId: user.id, role: context.role },
    });

    return { userId: user.id };
  }
}
