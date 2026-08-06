/**
 * Journal d'audit.
 *
 * Tracer qui a fait quoi n'est pas un detail technique : c'est une exigence du
 * cahier des charges (section 16) et la seule preuve disponible en cas de
 * contestation. Les cas d'usage ecrivent donc dans ce port, pas dans une table.
 */
export interface AuditEntry {
  readonly actorUserId?: string | null | undefined;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string | null | undefined;
  readonly ip?: string | null | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface AuditTrailPort {
  record(entry: AuditEntry): Promise<void>;
}
