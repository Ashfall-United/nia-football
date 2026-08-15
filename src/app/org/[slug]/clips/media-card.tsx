import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Film, Play, Users, Video } from "lucide-react";
import type { ClipWithContext } from "@/domain/clips/types";
import type { VideoWithContext } from "@/domain/videos/types";
import { formatDisplayDate } from "@/lib/format/date";
import { buildVideoPageHref } from "@/lib/video/routes";
import { cn } from "@/lib/utils";
import { ClipShareButton } from "./clip-share-button";

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) {
    return null;
  }
  return formatTimestamp(seconds);
}

function clipDurationSeconds(clip: Pick<ClipWithContext, "startSeconds" | "endSeconds">) {
  return Math.max(0, clip.endSeconds - clip.startSeconds);
}

function formatSessionDate(iso: string): string {
  return formatDisplayDate(iso);
}

export function ClipCard({
  clip,
  slug,
}: {
  clip: ClipWithContext;
  slug: string;
}) {
  const href = buildVideoPageHref(
    {
      slug,
      teamId: clip.teamId,
      sessionId: clip.sessionId,
      videoId: clip.videoId,
    },
    { startSeconds: clip.startSeconds },
  );
  const duration = formatTimestamp(clipDurationSeconds(clip));
  const sessionDate = formatSessionDate(clip.sessionScheduledAt);
  const createdDate = formatDisplayDate(clip.createdAt);

  return (
    <div className="group/card relative block h-full">
      <Link href={href} className="block h-full">
        <article className="relative flex aspect-[4/3] flex-col overflow-hidden rounded-xl bg-[#011a45] shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg">
        <Film
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-[55%] text-white/[0.07] transition-transform duration-300 group-hover/card:scale-110"
          strokeWidth={1.25}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#011a45] via-[#011a45]/80 to-[#011a45]/25"
        />

        <div className="relative flex flex-1 flex-col p-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <Film className="size-4 text-[#f5c400]" />
          </span>

          <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5c400]/20 px-2.5 py-1 text-xs font-semibold text-[#f5c400] ring-1 ring-[#f5c400]/30">
                Highlight
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs tabular-nums text-white/80 ring-1 ring-white/10">
                {formatTimestamp(clip.startSeconds)}–{formatTimestamp(clip.endSeconds)}
              </span>
            </div>

            <div>
              <p className="font-heading text-xl font-semibold uppercase tracking-wide text-white">
                {clip.title}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/50">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3 shrink-0" />
                  {clip.teamName}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3 shrink-0" />
                  {sessionDate}
                </span>
              </p>
              <p className="mt-1 text-xs text-white/40">
                {duration} clip · Saved {createdDate}
              </p>
            </div>
          </div>
        </div>
      </article>
      </Link>
      <ClipShareButton slug={slug} clipId={clip.id} />
    </div>
  );
}

export function RecordingCard({
  video,
  slug,
  thumbnailUrl,
}: {
  video: VideoWithContext;
  slug: string;
  thumbnailUrl: string | null;
}) {
  const href = `/org/${slug}/teams/${video.teamId}/sessions/${video.sessionId}/videos/${video.id}`;
  const duration = formatDuration(video.durationSeconds);
  const recordedDate = formatDisplayDate(video.createdAt);

  return (
    <Link href={href} className="group/card block h-full">
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
              <Video
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

          <span className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#01255f] shadow-sm">
            Recording
          </span>

          {duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 font-mono text-xs tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>

        <div className="space-y-1.5 p-4">
          <p className="font-heading text-base font-semibold uppercase tracking-wide">
            {video.cameraName}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 shrink-0 text-primary" />
              {video.teamName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{recordedDate}</span>
            {duration && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-foreground">
                  {duration}
                </span>
              </>
            )}
          </p>
        </div>
      </article>
    </Link>
  );
}

export function MediaCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </ul>
  );
}
