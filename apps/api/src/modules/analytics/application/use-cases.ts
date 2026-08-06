import type { AnalyticsEventRepository } from "../domain/ports.js";
import { sanitizeEventProperties } from "../domain/tracking-plan.js";

/**
 * Cas d'usage analytics (guide, section 4.6).
 *
 * Un evenement hors plan de marquage n'est pas une erreur : c'est un refus
 * silencieux. Le client ne doit pas pouvoir deduire, depuis la reponse, quels
 * evenements existent — d'ou un resultat uniforme plutot qu'une exception.
 */
export interface RecordEventOutcome {
  readonly accepted: boolean;
}

export class RecordAnalyticsEventUseCase {
  constructor(private readonly events: AnalyticsEventRepository) {}

  async execute(command: {
    name: string;
    properties: Record<string, unknown>;
    sessionRef?: string | undefined;
  }): Promise<RecordEventOutcome> {
    const properties = sanitizeEventProperties(command.name, command.properties);
    if (!properties) return { accepted: false };

    await this.events.record({
      name: command.name,
      properties,
      sessionRef: command.sessionRef ?? null,
    });

    return { accepted: true };
  }
}
