import "server-only";
import type { Video } from "@/domain/videos/types";
import { createClient } from "@/services/supabase/server";
import { CloudflareStreamService } from "./stream";

export async function resolveVideoDurationSeconds(
  video: Pick<Video, "id" | "organisationId" | "cloudflareStreamUid" | "durationSeconds">,
): Promise<number | null> {
  if (video.durationSeconds !== null && video.durationSeconds > 0) {
    return video.durationSeconds;
  }

  let duration: number | null;
  try {
    duration = await CloudflareStreamService.getVideoDuration(
      video.cloudflareStreamUid,
    );
  } catch (error) {
    console.error("[cloudflare] Failed to resolve video duration:", error);
    return null;
  }

  if (duration === null) {
    return null;
  }

  const rounded = Math.round(duration);
  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .update({ duration_seconds: rounded })
    .eq("id", video.id)
    .eq("organisation_id", video.organisationId);

  if (error) {
    console.error("[videos] Failed to backfill duration:", error);
  }

  return rounded;
}
