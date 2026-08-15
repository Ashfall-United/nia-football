import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Film, Plus } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { listPlayersForTeam, getPlayerPhotoUrls } from "@/domain/players/queries";
import { listClipsForVideo } from "@/domain/clips/queries";
import { listEventsForVideo } from "@/domain/events/queries";
import {
  eventTypeLabelByValue,
  highlightEventTypes,
} from "@/lib/validation/event";
import {
  getCalibrationForVideo,
  listHeatmapsForVideo,
} from "@/domain/analysis/queries";
import {
  buildStreamThumbnailUrl,
  resolveStreamIframeSrc,
} from "@/services/cloudflare/playback";
import { resolveVideoDurationSeconds } from "@/services/cloudflare/video-duration";
import { buildVideoPageHref } from "@/lib/video/routes";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { ListPanel, PageShell } from "@/components/page-shell";
import { CreateClipForm } from "./create-clip-form";
import { VideoAnalysisWorkspace } from "./video-analysis-workspace";
import { RunDetectionButton } from "./run-detection-button";

// Ball detection and heatmap generation call out to the ML service and
// can run well past Vercel's default function timeout, especially on a
// slower host — give this route's Server Actions real headroom (needs
// Fluid Compute, which is on by default, to actually apply on Hobby).
export const maxDuration = 180;
import { PitchAnalysisPanel } from "./pitch-analysis-panel";
import { HighlightsPanel } from "./highlights-panel";

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default async function VideoPage(
  props: PageProps<"/org/[slug]/teams/[teamId]/sessions/[sessionId]/videos/[videoId]">,
) {
  const { slug, teamId, sessionId, videoId } = await props.params;
  const searchParams = await props.searchParams;
  const membership = await requireOrganisationBySlug(slug);

  const rawStart = searchParams?.t;
  const initialSeekSeconds =
    typeof rawStart === "string" && /^\d+$/.test(rawStart)
      ? Number.parseInt(rawStart, 10)
      : null;

  const session = await getSessionForOrganisation(membership.id, sessionId);
  if (!session || session.teamId !== teamId) {
    notFound();
  }

  const video = await getVideoForOrganisation(membership.id, videoId);
  if (!video || video.sessionId !== sessionId) {
    notFound();
  }

  const canAnalyze = ANALYSIS_MANAGEMENT_ROLES.includes(membership.role);

  const backLink = (
    <Link
      href={`/org/${slug}/teams/${teamId}/sessions/${sessionId}`}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3" />
      Session
    </Link>
  );

  if (video.status !== "ready") {
    return (
      <PageShell>
        {backLink}
        <EmptyState
          icon={Film}
          title={
            video.status === "uploading"
              ? "This video is still uploading"
              : "This video failed to upload"
          }
          description={
            video.status === "uploading"
              ? "Check back once the upload finishes."
              : "Try capturing this session again."
          }
        />
      </PageShell>
    );
  }

  const [
    players,
    clips,
    events,
    iframeSrc,
    durationSeconds,
    calibration,
    heatmaps,
  ] = await Promise.all([
    listPlayersForTeam(membership.id, teamId),
    listClipsForVideo(membership.id, videoId),
    listEventsForVideo(membership.id, videoId),
    resolveStreamIframeSrc(video.cloudflareStreamUid),
    resolveVideoDurationSeconds(video),
    getCalibrationForVideo(membership.id, videoId),
    listHeatmapsForVideo(membership.id, videoId),
  ]);
  const photoUrls = await getPlayerPhotoUrls(players.map((p) => p.photoPath));
  const playerOptions = players.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    photoUrl: photoUrls.get(p.photoPath),
    jerseyNumber: p.jerseyNumber,
  }));

  const highlightEventTypeSet = new Set<string>(highlightEventTypes);
  const clippedEventIds = new Set(
    clips.flatMap((clip) => (clip.sourceEventId ? [clip.sourceEventId] : [])),
  );
  const highlightCandidates = events
    .filter(
      (event) =>
        event.reviewStatus === "confirmed" &&
        highlightEventTypeSet.has(event.type) &&
        !clippedEventIds.has(event.id),
    )
    .map((event) => ({
      eventId: event.id,
      typeLabel: eventTypeLabelByValue.get(event.type) ?? event.type,
      timestampSeconds: event.timestampSeconds,
    }));

  return (
    <PageShell>
      {backLink}

      {canAnalyze ? (
        <div className="flex justify-end">
          <RunDetectionButton slug={slug} videoId={videoId} />
        </div>
      ) : null}

      <VideoAnalysisWorkspace
        slug={slug}
        videoId={videoId}
        iframeSrc={iframeSrc}
        initialSeekSeconds={initialSeekSeconds}
        canAnalyze={canAnalyze}
        players={playerOptions}
        events={events.map((event) => ({
          id: event.id,
          type: event.type,
          timestampSeconds: event.timestampSeconds,
          notes: event.notes,
          playerIds: event.playerIds,
          reviewStatus: event.reviewStatus,
        }))}
      />

      {canAnalyze && (
        <PitchAnalysisPanel
          slug={slug}
          videoId={videoId}
          thumbnailUrl={buildStreamThumbnailUrl(video.cloudflareStreamUid)}
          calibration={calibration}
          heatmaps={heatmaps}
        />
      )}

      {canAnalyze && (
        <HighlightsPanel
          slug={slug}
          videoId={videoId}
          candidates={highlightCandidates}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Film className="size-4 text-primary" />
            Clips
          </h2>
          {canAnalyze && (
            <FormDialog
              triggerLabel="Add clip"
              triggerIcon={<Plus className="size-4" />}
              title="Add a clip"
            >
              <CreateClipForm
                slug={slug}
                videoId={videoId}
                durationSeconds={durationSeconds}
              />
            </FormDialog>
          )}
        </div>
        {clips.length > 0 ? (
          <ListPanel>
            {clips.map((clip) => (
              <li key={clip.id}>
                <Link
                  href={buildVideoPageHref(
                    { slug, teamId, sessionId, videoId },
                    { startSeconds: clip.startSeconds },
                  )}
                  className="block px-4 py-3.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{clip.title}</p>
                    {clip.sourceEventId && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        Highlight
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(clip.startSeconds)} –{" "}
                    {formatTimestamp(clip.endSeconds)}
                  </p>
                </Link>
              </li>
            ))}
          </ListPanel>
        ) : (
          <EmptyState
            icon={Film}
            title="No clips yet"
            description={
              canAnalyze
                ? "Use Add clip to save the full recording or mark a highlight. The recording itself is already stored — clips are how you bookmark it in the library."
                : "An owner, admin, coach, or analyst hasn't clipped anything yet."
            }
          />
        )}
      </div>
    </PageShell>
  );
}
