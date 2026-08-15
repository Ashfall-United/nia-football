"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { createClient } from "@/services/supabase/server";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { listPlayersForTeam } from "@/domain/players/queries";
import { R2Service, R2NotConfiguredError } from "@/services/r2/client";
import { createEventSchema, updateEventSchema, eventTypeLabelByValue } from "@/lib/validation/event";
import { resolveStreamMlVideoUrl } from "@/services/cloudflare/playback";
import { CloudflareApiError } from "@/services/cloudflare/client";
import {
  assertMlServiceReady,
  mapMlErrorToMessage,
  requestVideoDetections,
} from "@/services/ml/client";
import { listEventsForVideo, getEventForOrganisation } from "./queries";

export type CreateEventActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export type UpdateEventActionState = CreateEventActionState;

export type DeleteEventActionState =
  | {
      error?: string;
    }
  | undefined;

function mapEventPersistenceError(
  error: { code?: string; message?: string } | null,
  action: "create" | "update",
): string {
  if (
    error?.code === "22P02" &&
    error.message?.includes("event_type")
  ) {
    return "Pass, tackle, and volley need the latest database migration. Run supabase db push or apply migration 20260815110000_event_type_pass_tackle_volley.sql in Supabase.";
  }

  return action === "create"
    ? "We couldn't add this event. Try again."
    : "We couldn't update this event. Try again.";
}

export async function createEventAction(
  slug: string,
  videoId: string,
  _prevState: CreateEventActionState,
  formData: FormData,
): Promise<CreateEventActionState> {
  const user = await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const validated = createEventSchema.safeParse({
    type: formData.get("type"),
    timestampSeconds: formData.get("timestampSeconds"),
    notes: formData.get("notes"),
    playerIds: formData.getAll("playerIds"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organisation_id: membership.id,
      video_id: videoId,
      type: validated.data.type,
      timestamp_seconds: validated.data.timestampSeconds,
      notes: validated.data.notes ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("[events] Failed to create event:", error);
    return { error: mapEventPersistenceError(error, "create") };
  }

  try {
    await syncEventPlayers(supabase, event.id, validated.data.playerIds);
  } catch (syncError) {
    return {
      error:
        syncError instanceof Error
          ? syncError.message
          : "We couldn't tag players for this event.",
    };
  }

  revalidatePath(`/org/${slug}`);
}

async function syncEventPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  playerIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("event_players")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    console.error("[events] Failed to clear event players:", deleteError);
    throw new Error("We couldn't update player tags.");
  }

  if (playerIds.length === 0) return;

  const { error: insertError } = await supabase.from("event_players").insert(
    playerIds.map((playerId) => ({
      event_id: eventId,
      player_id: playerId,
    })),
  );

  if (insertError) {
    console.error("[events] Failed to tag players:", insertError);
    throw new Error("We couldn't update player tags.");
  }
}

export async function updateEventAction(
  slug: string,
  eventId: string,
  _prevState: UpdateEventActionState,
  formData: FormData,
): Promise<UpdateEventActionState> {
  await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const validated = updateEventSchema.safeParse({
    type: formData.get("type"),
    timestampSeconds: formData.get("timestampSeconds"),
    notes: formData.get("notes"),
    playerIds: formData.getAll("playerIds"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("events")
    .select("id, video_id")
    .eq("id", eventId)
    .eq("organisation_id", membership.id)
    .maybeSingle();

  if (loadError || !existing) {
    return { error: "We couldn't find this event." };
  }

  const { error } = await supabase
    .from("events")
    .update({
      type: validated.data.type,
      timestamp_seconds: validated.data.timestampSeconds,
      notes: validated.data.notes ?? null,
      review_status: "edited",
    })
    .eq("id", eventId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[events] Failed to update event:", error);
    return { error: mapEventPersistenceError(error, "update") };
  }

  try {
    await syncEventPlayers(supabase, eventId, validated.data.playerIds);
  } catch (syncError) {
    return {
      error:
        syncError instanceof Error
          ? syncError.message
          : "We couldn't update player tags.",
    };
  }

  revalidatePath(`/org/${slug}`);
}

export async function deleteEventAction(
  slug: string,
  eventId: string,
): Promise<DeleteEventActionState> {
  await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[events] Failed to delete event:", error);
    return { error: "We couldn't delete this event. Try again." };
  }

  revalidatePath(`/org/${slug}`);
}

export async function saveEventAction(
  slug: string,
  videoId: string,
  prevState: CreateEventActionState,
  formData: FormData,
): Promise<CreateEventActionState> {
  const eventId = formData.get("eventId");
  if (typeof eventId === "string" && eventId.length > 0) {
    return updateEventAction(slug, eventId, prevState, formData);
  }
  return createEventAction(slug, videoId, prevState, formData);
}

export type ExportEventsActionState =
  | {
      error?: string;
      url?: string;
    }
  | undefined;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

// Generates a CSV of this video's events on demand and stores it in R2 —
// the durable-export use case Claude.md calls out explicitly, and one we
// can build without needing FFmpeg or the ML service.
export async function exportEventsCsvAction(
  slug: string,
  videoId: string,
  _prevState: ExportEventsActionState,
  _formData: FormData,
): Promise<ExportEventsActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const video = await getVideoForOrganisation(membership.id, videoId);
  if (!video) {
    return { error: "We couldn't find this video." };
  }

  const session = await getSessionForOrganisation(
    membership.id,
    video.sessionId,
  );
  if (!session) {
    return { error: "We couldn't find this session." };
  }

  const [players, events] = await Promise.all([
    listPlayersForTeam(membership.id, session.teamId),
    listEventsForVideo(membership.id, videoId),
  ]);

  if (events.length === 0) {
    return { error: "There are no events to export yet." };
  }

  const playerNameById = new Map(
    players.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
  );

  const rows = [
    ["Timestamp", "Event", "Players", "Notes"],
    ...events.map((event) => [
      formatTimestamp(event.timestampSeconds),
      eventTypeLabelByValue.get(event.type) ?? event.type,
      event.playerIds
        .map((id) => playerNameById.get(id) ?? "Unknown")
        .join("; "),
      event.notes ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  const key = `exports/${membership.id}/${videoId}/events-${Date.now()}.csv`;

  try {
    await R2Service.uploadObject(key, csv, "text/csv");
    const url = await R2Service.getSignedDownloadUrl(key);
    return { url };
  } catch (r2Error) {
    console.error("[events] Failed to export events to R2:", r2Error);
    const message =
      r2Error instanceof R2NotConfiguredError
        ? "Export isn't connected yet. Check the Cloudflare R2 configuration."
        : "We couldn't export events. Try again.";
    return { error: message };
  }
}

export type ConfirmEventActionState =
  | {
      error?: string;
    }
  | undefined;

export async function confirmEventAction(
  slug: string,
  eventId: string,
): Promise<ConfirmEventActionState> {
  await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const event = await getEventForOrganisation(membership.id, eventId);
  if (!event) {
    return { error: "We couldn't find this event." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ review_status: "confirmed" })
    .eq("id", eventId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[events] Failed to confirm event:", error);
    return { error: "We couldn't confirm this event. Try again." };
  }

  revalidatePath(`/org/${slug}`);
}

export type RejectEventActionState = ConfirmEventActionState;

export async function rejectEventAction(
  slug: string,
  eventId: string,
): Promise<RejectEventActionState> {
  await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const event = await getEventForOrganisation(membership.id, eventId);
  if (!event) {
    return { error: "We couldn't find this event." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ review_status: "rejected" })
    .eq("id", eventId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[events] Failed to reject event:", error);
    return { error: "We couldn't reject this event. Try again." };
  }

  revalidatePath(`/org/${slug}`);
}

export type RunBallDetectionSuggestionsActionState =
  | {
      error?: string;
      created?: number;
      skipped?: boolean;
    }
  | undefined;

const BALL_CONFIDENCE_THRESHOLD = 0.6;
const SHOT_DEDUPE_WINDOW_SECONDS = 10;

function isSportsBallDetection(className: string): boolean {
  const normalized = className.trim().toLowerCase();
  return normalized === "sports ball" || normalized === "ball";
}

export async function runBallDetectionSuggestionsAction(
  slug: string,
  videoId: string,
): Promise<RunBallDetectionSuggestionsActionState> {
  const user = await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const video = await getVideoForOrganisation(membership.id, videoId);
  if (!video) {
    return { error: "We couldn't find this video." };
  }

  if (video.status !== "ready") {
    return {
      error: "This recording is still processing. Try again in a moment.",
    };
  }

  let videoUrl: string;
  try {
    videoUrl = await resolveStreamMlVideoUrl(video.cloudflareStreamUid);
  } catch (cloudflareError) {
    console.error("[events] Failed to resolve ML video URL:", cloudflareError);
    if (
      cloudflareError instanceof CloudflareApiError &&
      cloudflareError.status === 404
    ) {
      return {
        error:
          "This recording is no longer available in Stream. Re-upload the footage and try again.",
      };
    }
    return {
      error:
        "We couldn't prepare this recording for analysis. Try again shortly.",
    };
  }

  let frames;
  try {
    await assertMlServiceReady();
    frames = await requestVideoDetections({ videoUrl });
  } catch (error) {
    console.error("[events] Ball detection failed:", error);
    return { error: mapMlErrorToMessage(error) };
  }

  const existingEvents = await listEventsForVideo(membership.id, videoId);
  const candidateTimestamps = frames
    .filter((frame) =>
      frame.detections.some(
        (detection) =>
          isSportsBallDetection(detection.class_name) &&
          detection.confidence >= BALL_CONFIDENCE_THRESHOLD,
      ),
    )
    .map((frame) => Math.floor(frame.timestamp_seconds))
    .filter((timestamp, index, all) => all.indexOf(timestamp) === index)
    .sort((a, b) => a - b);

  const timestampsToInsert: number[] = [];
  for (const timestamp of candidateTimestamps) {
    const hasNearbyEvent = existingEvents.some(
      (event) =>
        Math.abs(event.timestampSeconds - timestamp) <=
        SHOT_DEDUPE_WINDOW_SECONDS,
    );
    const hasNearbyCandidate = timestampsToInsert.some(
      (candidate) =>
        Math.abs(candidate - timestamp) <= SHOT_DEDUPE_WINDOW_SECONDS,
    );
    if (!hasNearbyEvent && !hasNearbyCandidate) {
      timestampsToInsert.push(timestamp);
    }
  }

  if (timestampsToInsert.length === 0) {
    return { created: 0 };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(
    timestampsToInsert.map((timestampSeconds) => ({
      organisation_id: membership.id,
      video_id: videoId,
      type: "shot" as const,
      timestamp_seconds: timestampSeconds,
      review_status: "suggested" as const,
      notes: "Suggested by ball detection",
      created_by: user.id,
    })),
  );

  if (error) {
    console.error("[events] Failed to insert suggested events:", error);
    return {
      error:
        "We couldn't save suggested events. Check that the events table exists (run supabase db push).",
    };
  }

  revalidatePath(`/org/${slug}`);
  return { created: timestampsToInsert.length };
}
