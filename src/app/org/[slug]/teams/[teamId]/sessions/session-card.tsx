import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Dumbbell,
  MapPin,
  Trophy,
  Video,
} from "lucide-react";
import type { Session } from "@/domain/sessions/types";
import { cn } from "@/lib/utils";

function FootageBadge({ readyVideos }: { readyVideos: number }) {
  if (readyVideos > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/30">
        <Video className="size-3" />
        {readyVideos === 1 ? "1 recording" : `${readyVideos} recordings`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/60 ring-1 ring-white/10">
      No footage yet
    </span>
  );
}

function SessionWatermark({ type }: { type: Session["type"] }) {
  const Icon = type === "match" ? Trophy : Dumbbell;
  return (
    <>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-[55%] text-white/[0.07] transition-transform duration-300 group-hover/card:scale-110"
        strokeWidth={1.25}
      />
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -bottom-6 size-28 text-white/[0.04]"
        strokeWidth={1}
      />
    </>
  );
}

export function SessionCard({
  session,
  slug,
  teamId,
  readyVideos,
  actions,
}: {
  session: Session;
  slug: string;
  teamId: string;
  readyVideos: number;
  actions?: ReactNode;
}) {
  const scheduled = new Date(session.scheduledAt);
  const dateLabel = scheduled.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const yearLabel = scheduled.getFullYear();
  const timeLabel = scheduled.toLocaleTimeString(undefined, {
    timeStyle: "short",
  });
  const isMatch = session.type === "match";
  const title = isMatch ? `vs ${session.opponentName}` : "Training";
  const hasScore =
    isMatch &&
    session.teamScore !== null &&
    session.opponentScore !== null;
  const TypeIcon = isMatch ? Trophy : Dumbbell;

  return (
    <div className="group/card relative h-full">
      {actions}
      <Link
        href={`/org/${slug}/teams/${teamId}/sessions/${session.id}`}
        className="block h-full"
      >
        <article
          className={cn(
            "relative flex aspect-[4/3] flex-col overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 transition-shadow hover:shadow-lg",
            isMatch ? "bg-[#011a45]" : "bg-[#01255f]",
          )}
        >
        <SessionWatermark type={session.type} />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/80 to-[#01255f]/25"
        />

        <div className="relative flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
              <TypeIcon className="size-4 text-[#f5c400]" />
            </span>
            <FootageBadge readyVideos={readyVideos} />
          </div>

          <div className="mt-auto space-y-3">
            {hasScore && (
              <p className="font-heading text-3xl font-bold tabular-nums tracking-tight text-[#f5c400]">
                {session.teamScore}
                <span className="mx-1.5 text-lg text-white/40">–</span>
                {session.opponentScore}
              </p>
            )}

            <div>
              <div className="flex items-baseline gap-2">
                <p className="font-heading text-2xl font-semibold uppercase tracking-wide text-white">
                  {dateLabel}
                </p>
                <p className="text-sm text-white/40">{yearLabel}</p>
              </div>
              <p className="font-heading text-lg font-semibold uppercase tracking-wide text-white/90">
                {title}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/50">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3 shrink-0" />
                  {timeLabel}
                </span>
                {session.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3 shrink-0" />
                    {session.location}
                  </span>
                )}
                {isMatch && session.competition && (
                  <span>{session.competition}</span>
                )}
                {isMatch && session.isHome !== null && (
                  <span>{session.isHome ? "Home" : "Away"}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </article>
      </Link>
    </div>
  );
}

export function SessionCardGrid({
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
