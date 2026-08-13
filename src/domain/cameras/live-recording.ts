import "server-only";
import { createAdminClient } from "@/services/supabase/admin";

export type IngestLiveRecordingResult =
  | { status: "ingested"; videoId: string }
  | { status: "skipped"; reason: string };

// Called by the Cloudflare Stream webhook once a live input's automatic
// recording is ready to stream. Files it under whichever session the
// camera was marked "live for" (see setCameraActiveSessionAction) — if
// none was set, there's nowhere honest to file it, so this skips rather
// than guessing a session. Uses the admin client: a webhook has no user
// session, so RLS can't authorize it — the verified webhook signature is
// the authorization here instead.
export async function ingestLiveRecording(options: {
  liveInputUid: string;
  recordingUid: string;
  durationSeconds: number | null;
}): Promise<IngestLiveRecordingResult> {
  const supabase = createAdminClient();

  const { data: camera, error: cameraError } = await supabase
    .from("cameras")
    .select("id, organisation_id, active_session_id")
    .eq("stream_live_input_id", options.liveInputUid)
    .maybeSingle();

  if (cameraError) {
    console.error(
      "[cameras] Failed to look up camera for live recording:",
      cameraError,
    );
    return { status: "skipped", reason: "Camera lookup failed." };
  }

  if (!camera) {
    return {
      status: "skipped",
      reason: `No camera is connected to live input ${options.liveInputUid}.`,
    };
  }

  if (!camera.active_session_id) {
    return {
      status: "skipped",
      reason: `Camera ${camera.id} has no active session set — recording ${options.recordingUid} was not filed anywhere.`,
    };
  }

  const { data: video, error: insertError } = await supabase
    .from("videos")
    .insert({
      organisation_id: camera.organisation_id,
      session_id: camera.active_session_id,
      camera_id: camera.id,
      cloudflare_stream_uid: options.recordingUid,
      status: "ready",
      duration_seconds: options.durationSeconds,
    })
    .select("id")
    .single();

  if (insertError || !video) {
    console.error(
      "[cameras] Failed to save ingested live recording:",
      insertError,
    );
    return { status: "skipped", reason: "Failed to save the video record." };
  }

  // Attribution is per-broadcast: clear it so the next live session on
  // this camera doesn't inherit a stale target.
  const { error: clearError } = await supabase
    .from("cameras")
    .update({ active_session_id: null })
    .eq("id", camera.id);

  if (clearError) {
    console.error(
      "[cameras] Failed to clear camera active session after ingest:",
      clearError,
    );
  }

  return { status: "ingested", videoId: video.id };
}
