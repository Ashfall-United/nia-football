import { Sparkles } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { listSuggestedEventsForOrganisation } from "@/domain/events/queries";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import { buildVideoPageHref } from "@/lib/video/routes";
import { EmptyState } from "@/components/empty-state";
import { ListPanel, PageHeader, PageShell } from "@/components/page-shell";
import { ReviewEventRow } from "./review-event-row";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const suggestedEvents = await listSuggestedEventsForOrganisation(
    membership.id,
  );

  const videoIds = [...new Set(suggestedEvents.map((event) => event.videoId))];
  const videoContexts = new Map<
    string,
    {
      teamId: string;
      sessionId: string;
      label: string;
    }
  >();

  await Promise.all(
    videoIds.map(async (videoId) => {
      const video = await getVideoForOrganisation(membership.id, videoId);
      if (!video) return;

      const session = await getSessionForOrganisation(
        membership.id,
        video.sessionId,
      );
      if (!session) return;

      const team = await getTeamForOrganisation(
        membership.id,
        session.teamId,
      );
      const teamName = team?.name ?? "Team";

      videoContexts.set(videoId, {
        teamId: session.teamId,
        sessionId: session.id,
        label: `${teamName} · ${session.type === "match" ? "Match" : "Training"}`,
      });
    }),
  );

  return (
    <PageShell>
      <PageHeader
        title="AI review"
        titleCase="sentence"
        icon={Sparkles}
        description="Confirm or reject events suggested by ball detection before they enter your analysis."
      />

      {suggestedEvents.length > 0 ? (
        <ListPanel>
          {suggestedEvents.map((event) => {
            const context = videoContexts.get(event.videoId);
            const videoHref = context
              ? buildVideoPageHref(
                  {
                    slug,
                    teamId: context.teamId,
                    sessionId: context.sessionId,
                    videoId: event.videoId,
                  },
                  { startSeconds: event.timestampSeconds },
                )
              : null;

            return (
              <ReviewEventRow
                key={event.id}
                slug={slug}
                event={event}
                videoHref={videoHref}
                videoLabel={context?.label ?? "Unknown video"}
              />
            );
          })}
        </ListPanel>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Review queue is clear"
          description="When ball detection runs on session footage, suggested shot events will appear here for confirmation."
        />
      )}
    </PageShell>
  );
}
