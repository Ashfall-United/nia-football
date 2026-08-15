import type { EventType } from "@/types/database";

/** Tailwind background classes for timeline markers by event type. */
export const eventTypeTimelineColor: Record<EventType, string> = {
  build_up: "bg-sky-500",
  progression: "bg-sky-600",
  pass: "bg-sky-400",
  chance_creation: "bg-amber-500",
  shot: "bg-red-500",
  goal: "bg-[#f5c400]",
  volley: "bg-orange-500",
  cross: "bg-blue-500",
  third_man_action: "bg-indigo-500",
  half_space_reception: "bg-indigo-400",
  rotation: "bg-teal-500",
  space_creation: "bg-cyan-500",
  space_exploitation: "bg-cyan-600",
  press: "bg-rose-500",
  pressing_pair: "bg-rose-600",
  counterpress: "bg-rose-400",
  recovery: "bg-emerald-500",
  interception: "bg-emerald-600",
  defensive_transition: "bg-lime-600",
  tackle: "bg-orange-600",
  block: "bg-violet-500",
  foul: "bg-zinc-500",
  corner: "bg-zinc-400",
  free_kick: "bg-zinc-400",
  throw_in: "bg-zinc-400",
  substitution: "bg-zinc-500",
  injury: "bg-zinc-600",
  pause: "bg-zinc-400",
};

export function timelineColorForEventType(type: EventType): string {
  return eventTypeTimelineColor[type] ?? "bg-primary";
}
