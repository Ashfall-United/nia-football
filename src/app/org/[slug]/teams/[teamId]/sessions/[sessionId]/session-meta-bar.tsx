import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  MapPin,
  Trophy,
  Trees,
} from "lucide-react";
import type { Session } from "@/domain/sessions/types";
import { pitchSurfaceOptions } from "@/lib/validation/session";
import { cn } from "@/lib/utils";

const pitchSurfaceLabelByValue = new Map(
  pitchSurfaceOptions.map((o) => [o.value, o.label]),
);

function MetaChip({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-primary" />
      {children}
    </span>
  );
}

export function SessionMetaBar({ session }: { session: Session }) {
  const scheduled = new Date(session.scheduledAt);
  const dateTimeLabel = scheduled.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const pitchLabel = session.pitchSurface
    ? (pitchSurfaceLabelByValue.get(session.pitchSurface) ??
      session.pitchSurface)
    : null;
  const hasScore =
    session.type === "match" &&
    session.teamScore !== null &&
    session.opponentScore !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <MetaChip icon={CalendarDays}>{dateTimeLabel}</MetaChip>
        {session.location && (
          <MetaChip icon={MapPin}>{session.location}</MetaChip>
        )}
        {pitchLabel && <MetaChip icon={Trees}>{pitchLabel}</MetaChip>}
        {session.type === "match" && session.competition && (
          <MetaChip icon={Trophy}>{session.competition}</MetaChip>
        )}
        {session.type === "match" && session.isHome !== null && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            {session.isHome ? "Home" : "Away"}
          </span>
        )}
        {hasScore && (
          <span className="inline-flex items-center rounded-full bg-[#f5c400]/15 px-3 py-1.5 font-heading text-sm font-bold tabular-nums tracking-wide text-[#01255f]">
            {session.teamScore}–{session.opponentScore}
          </span>
        )}
      </div>

      {session.notes && (
        <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3">
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {session.notes}
          </p>
        </div>
      )}
    </div>
  );
}
