import type { ReactNode } from "react";
import Link from "next/link";
import { Film, Play, Video } from "lucide-react";
import type { Clip } from "@/domain/clips/types";
import type { Video as SessionVideo } from "@/domain/videos/types";
import type { VideoStatus } from "@/types/database";
import { cn } from "@/lib/utils";

export type FootageClipSummary = Pick<
  Clip,
  "id" | "title" | "startSeconds" | "endSeconds"
>;

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

function clipLengthSeconds(clip: FootageClipSummary): number {
  return Math.max(0, clip.endSeconds - clip.startSeconds);
}

function FootageStatusBadge({ status }: { status: VideoStatus }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
        <span className="size-1.5 rounded-full bg-white" />
        Ready
      </span>
    );
  }

  if (status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
        Uploading
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
      Failed
    </span>
  );
}

export function FootageCard({
  video,
  cameraName,
  thumbnailUrl,
  href,
  clips = [],
  actions,
}: {
  video: SessionVideo;
  cameraName: string;
  thumbnailUrl: string | null;
  href: string;
  clips?: FootageClipSummary[];
  actions?: ReactNode;
}) {
  const duration = formatDuration(video.durationSeconds);
  const isReady = video.status === "ready";
  const recordedAt = new Date(video.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="group/card relative h-full">
      {actions}
      <Link href={href} className="block h-full">
      <article className="overflow-hidden rounded-xl bg-card shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden bg-[#01255f]">
          {thumbnailUrl && isReady ? (
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

          {isReady && (
            <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#01255f] opacity-0 shadow-lg transition-opacity group-hover/card:opacity-100">
              <Play className="size-5 fill-current" />
            </span>
          )}

          <div className="absolute top-2 right-2">
            <FootageStatusBadge status={video.status} />
          </div>

          {duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 font-mono text-xs tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>

        <div className="space-y-2 p-4">
          <div>
            <p className="font-heading text-base font-semibold uppercase tracking-wide">
              {cameraName}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {duration && (
                <span className="font-mono tabular-nums text-foreground">
                  {duration} recording
                </span>
              )}
              {duration && <span aria-hidden="true">·</span>}
              <span>{recordedAt}</span>
            </p>
          </div>

          {clips.length > 0 && (
            <ul className="space-y-1 border-t border-border pt-2">
              {clips.map((clip) => (
                <li
                  key={clip.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <Film className="size-3 shrink-0 text-primary" />
                    <span className="truncate">{clip.title}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-foreground">
                    {formatTimestamp(clip.startSeconds)}–
                    {formatTimestamp(clip.endSeconds)}
                    <span className="ml-1.5 text-muted-foreground">
                      ({formatTimestamp(clipLengthSeconds(clip))})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
      </Link>
    </div>
  );
}

export function FootageCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </ul>
  );
}

export function sortFootageVideos<T extends SessionVideo>(videos: T[]): T[] {
  const rank: Record<VideoStatus, number> = {
    ready: 0,
    uploading: 1,
    error: 2,
  };

  return [...videos].sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) {
      return byStatus;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
