"use client";

import { PortalShell } from "@/features/portal/PortalShell";
import { ContractsView } from "@/features/portal/views";

export default function ContratsPage() {
  return (
    <PortalShell active="contracts">
      {({ organizationId }) => <ContractsView organizationId={organizationId} />}
    </PortalShell>
  );
}
