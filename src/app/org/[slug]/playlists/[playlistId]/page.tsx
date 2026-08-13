import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Film, Plus } from "lucide-react";
import { listClipsForOrganisation } from "@/domain/clips/queries";
import { getPlaylistForOrganisation } from "@/domain/playlists/queries";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { PLAYLIST_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { formatVideoTimestamp } from "@/lib/video/timestamp";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ShareLinkButton } from "@/components/share-link-button";
import { AddClipToPlaylistForm } from "./add-clip-form";
import { RemoveClipButton } from "./remove-clip-button";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ slug: string; playlistId: string }>;
}) {
  const { slug, playlistId } = await params;
  const membership = await requireOrganisationBySlug(slug);
  const canManage = PLAYLIST_MANAGEMENT_ROLES.includes(membership.role);

  const [playlist, allClips] = await Promise.all([
    getPlaylistForOrganisation(membership.id, playlistId),
    listClipsForOrganisation(membership.id),
  ]);

  if (!playlist) {
    notFound();
  }

  const playlistClipIds = new Set(playlist.clips.map((clip) => clip.clipId));
  const availableClips = allClips.filter((clip) => !playlistClipIds.has(clip.id));

  return (
    <PageShell className="space-y-8">
      <div>
        <Link
          href={`/org/${slug}/playlists`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All playlists
        </Link>
        <PageHeader
          title={playlist.title}
          titleCase="sentence"
          description={playlist.description ?? undefined}
          action={
            canManage ? (
              <div className="flex flex-wrap items-center gap-2">
                <ShareLinkButton
                  slug={slug}
                  resourceType="playlist"
                  resourceId={playlist.id}
                />
                <FormDialog
                  triggerLabel="Add clip"
                  triggerIcon={<Plus className="size-4" />}
                  title="Add clip to playlist"
                  description="Choose a saved highlight from your organisation library."
                >
                  <AddClipToPlaylistForm
                    slug={slug}
                    playlistId={playlist.id}
                    availableClips={availableClips}
                  />
                </FormDialog>
              </div>
            ) : undefined
          }
        />
      </div>

      {playlist.clips.length > 0 ? (
        <ol className="space-y-4">
          {playlist.clips.map((clip, index) => (
            <li
              key={clip.clipId}
              className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-semibold uppercase tracking-wide">
                      {clip.title}
                    </p>
                    <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatVideoTimestamp(clip.startSeconds)}–
                      {formatVideoTimestamp(clip.endSeconds)}
                    </p>
                    {clip.notes ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {clip.notes}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <RemoveClipButton
                      slug={slug}
                      playlistId={playlist.id}
                      clipId={clip.clipId}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={Film}
          title="No clips in this playlist"
          description={
            canManage
              ? "Add clips from your organisation library to build this playlist."
              : "Clips added by coaches will appear here."
          }
        />
      )}
    </PageShell>
  );
}
