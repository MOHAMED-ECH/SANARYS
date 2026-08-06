"use client";

import { PortalShell } from "@/features/portal/PortalShell";
import { SecurityView } from "@/features/portal/SecurityView";

export default function PortailSecuritePage() {
  return (
    <PortalShell active="security">
      {/* La sécurité du compte ne dépend pas de l'organisation sélectionnée :
          elle appartient à l'utilisateur, pas à son appartenance. */}
      {() => <SecurityView />}
    </PortalShell>
  );
}
