"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Clock, Check, Trash2, X } from "lucide-react";
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
}: {
  slug: string;
  videoId: string;
  iframeSrc: string | null;
  initialSeekSeconds?: number | null;
  canAnalyze: boolean;
  players: PlayerOption[];
  events: VideoEvent[];
}) {
  const playerBridgeRef = useRef<{
    getCurrentTimestamp: () => number;
    seek: (seconds: number) => void;
  } | null>(null);
  const router = useRouter();

  const [liveTime, setLiveTime] = useState(0);
  const [tagFormExpanded, setTagFormExpanded] = useState(false);
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
  const editingEvent = isEditing
    ? events.find((event) => event.id === tagging.editingEventId)
    : null;
  const isEditingSuggested = editingEvent?.reviewStatus === "suggested";

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
      setTagFormExpanded(false);
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
    setTagFormExpanded(true);
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
            <div
              className={cn(
                "flex flex-wrap items-start justify-between gap-4",
                tagFormExpanded && "border-b border-border pb-4",
              )}
            >
              <div className="space-y-1">
                <h3 className="font-heading text-base font-semibold uppercase tracking-wide">
                  {isEditing ? "Edit event" : "Tag an event"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Watch the video, mark the moment, keep going.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {tagFormExpanded && isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => resetTagging()}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setTagFormExpanded((current) => !current)}
                >
                  {tagFormExpanded
                    ? "Hide tagging"
                    : isEditing
                      ? "Edit event"
                      : "Tag an event"}
                </Button>
              </div>
            </div>

            {tagFormExpanded && (
            <form
              action={formAction}
              onSubmit={handleSubmit}
              className="mt-5 space-y-5"
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

              {isEditingSuggested && (
                <p className="text-sm text-amber-700">
                  {eventReviewStatusLabelByValue.get("suggested")} — confirm or
                  reject this AI-detected moment.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                {isEditing && tagging.editingEventId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditingSuggested ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isReviewing}
                          onClick={() => handleReject(tagging.editingEventId!)}
                        >
                          <X className="size-3.5" />
                          Reject
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isReviewing}
                          onClick={() => handleConfirm(tagging.editingEventId!)}
                        >
                          <Check className="size-3.5" />
                          Confirm
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={() => handleDelete(tagging.editingEventId!)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  {pending
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Add event"}
                </Button>
              </div>
            </form>
            )}
          </section>
        )}

        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}

        {reviewError && (
          <p className="text-sm text-destructive">{reviewError}</p>
        )}
      </div>
    </div>
  );
}
