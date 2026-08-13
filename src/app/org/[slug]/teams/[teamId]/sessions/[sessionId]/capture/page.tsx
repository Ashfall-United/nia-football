import { notFound } from "next/navigation";
import Link from "next/link";
import { Video } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEDIA_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { listCamerasForOrganisation } from "@/domain/cameras/queries";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { CaptureClient } from "./capture-client";

function formatCaptureSessionLabel(session: {
  type: string;
  scheduledAt: string;
  opponentName: string | null;
}): string {
  const date = new Date(session.scheduledAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (session.type === "match") {
    return session.opponentName
      ? `Match · ${session.opponentName}`
      : `Match · ${date}`;
  }
  return `Training · ${date}`;
}

export default async function CapturePage(
  props: PageProps<"/org/[slug]/teams/[teamId]/sessions/[sessionId]/capture">,
) {
  const { slug, teamId, sessionId } = await props.params;
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const session = await getSessionForOrganisation(membership.id, sessionId);
  if (!session || session.teamId !== teamId) {
    notFound();
  }

  const cameras = await listCamerasForOrganisation(membership.id);

  if (cameras.length === 0) {
    return (
      <PageShell size="md" className="justify-center">
        <EmptyState
          icon={Video}
          title="No cameras to capture with"
          description="Add a camera for your organisation first."
        />
        <Link
          href={`/org/${slug}/cameras`}
          className="text-center text-sm font-medium text-primary underline underline-offset-4"
        >
          Go to Cameras
        </Link>
      </PageShell>
    );
  }

  return (
    <CaptureClient
      slug={slug}
      teamId={teamId}
      sessionId={sessionId}
      sessionHref={`/org/${slug}/teams/${teamId}/sessions/${sessionId}`}
      sessionLabel={formatCaptureSessionLabel(session)}
      cameras={cameras.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
