"use client";

import type { EventReviewStatus, EventType } from "@/types/database";
import { eventTypeLabelByValue } from "@/lib/validation/event";
import { timelineColorForEventType } from "@/lib/video/event-timeline-colors";
import { formatVideoTimestamp } from "@/lib/video/timestamp";
import { cn } from "@/lib/utils";

export type TimelineEvent = {
  id: string;
  type: EventType;
  timestampSeconds: number;
  reviewStatus: EventReviewStatus;
};

type EventTimelineProps = {
  events: TimelineEvent[];
  durationSeconds: number;
  currentTimeSeconds: number;
  activeEventId?: string | null;
  onSeek: (seconds: number) => void;
  onEventClick?: (event: TimelineEvent) => void;
};

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export function EventTimeline({
  events,
  durationSeconds,
  currentTimeSeconds,
  activeEventId,
  onSeek,
  onEventClick,
}: EventTimelineProps) {
  const safeDuration = durationSeconds > 0 ? durationSeconds : 0;
  const playheadRatio =
    safeDuration > 0 ? clampRatio(currentTimeSeconds / safeDuration) : 0;

  function seekFromClientX(clientX: number, target: HTMLDivElement) {
    if (safeDuration <= 0) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const ratio = clampRatio((clientX - rect.left) / rect.width);
    onSeek(Math.floor(ratio * safeDuration));
  }

  function handleTrackClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }
    seekFromClientX(event.clientX, event.currentTarget);
  }

  return (
    <div className="space-y-2 rounded-lg bg-black/80 px-3 py-3 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-white/70">
        <span>{formatVideoTimestamp(Math.floor(currentTimeSeconds))}</span>
        <span className="text-white/50">
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
        <span>
          {safeDuration > 0
            ? formatVideoTimestamp(Math.floor(safeDuration))
            : "--:--"}
        </span>
      </div>

      <div
        role="slider"
        aria-label="Video timeline"
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={Math.floor(currentTimeSeconds)}
        tabIndex={0}
        className="relative h-8 cursor-pointer rounded-md bg-white/10"
        onClick={handleTrackClick}
        onKeyDown={(event) => {
          if (safeDuration <= 0) {
            return;
          }
          const step = event.shiftKey ? 10 : 1;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(Math.min(safeDuration, currentTimeSeconds + step));
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(Math.max(0, currentTimeSeconds - step));
          }
        }}
      >
        {/* Progress fill */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-white/15"
          style={{ width: `${playheadRatio * 100}%` }}
        />

        {/* Event markers */}
        {safeDuration > 0 &&
          events.map((item) => {
            const left = clampRatio(item.timestampSeconds / safeDuration) * 100;
            const label = eventTypeLabelByValue.get(item.type) ?? item.type;
            const isActive = activeEventId === item.id;
            const isSuggested = item.reviewStatus === "suggested";

            return (
              <button
                key={item.id}
                type="button"
                title={`${label} · ${formatVideoTimestamp(item.timestampSeconds)}`}
                aria-label={`${label} at ${formatVideoTimestamp(item.timestampSeconds)}`}
                className={cn(
                  "absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black/40 transition-transform hover:scale-125 focus:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  timelineColorForEventType(item.type),
                  isSuggested && "ring-amber-300",
                  isActive && "scale-125 ring-2 ring-white",
                )}
                style={{ left: `${left}%` }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSeek(item.timestampSeconds);
                  onEventClick?.(item);
                }}
              />
            );
          })}

        {/* Playhead */}
        {safeDuration > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            style={{ left: `${playheadRatio * 100}%` }}
          />
        )}
      </div>

      {events.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/60">
          {events.slice(0, 6).map((item) => (
            <li key={`legend-${item.id}`} className="inline-flex items-center gap-1">
              <span
                className={cn(
                  "size-2 rounded-full",
                  timelineColorForEventType(item.type),
                )}
              />
              <span>
                {eventTypeLabelByValue.get(item.type) ?? item.type}{" "}
                <span className="font-mono tabular-nums text-white/40">
                  {formatVideoTimestamp(item.timestampSeconds)}
                </span>
              </span>
            </li>
          ))}
          {events.length > 6 && (
            <li className="text-white/40">+{events.length - 6} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
