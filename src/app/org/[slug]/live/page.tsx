import { Radio } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEDIA_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { listCameraLiveStatuses } from "@/domain/cameras/queries";
import { listRecentSessionsForOrganisation } from "@/domain/sessions/queries";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-shell";
import { LiveMonitorClient } from "./live-monitor-client";

export default async function LiveMonitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );
  const [statuses, sessions] = await Promise.all([
    listCameraLiveStatuses(membership.id),
    listRecentSessionsForOrganisation(membership.id),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Live monitor"
        titleCase="sentence"
        icon={Radio}
        description="Watch stream status across all cameras. Status refreshes every 15 seconds."
      />

      {statuses.length > 0 ? (
        <LiveMonitorClient
          slug={slug}
          initialStatuses={statuses}
          sessions={sessions}
        />
      ) : (
        <EmptyState
          icon={Radio}
          title="No cameras yet"
          description="Add cameras and connect them to Stream before monitoring live feeds."
        />
      )}
    </PageShell>
  );
}
