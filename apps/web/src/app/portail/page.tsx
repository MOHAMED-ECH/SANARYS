"use client";

import { PortalShell } from "@/features/portal/PortalShell";
import { DashboardView } from "@/features/portal/views";

export default function PortailPage() {
  return (
    <PortalShell active="dashboard">
      {({ organizationId }) => <DashboardView organizationId={organizationId} />}
    </PortalShell>
  );
}
