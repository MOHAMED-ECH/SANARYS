/**
 * Regles de la file commerciale.
 *
 * Sans cette file, un lead cree par le site public n'existerait nulle part
 * pour l'equipe commerciale : le CRM etant mocke dans ce build, c'est ici que
 * la demande d'un dirigeant devient reellement exploitable.
 */

export type LeadStatus =
  | "NEW"
  | "QUALIFIED"
  | "CONTACTED"
  | "AUDIT_REQUESTED"
  | "PROPOSAL_SENT"
  | "CLOSED_LOST"
  | "CLOSED_WON";

export type LeadPriority = "LOW" | "MEDIUM" | "HIGH";

export interface LeadUpdate {
  readonly status?: LeadStatus | undefined;
  readonly priority?: LeadPriority | undefined;
  readonly ownerRef?: string | null | undefined;
  readonly nextActionAt?: Date | null | undefined;
  readonly note?: string | undefined;
}

export interface LeadCurrentState {
  readonly status: string;
  readonly priority: string;
}

/**
 * Decrit ce qui change, pour l'historique lu par un commercial.
 *
 * Un champ soumis a l'identique n'est pas un changement : le mentionner
 * remplirait l'historique de bruit et noierait les vraies transitions.
 */
export function describeChanges(current: LeadCurrentState, update: LeadUpdate): string[] {
  const changes: string[] = [];

  if (update.status && update.status !== current.status) {
    changes.push(`statut : ${current.status} → ${update.status}`);
  }
  if (update.priority && update.priority !== current.priority) {
    changes.push(`priorité : ${update.priority}`);
  }
  if (update.ownerRef !== undefined) {
    changes.push(`affecté à : ${update.ownerRef ?? "personne"}`);
  }

  return changes;
}

/** Entree d'historique correspondant a une mise a jour. */
export function buildHistoryEntry(
  current: LeadCurrentState,
  update: LeadUpdate,
): { type: "NOTE" | "UPDATED"; message: string } {
  if (update.note) return { type: "NOTE", message: update.note };

  const changes = describeChanges(current, update);
  return {
    type: "UPDATED",
    message: changes.length ? changes.join(" · ") : "Mise à jour.",
  };
}
