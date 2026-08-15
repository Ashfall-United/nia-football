"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Clock, Check, Pencil, Trash2, X } from "lucide-react";
import {
  saveEventAction,
  deleteEventAction,
  confirmEventAction,
  rejectEventAction,
  type CreateEventActionState,
} from "@/domain/events/actions";
import type { Event } from "@/domain/events/types";
import type { EventType } from "@/types/database";
import type { EventReviewStatus } from "@/types/database";
import {
  eventReviewStatusLabelByValue,
  eventTypeGroups,
  eventTypeLabelByValue,
  eventTypeOptions,
  quickEventTypes,
} from "@/lib/validation/event";
import {
  formatVideoTimestamp,
  parseVideoTimestampInput,
} from "@/lib/video/timestamp";
import { useActionSuccess } from "@/hooks/use-action-success";
import { InteractiveStreamPlayer } from "@/components/interactive-stream-player";
import {
  PlayerAvatar,
  PlayerMultiSelect,
  type PlayerOption,
} from "@/components/player-multi-select";
import { ExportEventsButton } from "./export-events-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type VideoEvent = Pick<
  Event,
  "id" | "type" | "timestampSeconds" | "notes" | "playerIds" | "reviewStatus"
>;

const initialCreateState: CreateEventActionState = undefined;

function emptyTaggingState(timestamp = "0:00") {
  return {
    eventType: "" as EventType | "",
    timestampInput: timestamp,
    selectedPlayerIds: new Set<string>(),
    notes: "",
    editingEventId: null as string | null,
  };
}

export function VideoAnalysisWorkspace({
  slug,
  videoId,
  iframeSrc,
  initialSeekSeconds,
  canAnalyze,
  players,
  events,
  playerNameById,
  playerPhotoById,
}: {
  slug: string;
  videoId: string;
  iframeSrc: string | null;
  initialSeekSeconds?: number | null;
  canAnalyze: boolean;
  players: PlayerOption[];
  events: VideoEvent[];
  playerNameById: Record<string, string>;
  playerPhotoById: Record<string, string | undefined>;
}) {
  const playerBridgeRef = useRef<{
    getCurrentTimestamp: () => number;
    seek: (seconds: number) => void;
  } | null>(null);
  const router = useRouter();

  const [liveTime, setLiveTime] = useState(0);
  const [tagging, setTagging] = useState(() => emptyTaggingState());
  const [clientError, setClientError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isReviewing, startReview] = useTransition();

  const boundSaveAction = saveEventAction.bind(null, slug, videoId);
  const [formState, formAction, pending] = useActionState(
    boundSaveAction,
    initialCreateState,
  );

  const isEditing = tagging.editingEventId !== null;

  const resetTagging = useCallback((timestamp?: number) => {
    const seconds =
      timestamp ?? playerBridgeRef.current?.getCurrentTimestamp() ?? liveTime;
    setTagging(emptyTaggingState(formatVideoTimestamp(seconds)));
    setClientError(null);
  }, [liveTime]);

  useActionSuccess(
    pending,
    Boolean(formState?.error || formState?.fieldErrors),
    () => {
      resetTagging();
      router.refresh();
    },
  );

  function useVideoTime() {
    const seconds = playerBridgeRef.current?.getCurrentTimestamp() ?? liveTime;
    setTagging((current) => ({
      ...current,
      timestampInput: formatVideoTimestamp(seconds),
    }));
    setClientError(null);
  }

  function startEdit(event: VideoEvent) {
    playerBridgeRef.current?.seek(event.timestampSeconds);
    setTagging({
      eventType: event.type,
      timestampInput: formatVideoTimestamp(event.timestampSeconds),
      selectedPlayerIds: new Set(event.playerIds),
      notes: event.notes ?? "",
      editingEventId: event.id,
    });
    setClientError(null);
  }

  function handleDelete(eventId: string) {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteEventAction(slug, eventId);
      if (result?.error) {
        setDeleteError(result.error);
        return;
      }
      if (tagging.editingEventId === eventId) {
        resetTagging();
      }
      router.refresh();
    });
  }

  function handleConfirm(eventId: string) {
    setReviewError(null);
    startReview(async () => {
      const result = await confirmEventAction(slug, eventId);
      if (result?.error) {
        setReviewError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReject(eventId: string) {
    setReviewError(null);
    startReview(async () => {
      const result = await rejectEventAction(slug, eventId);
      if (result?.error) {
        setReviewError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    setClientError(null);
    const parsed = parseVideoTimestampInput(tagging.timestampInput);
    if (parsed === null) {
      event.preventDefault();
      setClientError("Enter a valid time like 12:34.");
      return;
    }
    if (!tagging.eventType) {
      event.preventDefault();
      setClientError("Select an event type.");
      return;
    }
  }

  const parsedTimestamp = parseVideoTimestampInput(tagging.timestampInput);

  const sortedTimelineEvents = [...events].sort(
    (a, b) => a.timestampSeconds - b.timestampSeconds,
  );

  return (
    <div className="space-y-6">
      <InteractiveStreamPlayer
        iframeSrc={iframeSrc}
        initialSeekSeconds={initialSeekSeconds}
        onTimeUpdate={setLiveTime}
        playerBridgeRef={playerBridgeRef}
        timelineEvents={sortedTimelineEvents}
        activeTimelineEventId={tagging.editingEventId}
        onTimelineEventClick={(timelineEvent) => {
          const match = events.find((item) => item.id === timelineEvent.id);
          if (match) {
            startEdit(match);
          }
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Events
          </h2>
          {events.length > 0 && (
            <ExportEventsButton slug={slug} videoId={videoId} />
          )}
        </div>

        {canAnalyze && (
          <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <h3 className="font-heading text-base font-semibold uppercase tracking-wide">
                  {isEditing ? "Edit event" : "Tag an event"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Watch the video, mark the moment, keep going.
                </p>
              </div>
              {isEditing && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => resetTagging()}
                >
                  Cancel
                </Button>
              )}
            </div>

            <form
              action={formAction}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {tagging.editingEventId && (
                <input
                  type="hidden"
                  name="eventId"
                  value={tagging.editingEventId}
                />
              )}
              <input type="hidden" name="type" value={tagging.eventType} />
              <input
                type="hidden"
                name="timestampSeconds"
                value={parsedTimestamp ?? ""}
              />
              {Array.from(tagging.selectedPlayerIds).map((playerId) => (
                <input
                  key={playerId}
                  type="hidden"
                  name="playerIds"
                  value={playerId}
                />
              ))}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Quick tag</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickEventTypes.map((type) => {
                      const label = eventTypeLabelByValue.get(type) ?? type;
                      const isSelected = tagging.eventType === type;
                      return (
                        <Button
                          key={type}
                          type="button"
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() =>
                            setTagging((current) => ({
                              ...current,
                              eventType: type,
                            }))
                          }
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-type">Event type</Label>
                  <Select
                    value={tagging.eventType || undefined}
                    onValueChange={(value) =>
                      setTagging((current) => ({
                        ...current,
                        eventType: value as EventType,
                      }))
                    }
                    items={eventTypeOptions}
                  >
                    <SelectTrigger id="event-type" className="w-full">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypeGroups.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState?.fieldErrors?.type && (
                    <p className="text-sm text-destructive">
                      {formState.fieldErrors.type[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-timestamp">Video time</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="event-timestamp"
                      value={tagging.timestampInput}
                      onChange={(event) =>
                        setTagging((current) => ({
                          ...current,
                          timestampInput: event.target.value,
                        }))
                      }
                      placeholder="12:34"
                      className="min-w-0 flex-1 font-mono tabular-nums"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={useVideoTime}
                    >
                      <Clock className="size-3.5" />
                      Use {formatVideoTimestamp(liveTime)}
                    </Button>
                  </div>
                  {formState?.fieldErrors?.timestampSeconds && (
                    <p className="text-sm text-destructive">
                      {formState.fieldErrors.timestampSeconds[0]}
                    </p>
                  )}
                </div>
              </div>

              {players.length > 0 && (
                <div className="space-y-2">
                  <Label>Players involved</Label>
                  <PlayerMultiSelect
                    players={players}
                    selectedIds={tagging.selectedPlayerIds}
                    onChange={(selectedPlayerIds) =>
                      setTagging((current) => ({ ...current, selectedPlayerIds }))
                    }
                    disabled={pending}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="event-notes">Notes</Label>
                <Textarea
                  id="event-notes"
                  name="notes"
                  value={tagging.notes}
                  onChange={(event) =>
                    setTagging((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Optional context for this moment"
                />
              </div>

              {(clientError || formState?.error) && (
                <p className="text-sm text-destructive">
                  {clientError ?? formState?.error}
                </p>
              )}

              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit" disabled={pending}>
                  {pending
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Add event"}
                </Button>
              </div>
            </form>
          </section>
        )}

        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}

        {reviewError && (
          <p className="text-sm text-destructive">{reviewError}</p>
        )}

        {events.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm">
            {events.map((event) => {
              const label =
                eventTypeLabelByValue.get(event.type) ?? event.type;
              const isActive = tagging.editingEventId === event.id;

              return (
                <li key={event.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3.5 text-sm transition-colors sm:px-5",
                      isActive && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        playerBridgeRef.current?.seek(event.timestampSeconds)
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="font-medium">{label}</p>
                          {event.reviewStatus === "suggested" ? (
                            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              {eventReviewStatusLabelByValue.get("suggested")}
                            </span>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs tabular-nums text-primary">
                          {formatVideoTimestamp(event.timestampSeconds)}
                        </span>
                      </div>

                      {event.playerIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {event.playerIds.map((id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                            >
                              <PlayerAvatar
                                name={playerNameById[id] ?? "Unknown"}
                                photoUrl={playerPhotoById[id]}
                                size="sm"
                              />
                              {playerNameById[id] ?? "Unknown"}
                            </span>
                          ))}
                        </div>
                      )}

                      {event.notes && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {event.notes}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground/80">
                        Tap to jump to this moment
                      </p>
                    </button>

                    {canAnalyze && (
                      <div className="flex shrink-0 items-center gap-1">
                        {event.reviewStatus === "suggested" ? (
                          <>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Reject ${label}`}
                              disabled={isReviewing}
                              onClick={() => handleReject(event.id)}
                            >
                              <X className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Confirm ${label}`}
                              disabled={isReviewing}
                              onClick={() => handleConfirm(event.id)}
                            >
                              <Check className="size-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Edit ${label}`}
                              onClick={() => startEdit(event)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Delete ${label}`}
                              disabled={isDeleting}
                              onClick={() => handleDelete(event.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {canAnalyze
              ? "No events yet. Use the panel above while you watch to tag key moments."
              : "An owner, admin, coach, or analyst hasn't tagged any events yet."}
          </div>
        )}
      </div>
    </div>
  );
}
