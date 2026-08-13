"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEDIA_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { createClient } from "@/services/supabase/server";
import { MAX_RECORDING_SECONDS } from "@/lib/video/capture-config";
import { CloudflareStreamService } from "@/services/cloudflare/stream";
import { CloudflareApiError } from "@/services/cloudflare/client";

export type CreateVideoUploadResult =
  | { videoId: string; uploadUrl: string }
  | { error: string };

// Called from the capture page once MediaRecorder has stopped and the final
// file size is known.
export async function createVideoUploadAction(
  slug: string,
  sessionId: string,
  cameraId: string,
  uploadLengthBytes: number,
): Promise<CreateVideoUploadResult> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  let upload: { uid: string; uploadUrl: string };
  try {
    upload = await CloudflareStreamService.createDirectUpload({
      maxDurationSeconds: MAX_RECORDING_SECONDS,
      uploadLengthBytes,
    });
  } catch (cloudflareError) {
    console.error(
      "[videos] Failed to create Cloudflare direct upload:",
      cloudflareError,
    );
    const message =
      cloudflareError instanceof CloudflareApiError &&
      cloudflareError.status === 0
        ? "Video upload isn't connected yet. Check the Cloudflare configuration."
        : "We couldn't start the upload. Check the connection and try again.";
    return { error: message };
  }

  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .insert({
      organisation_id: membership.id,
      session_id: sessionId,
      camera_id: cameraId,
      cloudflare_stream_uid: upload.uid,
      status: "uploading",
    })
    .select("id")
    .single();

  if (error || !video) {
    console.error("[videos] Failed to create video record:", error);
    return { error: "We couldn't start the upload. Try again." };
  }

  return { videoId: video.id, uploadUrl: upload.uploadUrl };
}

export async function markVideoReadyAction(
  slug: string,
  videoId: string,
  durationSeconds: number,
  sessionId: string,
): Promise<void> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .update({ status: "ready", duration_seconds: Math.round(durationSeconds) })
    .eq("id", videoId)
    .eq("organisation_id", membership.id)
    .eq("session_id", sessionId);

  if (error) {
    console.error("[videos] Failed to mark video ready:", error);
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("team_id")
    .eq("id", sessionId)
    .eq("organisation_id", membership.id)
    .maybeSingle();

  revalidatePath(`/org/${slug}`);
  revalidatePath(`/org/${slug}/clips`);
  if (session?.team_id) {
    revalidatePath(
      `/org/${slug}/teams/${session.team_id}/sessions/${sessionId}`,
    );
    revalidatePath(
      `/org/${slug}/teams/${session.team_id}/sessions/${sessionId}/videos/${videoId}`,
    );
  }
}

export async function markVideoErrorAction(
  slug: string,
  videoId: string,
): Promise<void> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .update({ status: "error" })
    .eq("id", videoId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[videos] Failed to mark video error:", error);
  }
}

export async function deleteVideoAction(
  slug: string,
  sessionId: string,
  videoId: string,
): Promise<{ error?: string }> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const existing = await getVideoForOrganisation(membership.id, videoId);
  if (!existing || existing.sessionId !== sessionId) {
    return { error: "This recording could not be found." };
  }

  try {
    await CloudflareStreamService.deleteVideo(existing.cloudflareStreamUid);
  } catch (cloudflareError) {
    const alreadyGone =
      cloudflareError instanceof CloudflareApiError &&
      cloudflareError.status === 404;

    if (!alreadyGone) {
      console.error(
        "[videos] Failed to delete Cloudflare Stream video:",
        cloudflareError,
      );
      return {
        error:
          "We couldn't remove this recording from Stream. Try again or contact support.",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .delete()
    .eq("id", videoId)
    .eq("organisation_id", membership.id)
    .eq("session_id", sessionId);

  if (error) {
    console.error("[videos] Failed to delete video:", error);
    return { error: "We couldn't remove this recording. Try again." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("team_id")
    .eq("id", sessionId)
    .eq("organisation_id", membership.id)
    .maybeSingle();

  revalidatePath(`/org/${slug}`);
  revalidatePath(`/org/${slug}/clips`);
  if (session?.team_id) {
    revalidatePath(
      `/org/${slug}/teams/${session.team_id}/sessions/${sessionId}`,
    );
  }

  return {};
}
