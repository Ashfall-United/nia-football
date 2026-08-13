import { z } from "zod";
import type { EventType } from "@/types/database";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

type EventTypeOption = { value: EventType; label: string };
type EventTypeGroup = { label: string; options: EventTypeOption[] };

export const eventTypeGroups: EventTypeGroup[] = [
  {
    label: "Attacking",
    options: [
      { value: "build_up", label: "Build-up" },
      { value: "progression", label: "Progression" },
      { value: "chance_creation", label: "Chance creation" },
      { value: "shot", label: "Shot" },
      { value: "goal", label: "Goal" },
      { value: "cross", label: "Cross" },
      { value: "third_man_action", label: "Third-man action" },
      { value: "half_space_reception", label: "Half-space reception" },
      { value: "rotation", label: "Rotation" },
      { value: "space_creation", label: "Space creation" },
      { value: "space_exploitation", label: "Space exploitation" },
    ],
  },
  {
    label: "Defending",
    options: [
      { value: "press", label: "Press" },
      { value: "pressing_pair", label: "Pressing pair" },
      { value: "counterpress", label: "Counterpress" },
      { value: "recovery", label: "Recovery" },
      { value: "interception", label: "Interception" },
      { value: "defensive_transition", label: "Defensive transition" },
      { value: "block", label: "Block" },
    ],
  },
  {
    label: "General",
    options: [
      { value: "foul", label: "Foul" },
      { value: "corner", label: "Corner" },
      { value: "free_kick", label: "Free kick" },
      { value: "throw_in", label: "Throw-in" },
      { value: "substitution", label: "Substitution" },
      { value: "injury", label: "Injury" },
      { value: "pause", label: "Pause" },
    ],
  },
];

export const eventTypeOptions: EventTypeOption[] = eventTypeGroups.flatMap(
  (group) => group.options,
);

const eventTypeValues = eventTypeOptions.map((option) => option.value) as [
  EventType,
  ...EventType[],
];

export const eventTypeLabelByValue = new Map(
  eventTypeOptions.map((option) => [option.value, option.label]),
);

/** Common events for one-tap tagging while reviewing footage. */
export const quickEventTypes = [
  "goal",
  "shot",
  "chance_creation",
  "press",
  "counterpress",
  "foul",
  "corner",
  "substitution",
] as const satisfies readonly EventType[];

// Confirmed events of these types are the classic "highlight reel"
// moments — the ones worth surfacing as one-click clip candidates.
// Deliberately small: broadening this list is a product decision, not a
// technical one.
export const highlightEventTypes = [
  "goal",
  "shot",
  "chance_creation",
] as const satisfies readonly EventType[];

export const createEventSchema = z.object({
  type: z.enum(eventTypeValues, { error: "Select an event type." }),
  timestampSeconds: z.coerce
    .number({ error: "Enter a timestamp." })
    .int()
    .min(0, { error: "Timestamp can't be negative." }),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
  playerIds: z.array(z.string()).optional().default([]),
});

export const updateEventSchema = createEventSchema;

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventReviewStatusOptions = [
  { value: "suggested", label: "Suggested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "edited", label: "Edited" },
  { value: "rejected", label: "Rejected" },
] as const;

export const eventReviewStatusLabelByValue = new Map(
  eventReviewStatusOptions.map((option) => [option.value, option.label]),
);
