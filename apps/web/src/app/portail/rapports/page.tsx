"use client";

import { PortalShell } from "@/features/portal/PortalShell";
import { ReportsView } from "@/features/portal/views";

export default function RapportsPage() {
  return (
    <PortalShell active="reports">
      {({ organizationId }) => <ReportsView organizationId={organizationId} />}
    </PortalShell>
  );
}
