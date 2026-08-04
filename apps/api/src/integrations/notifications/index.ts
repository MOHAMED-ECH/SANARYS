/**
 * Interface de notification (email/SMS/WhatsApp - cahier des charges section 17).
 *
 * STATUT DANS CE BUILD : MOCK. Aucune notification n'est reellement envoyee.
 * L'adaptateur "console" journalise l'intention et ne fait rien d'autre.
 * Remplacer par un adaptateur reel (ex. provider email transactionnel + API
 * WhatsApp Business) sans toucher aux appelants : ils ne connaissent que
 * `NotificationPort`.
 */
export interface NotificationMessage {
  to: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  template: string;
  variables: Record<string, unknown>;
}

export interface NotificationPort {
  send(message: NotificationMessage): Promise<void>;
}

class ConsoleNotificationAdapter implements NotificationPort {
  async send(message: NotificationMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[notifications:mock] would send ${message.channel} to ${message.to} using template "${message.template}"`,
      message.variables,
    );
  }
}

export function createNotificationAdapter(kind: "console" = "console"): NotificationPort {
  switch (kind) {
    case "console":
    default:
      return new ConsoleNotificationAdapter();
  }
}
