import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Video as VideoIcon } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import {
  MEDIA_MANAGEMENT_ROLES,
  ROSTER_MANAGEMENT_ROLES,
} from "@/domain/organisations/roles";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { listVideosForSession } from "@/domain/videos/queries";
import { listCamerasForOrganisation } from "@/domain/cameras/queries";
import { listClipsForVideos } from "@/domain/clips/queries";
import { buildStreamThumbnailUrl } from "@/services/cloudflare/playback";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  FootageCard,
  FootageCardGrid,
  sortFootageVideos,
} from "./footage-card";
import { ManageFootageCard } from "./manage-footage-card";
import { SessionDetailMenu } from "./session-detail-menu";
import { SessionMetaBar } from "./session-meta-bar";

export default async function SessionPage(
  props: PageProps<"/org/[slug]/teams/[teamId]/sessions/[sessionId]">,
) {
  const { slug, teamId, sessionId } = await props.params;
  const membership = await requireOrganisationBySlug(slug);

  const session = await getSessionForOrganisation(membership.id, sessionId);
  if (!session || session.teamId !== teamId) {
    notFound();
  }

  const videos = await listVideosForSession(membership.id, sessionId);
  const [cameras, clips] = await Promise.all([
    listCamerasForOrganisation(membership.id),
    listClipsForVideos(
      membership.id,
      videos.map((video) => video.id),
    ),
  ]);
  const clipsByVideoId = clips.reduce((map, clip) => {
    const existing = map.get(clip.videoId) ?? [];
    existing.push(clip);
    map.set(clip.videoId, existing);
    return map;
  }, new Map<string, typeof clips>());
  const cameraNameById = new Map(cameras.map((c) => [c.id, c.name]));
  const canCapture = MEDIA_MANAGEMENT_ROLES.includes(membership.role);
  const canManageSessions = ROSTER_MANAGEMENT_ROLES.includes(membership.role);
  const sortedVideos = sortFootageVideos(videos);
  const readyVideoCount = sortedVideos.filter((v) => v.status === "ready").length;

  const title =
    session.type === "match" ? `vs ${session.opponentName}` : "Training";

  return (
    <PageShell className="space-y-8">
      <div className="space-y-4">
        <Link
          href={`/org/${slug}/teams/${teamId}/sessions`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Sessions
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold uppercase tracking-tight">
              {title}
            </h1>
            <Badge variant={session.type === "match" ? "default" : "secondary"}>
              {session.type === "match" ? "Match" : "Training"}
            </Badge>
          </div>
          {canManageSessions && (
            <SessionDetailMenu
              slug={slug}
              teamId={teamId}
              session={session}
              readyVideos={readyVideoCount}
            />
          )}
        </div>
        <SessionMetaBar session={session} />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <VideoIcon className="size-4 text-primary" />
              Footage
            </h2>
            {sortedVideos.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {sortedVideos.length === 1
                  ? "1 capture on this session"
                  : `${sortedVideos.length} captures on this session`}
              </p>
            )}
          </div>
          {canCapture && (
            <Link
              href={`/org/${slug}/teams/${teamId}/sessions/${sessionId}/capture`}
              className={buttonVariants({ size: "sm" })}
            >
              Start capture
            </Link>
          )}
        </div>

        {sortedVideos.length > 0 ? (
          <FootageCardGrid>
            {sortedVideos.map((video) => {
              const videoClips = clipsByVideoId.get(video.id) ?? [];
              const thumbnailUrl =
                video.status === "ready"
                  ? buildStreamThumbnailUrl(video.cloudflareStreamUid)
                  : null;
              const href = `/org/${slug}/teams/${teamId}/sessions/${sessionId}/videos/${video.id}`;
              const cameraName =
                cameraNameById.get(video.cameraId) ?? "Camera";

              return (
              <li key={video.id}>
                {canCapture ? (
                  <ManageFootageCard
                    slug={slug}
                    sessionId={sessionId}
                    video={video}
                    cameraName={cameraName}
                    thumbnailUrl={thumbnailUrl}
                    href={href}
                    clips={videoClips}
                  />
                ) : (
                  <FootageCard
                    video={video}
                    cameraName={cameraName}
                    thumbnailUrl={thumbnailUrl}
                    href={href}
                    clips={videoClips}
                  />
                )}
              </li>
              );
            })}
          </FootageCardGrid>
        ) : (
          <EmptyState
            icon={VideoIcon}
            title="No footage yet"
            description={
              canCapture
                ? "Start a capture above to record this session."
                : "A media team member hasn't captured any footage yet."
            }
          />
        )}
      </section>
    </PageShell>
  );
}
