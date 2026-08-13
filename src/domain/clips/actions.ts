"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { createClient } from "@/services/supabase/server";
import {
  createClipSchema,
  createFullRecordingClipSchema,
} from "@/lib/validation/clip";
import {
  eventTypeLabelByValue,
  highlightEventTypes,
} from "@/lib/validation/event";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { getEventForOrganisation } from "@/domain/events/queries";
import { resolveVideoDurationSeconds } from "@/services/cloudflare/video-duration";
import { formatVideoTimestamp } from "@/lib/video/timestamp";

export type CreateClipActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export async function createClipAction(
  slug: string,
  videoId: string,
  _prevState: CreateClipActionState,
  formData: FormData,
): Promise<CreateClipActionState> {
  const user = await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const validated = createClipSchema.safeParse({
    title: formData.get("title"),
    startSeconds: formData.get("startSeconds"),
    endSeconds: formData.get("endSeconds"),
    notes: formData.get("notes"),
  });

  let clipInput = validated.success ? validated.data : null;

  if (!validated.success) {
    const fullRecording = formData.get("fullRecording") === "true";
    const titleOnly = createFullRecordingClipSchema.safeParse({
      title: formData.get("title"),
    });

    if (!fullRecording || !titleOnly.success) {
      return { fieldErrors: validated.error.flatten().fieldErrors };
    }

    const video = await getVideoForOrganisation(membership.id, videoId);
    if (!video) {
      return { error: "This recording could not be found." };
    }
    if (video.durationSeconds === null || video.durationSeconds <= 0) {
      const resolvedDuration = await resolveVideoDurationSeconds(video);
      if (resolvedDuration === null || resolvedDuration <= 0) {
        return {
          error:
            "This recording doesn't have a duration yet. Use Highlight with manual start and end times instead.",
        };
      }

      clipInput = {
        title: titleOnly.data.title,
        startSeconds: 0,
        endSeconds: resolvedDuration,
        notes: undefined,
      };
    } else {
      clipInput = {
        title: titleOnly.data.title,
        startSeconds: 0,
        endSeconds: video.durationSeconds,
        notes: undefined,
      };
    }
  }

  if (!clipInput) {
    return { error: "We couldn't create this clip. Try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clips").insert({
    organisation_id: membership.id,
    video_id: videoId,
    title: clipInput.title,
    start_seconds: clipInput.startSeconds,
    end_seconds: clipInput.endSeconds,
    notes: clipInput.notes ?? null,
    created_by: user.id,
  });

  if (error) {
    console.error("[clips] Failed to create clip:", error);
    return { error: "We couldn't create this clip. Try again." };
  }

  revalidatePath(`/org/${slug}`);
  revalidatePath(`/org/${slug}/clips`);
}

export type CreateHighlightClipActionState =
  | {
      error?: string;
      clipId?: string;
      alreadyExists?: boolean;
    }
  | undefined;

// Highlight-worthy footage is a packaged confirmed event, not a new
// analysis concept — this materializes a confirmed goal/shot/chance
// creation event into a real, shareable clip with a window around its
// timestamp. It's an explicit one-click action rather than automatic on
// confirm, since clips are curated/shareable artifacts and confirming an
// event's accuracy isn't the same as deciding it belongs in the library.
const HIGHLIGHT_PRE_ROLL_SECONDS = 8;
const HIGHLIGHT_POST_ROLL_SECONDS = 4;

export async function createHighlightClipAction(
  slug: string,
  videoId: string,
  eventId: string,
): Promise<CreateHighlightClipActionState> {
  const user = await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const event = await getEventForOrganisation(membership.id, eventId);
  if (!event || event.videoId !== videoId) {
    return { error: "We couldn't find this event." };
  }

  if (event.reviewStatus !== "confirmed") {
    return { error: "Only confirmed events can become highlight clips." };
  }

  if (!(highlightEventTypes as readonly string[]).includes(event.type)) {
    return { error: "This event type isn't eligible for a highlight clip." };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("clips")
    .select("id")
    .eq("organisation_id", membership.id)
    .eq("source_event_id", eventId)
    .maybeSingle();

  if (existingError) {
    console.error(
      "[clips] Failed to check for an existing highlight clip:",
      existingError,
    );
    return { error: "We couldn't create this clip. Try again." };
  }

  if (existing) {
    return { clipId: existing.id, alreadyExists: true };
  }

  const video = await getVideoForOrganisation(membership.id, videoId);
  if (!video) {
    return { error: "We couldn't find this video." };
  }
  const durationSeconds = await resolveVideoDurationSeconds(video);

  const startSeconds = Math.max(
    0,
    event.timestampSeconds - HIGHLIGHT_PRE_ROLL_SECONDS,
  );
  const uncappedEndSeconds =
    event.timestampSeconds + HIGHLIGHT_POST_ROLL_SECONDS;
  const endSeconds =
    durationSeconds !== null
      ? Math.min(uncappedEndSeconds, durationSeconds)
      : uncappedEndSeconds;

  const title = `${eventTypeLabelByValue.get(event.type) ?? event.type} — ${formatVideoTimestamp(event.timestampSeconds)}`;

  const { data: clip, error } = await supabase
    .from("clips")
    .insert({
      organisation_id: membership.id,
      video_id: videoId,
      title,
      start_seconds: startSeconds,
      end_seconds: Math.max(endSeconds, startSeconds + 1),
      source_event_id: eventId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !clip) {
    console.error("[clips] Failed to create highlight clip:", error);
    return { error: "We couldn't create this clip. Try again." };
  }

  revalidatePath(`/org/${slug}`);
  revalidatePath(`/org/${slug}/clips`);
  return { clipId: clip.id };
}
