import type { CrmPort } from "../../../integrations/crm/index.js";
import type { NotificationPort } from "../../../integrations/notifications/index.js";
import { InvalidInputError } from "../../../shared/errors/domain-error.js";
import type { ClockPort } from "../../../shared/time/system-clock.js";
import { LeadNotFoundError } from "../domain/errors.js";
import {
  FIRST_CONTACT_TARGET_MS,
  buildDedupeKey,
  reconcileScore,
  scoreLead,
  type ScoringFacts,
} from "../domain/lead.js";
import type { LeadRepository, LeadSnapshot, LeadSubmission, SimulationFactsPort } from "../domain/ports.js";

/**
 * Cas d'usage du module leads (guide, section 4.6) : charger, appeler le
 * domaine, sauvegarder, retourner. Aucun code HTTP, aucun acces ORM direct.
 */

interface SubmitDependencies {
  readonly leads: LeadRepository;
  readonly simulationFacts: SimulationFactsPort;
  readonly tokens: { hash(token: string): string };
  readonly crm: CrmPort;
  readonly notifications: NotificationPort;
  readonly clock: ClockPort;
}

class InvalidSimulationLinkError extends InvalidInputError {
  constructor() {
    super("SIMULATION_LINK_INVALID", "La simulation rattachee est introuvable ou expiree.");
  }
}

export interface SubmitLeadResult {
  readonly lead: LeadSnapshot;
  readonly isNew: boolean;
}

export class SubmitLeadUseCase {
  constructor(private readonly deps: SubmitDependencies) {}

  async execute(submission: LeadSubmission): Promise<SubmitLeadResult> {
    const dedupeKey = buildDedupeKey(submission.contactEmail, submission.companyName);
    const now = this.deps.clock.now();

    let facts: ScoringFacts = { hasSimulation: false };
    if (submission.simulationId) {
      if (!submission.simulationResumeToken) throw new InvalidSimulationLinkError();

      const fromSimulation = await this.deps.simulationFacts.factsFor({
        simulationId: submission.simulationId,
        resumeTokenHash: this.deps.tokens.hash(submission.simulationResumeToken),
        now,
      });
      if (!fromSimulation) throw new InvalidSimulationLinkError();
      facts = { ...fromSimulation, hasSimulation: true };
    }

    const existing = await this.deps.leads.findByDedupeKey(dedupeKey);
    const { score, priority } = reconcileScore(scoreLead(facts).score, existing?.score ?? null);

    const lead = await this.deps.leads.upsert({
      dedupeKey,
      submission,
      score,
      priority,
      consentTimestamp: submission.consentMarketing ? now : null,
      nextActionAt: new Date(now.getTime() + FIRST_CONTACT_TARGET_MS),
      isUpdate: existing !== null,
    });

    await this.deps.leads.appendEvent({
      leadId: lead.id,
      type: existing ? "LEAD_UPDATED" : "LEAD_CREATED",
      message: existing
        ? "Nouvelle soumission rattachée au lead existant (dédoublonnage)."
        : `Lead créé depuis ${submission.source ?? "le site public"}.`,
    });

    // Synchronisation CRM (adaptateur no-op dans ce build). La file interne
    // /staff/leads reste la source consultable en toutes circonstances : un
    // echec de synchronisation ne doit jamais faire disparaitre un lead.
    const crmStatus = await this.deps.crm.syncLead({
      leadId: lead.id,
      contactName: lead.contactName,
      companyName: lead.companyName,
      contactEmail: lead.contactEmail,
      source: lead.source ?? undefined,
      campaign: lead.campaign ?? undefined,
    });
    await this.deps.leads.updateCrmSyncStatus(lead.id, crmStatus);

    await this.deps.notifications.send({
      to: "commercial@sanarys.ma",
      channel: "EMAIL",
      template: existing ? "lead.updated" : "lead.created",
      variables: { leadId: lead.id, companyName: lead.companyName, priority: lead.priority },
    });

    return { lead, isNew: existing === null };
  }
}

/** Utilise par le parcours de confirmation, qui ne doit rien apprendre du lead. */
export class CheckLeadExistsUseCase {
  constructor(private readonly leads: LeadRepository) {}

  async execute(id: string): Promise<{ exists: boolean }> {
    return { exists: await this.leads.exists(id) };
  }
}

/**
 * Transition demandee par le module audit-requests, via l'API publique du
 * module leads : demander un audit fait progresser le lead dans son cycle
 * commercial, et cette regle appartient au lead, pas a l'audit.
 */
export class MarkLeadAuditRequestedUseCase {
  constructor(private readonly leads: LeadRepository) {}

  async execute(command: { leadId: string; message: string }): Promise<LeadSnapshot> {
    const lead = await this.leads.findById(command.leadId);
    if (!lead) throw new LeadNotFoundError(command.leadId);

    await this.leads.markAuditRequested(lead.id);
    await this.leads.appendEvent({
      leadId: lead.id,
      type: "AUDIT_REQUESTED",
      message: command.message,
    });

    return lead;
  }
}
