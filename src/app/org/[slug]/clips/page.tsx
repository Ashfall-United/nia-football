import { Film, Video as VideoIcon } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { listClipsForOrganisation } from "@/domain/clips/queries";
import { listRecentVideosForOrganisation } from "@/domain/videos/queries";
import { buildStreamThumbnailUrl } from "@/services/cloudflare/playback";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ClipCard, MediaCardGrid, RecordingCard } from "./media-card";

export default async function ClipsPage(
  props: PageProps<"/org/[slug]/clips">,
) {
  const { slug } = await props.params;
  const membership = await requireOrganisationBySlug(slug);
  const [clips, recentVideos] = await Promise.all([
    listClipsForOrganisation(membership.id),
    listRecentVideosForOrganisation(membership.id),
  ]);

  const hasContent = clips.length > 0 || recentVideos.length > 0;

  return (
    <PageShell className="space-y-8">
      <PageHeader title="Clips" icon={Film} />

      {clips.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Highlights
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bookmarked moments clipped from session footage.
            </p>
          </div>
          <MediaCardGrid>
            {clips.map((clip) => (
              <li key={clip.id}>
                <ClipCard clip={clip} slug={slug} />
              </li>
            ))}
          </MediaCardGrid>
        </section>
      ) : null}

      {recentVideos.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <VideoIcon className="size-4 text-primary" />
              Recent recordings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Full session captures live here until you clip a moment from them.
            </p>
          </div>
          <MediaCardGrid>
            {recentVideos.map((video) => (
              <li key={video.id}>
                <RecordingCard
                  video={video}
                  slug={slug}
                  thumbnailUrl={buildStreamThumbnailUrl(video.cloudflareStreamUid)}
                />
              </li>
            ))}
          </MediaCardGrid>
        </section>
      ) : null}

      {!hasContent && (
        <EmptyState
          icon={Film}
          title="No clips yet"
          description="Clips are short highlights marked on session footage. After you capture a session, open the recording and use Add clip to save a moment here."
        />
      )}
    </PageShell>
  );
}
