import type { NotificationPort } from "../../../integrations/notifications/index.js";
import { describeAuditRequest } from "../domain/audit-request.js";
import type { AuditRequestRecord, AuditRequestRepository, LeadsGateway } from "../domain/ports.js";

/**
 * Cas d'usage de la demande d'audit (guide, section 4.6).
 *
 * L'ordre compte : on fait d'abord progresser le lead, ce qui echoue si le lead
 * n'existe pas, avant de creer la demande. Une demande d'audit orpheline serait
 * invisible dans la file commerciale — exactement l'echec que le cahier des
 * charges interdit.
 */
export class RequestAuditUseCase {
  constructor(
    private readonly deps: {
      readonly auditRequests: AuditRequestRepository;
      readonly leads: LeadsGateway;
      readonly notifications: NotificationPort;
    },
  ) {}

  async execute(command: {
    leadId: string;
    preferredDate?: string | undefined;
    notes?: string | undefined;
  }): Promise<AuditRequestRecord> {
    const preferredDate = command.preferredDate ? new Date(command.preferredDate) : null;

    const lead = await this.deps.leads.markAuditRequested({
      leadId: command.leadId,
      message: describeAuditRequest(preferredDate),
    });

    const auditRequest = await this.deps.auditRequests.create({
      leadId: lead.id,
      preferredDate,
      notes: command.notes ?? null,
    });

    await this.deps.notifications.send({
      to: "commercial@sanarys.ma",
      channel: "EMAIL",
      template: "audit.requested",
      variables: {
        auditRequestId: auditRequest.id,
        leadId: lead.id,
        companyName: lead.companyName,
      },
    });

    return auditRequest;
  }
}
