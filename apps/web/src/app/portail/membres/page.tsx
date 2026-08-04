"use client";

import { PortalShell } from "@/features/portal/PortalShell";
import { MembersView } from "@/features/portal/MembersView";

export default function MembresPage() {
  return (
    <PortalShell active="members">
      {({ organizationId, canInvite }) => (
        <MembersView organizationId={organizationId} canInvite={canInvite} />
      )}
    </PortalShell>
  );
}
