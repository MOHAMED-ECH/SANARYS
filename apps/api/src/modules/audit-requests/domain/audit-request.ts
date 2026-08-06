/**
 * Regles metier de la demande d'audit.
 *
 * Le message d'historique n'est pas de la mise en forme d'affichage : c'est la
 * trace commerciale de ce qui a ete demande, relue par un commercial dans la
 * file interne. Elle appartient donc au domaine, et se teste sans base.
 */
export function describeAuditRequest(preferredDate: Date | null): string {
  if (!preferredDate) return "Audit terrain demandé.";
  const formatted = preferredDate.toLocaleDateString("fr-FR");
  return `Audit terrain demandé (date souhaitée : ${formatted}).`;
}
