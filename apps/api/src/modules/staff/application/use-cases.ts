import type { AuditTrailPort } from "../../../shared/audit/audit-trail.js";
import type { ClockPort } from "../../../shared/time/system-clock.js";
import { can, type Actor } from "../../authz/index.js";
import { LeadQueueForbiddenError, StaffLeadNotFoundError } from "../domain/errors.js";
import { buildHistoryEntry, type LeadUpdate } from "../domain/lead-queue.js";
import type { QueuedLead, QueuedLeadDetail, StaffLeadRepository } from "../domain/ports.js";

/**
 * Cas d'usage de la file commerciale (guide, section 4.6).
 *
 * Le prefixe `requireStaff` de la couche presentation garantit deja qu'on a
 * affaire a du personnel SANARYS ; `can()` verifie en plus que ce role precis
 * a le droit sur les leads. Les deux ne se recouvrent pas : un role
 * OPERATIONS est bien du personnel, mais n'a rien a faire dans le pipeline
 * commercial.
 */

interface Dependencies {
  readonly leads: StaffLeadRepository;
  readonly audit: AuditTrailPort;
  readonly clock: ClockPort;
}

interface StaffContext {
  readonly actor: Actor;
  readonly ip?: string | undefined;
}

export class ListLeadQueueUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(
    command: StaffContext & {
      status?: string | undefined;
      priority?: string | undefined;
      overdue?: boolean | undefined;
      limit: number;
    },
  ): Promise<{ items: QueuedLead[]; total: number }> {
    if (!can(command.actor, "lead:read")) throw new LeadQueueForbiddenError();

    const result = await this.deps.leads.list({
      status: command.status,
      priority: command.priority,
      ...(command.overdue ? { overdueAt: this.deps.clock.now() } : {}),
      limit: command.limit,
    });

    await this.deps.audit.record({
      actorUserId: command.actor.userId,
      action: "staff.leads_listed",
      resourceType: "lead",
      ip: command.ip,
      metadata: { count: result.items.length },
    });

    return result;
  }
}

export class GetLeadDetailUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: StaffContext & { leadId: string }): Promise<QueuedLeadDetail> {
    if (!can(command.actor, "lead:read")) throw new LeadQueueForbiddenError();

    const lead = await this.deps.leads.findDetail(command.leadId);
    if (!lead) throw new StaffLeadNotFoundError();

    // Consulter la fiche d'un prospect est un acces a des donnees personnelles :
    // il est trace nominativement.
    await this.deps.audit.record({
      actorUserId: command.actor.userId,
      action: "staff.lead_viewed",
      resourceType: "lead",
      resourceId: lead.id,
      ip: command.ip,
    });

    return lead;
  }
}

export class UpdateLeadUseCase {
  constructor(private readonly deps: Dependencies) {}

  async execute(command: StaffContext & { leadId: string; update: LeadUpdate }): Promise<void> {
    if (!can(command.actor, "lead:write")) throw new LeadQueueForbiddenError();

    const current = await this.deps.leads.findState(command.leadId);
    if (!current) throw new StaffLeadNotFoundError();

    await this.deps.leads.applyUpdate(command.leadId, command.update);

    // Chaque changement laisse une trace consultable dans l'historique : c'est
    // ce qui permet de reconstituer le suivi d'un prospect apres coup.
    const entry = buildHistoryEntry(current, command.update);
    await this.deps.leads.appendHistory({
      leadId: command.leadId,
      type: entry.type,
      message: entry.message,
      actorRef: command.actor.userId,
    });

    await this.deps.audit.record({
      actorUserId: command.actor.userId,
      action: "staff.lead_updated",
      resourceType: "lead",
      resourceId: command.leadId,
      ip: command.ip,
      metadata: { status: command.update.status, priority: command.update.priority },
    });
  }
}
