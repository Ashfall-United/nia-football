import Link from "next/link";
import { CalendarDays, Film, Play, Users } from "lucide-react";
import type { PlaylistClipItem } from "@/domain/playlists/types";
import { formatDisplayDate } from "@/lib/format/date";
import { buildVideoPageHref } from "@/lib/video/routes";
import { formatVideoTimestamp } from "@/lib/video/timestamp";
import { buildStreamThumbnailUrl } from "@/services/cloudflare/playback";
import { RemoveClipOverlay } from "./remove-clip-overlay";

function clipDurationSeconds(
  clip: Pick<PlaylistClipItem, "startSeconds" | "endSeconds">,
): number {
  return Math.max(0, clip.endSeconds - clip.startSeconds);
}

export function PlaylistClipCard({
  clip,
  slug,
  playlistId,
  index,
  canManage,
}: {
  clip: PlaylistClipItem;
  slug: string;
  playlistId: string;
  index: number;
  canManage: boolean;
}) {
  const href =
    clip.teamId !== null && clip.sessionId !== null
      ? buildVideoPageHref(
          {
            slug,
            teamId: clip.teamId,
            sessionId: clip.sessionId,
            videoId: clip.videoId,
          },
          { startSeconds: clip.startSeconds },
        )
      : null;

  const thumbnailUrl = clip.streamUid
    ? buildStreamThumbnailUrl(clip.streamUid, 400, clip.startSeconds)
    : null;

  const duration = formatVideoTimestamp(clipDurationSeconds(clip));
  const timeRange = `${formatVideoTimestamp(clip.startSeconds)}–${formatVideoTimestamp(clip.endSeconds)}`;
  const sessionDate =
    clip.sessionScheduledAt !== null
      ? formatDisplayDate(clip.sessionScheduledAt)
      : null;

  const card = (
    <article className="overflow-hidden rounded-xl bg-card shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden bg-[#01255f]">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <>
            <Film
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 text-white/[0.08]"
              strokeWidth={1.25}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#01255f]/90 to-[#01255f]/40"
            />
          </>
        )}

        <div className="absolute inset-0 bg-black/0 transition-colors group-hover/card:bg-black/20" />

        <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#01255f] opacity-0 shadow-lg transition-opacity group-hover/card:opacity-100">
          <Play className="size-5 fill-current" />
        </span>

        <span className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold tabular-nums text-primary-foreground shadow-sm">
          {index + 1}
        </span>

        <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 font-mono text-xs tabular-nums text-white">
          {duration}
        </span>
      </div>

      <div className="space-y-1.5 p-4">
        <p className="font-heading text-base font-semibold uppercase tracking-wide">
          {clip.title}
        </p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {timeRange}
        </p>
        {clip.teamName && sessionDate ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 shrink-0 text-primary" />
              {clip.teamName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3 shrink-0" />
              {sessionDate}
            </span>
          </p>
        ) : null}
        {clip.notes ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {clip.notes}
          </p>
        ) : null}
      </div>
    </article>
  );

  return (
    <li className="group/card relative h-full">
      {href ? (
        <Link href={href} className="block h-full">
          {card}
        </Link>
      ) : (
        <div className="block h-full">{card}</div>
      )}
      {canManage ? (
        <RemoveClipOverlay
          slug={slug}
          playlistId={playlistId}
          clipId={clip.clipId}
        />
      ) : null}
    </li>
  );
}
