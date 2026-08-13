"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ANALYSIS_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getVideoForOrganisation } from "@/domain/videos/queries";
import { createClient } from "@/services/supabase/server";
import { CloudflareStreamService } from "@/services/cloudflare/stream";
import { resolveStreamMlVideoUrl } from "@/services/cloudflare/playback";
import {
  MlServiceNotConfiguredError,
  requestVideoHeatmap,
} from "@/services/ml/client";
import { saveCalibrationSchema } from "@/lib/validation/analysis";
import { getCalibrationForVideo } from "./queries";
import type { HeatmapTarget } from "./types";

export type SaveCalibrationActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export async function saveCalibrationAction(
  slug: string,
  videoId: string,
  _prevState: SaveCalibrationActionState,
  formData: FormData,
): Promise<SaveCalibrationActionState> {
  const user = await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const video = await getVideoForOrganisation(membership.id, videoId);
  if (!video) {
    return { error: "We couldn't find this video." };
  }

  const rawPoints = formData.get("points");
  let parsedPoints: unknown;
  try {
    parsedPoints = typeof rawPoints === "string" ? JSON.parse(rawPoints) : [];
  } catch {
    return { error: "Invalid calibration points." };
  }

  const validated = saveCalibrationSchema.safeParse({
    pitchLengthMeters: formData.get("pitchLengthMeters"),
    pitchWidthMeters: formData.get("pitchWidthMeters"),
    points: parsedPoints,
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const existing = await getCalibrationForVideo(membership.id, videoId);
  const supabase = await createClient();

  const { error } = existing
    ? await supabase
        .from("video_calibrations")
        .update({
          pitch_length_meters: validated.data.pitchLengthMeters,
          pitch_width_meters: validated.data.pitchWidthMeters,
          points: validated.data.points,
        })
        .eq("id", existing.id)
        .eq("organisation_id", membership.id)
    : await supabase.from("video_calibrations").insert({
        organisation_id: membership.id,
        video_id: videoId,
        pitch_length_meters: validated.data.pitchLengthMeters,
        pitch_width_meters: validated.data.pitchWidthMeters,
        points: validated.data.points,
        created_by: user.id,
      });

  if (error) {
    console.error("[analysis] Failed to save calibration:", error);
    return { error: "We couldn't save this calibration. Try again." };
  }

  revalidatePath(`/org/${slug}`);
}

export type GenerateHeatmapActionState =
  | {
      error?: string;
      heatmapId?: string;
    }
  | undefined;

// A cell roughly this many meters wide/tall keeps the grid readable
// without over-resolving relative to detection/homography noise.
const GRID_CELL_METERS = 5;
const MIN_GRID_SIZE = 4;
const MAX_GRID_SIZE = 200;

function gridSizeForMeters(meters: number): number {
  return Math.min(
    MAX_GRID_SIZE,
    Math.max(MIN_GRID_SIZE, Math.round(meters / GRID_CELL_METERS)),
  );
}

export async function generateHeatmapAction(
  slug: string,
  videoId: string,
  target: HeatmapTarget,
): Promise<GenerateHeatmapActionState> {
  const user = await requireAuthenticatedUser();
  const membership = await requireOrganisationBySlug(
    slug,
    ANALYSIS_MANAGEMENT_ROLES,
  );

  const video = await getVideoForOrganisation(membership.id, videoId);
  if (!video) {
    return { error: "We couldn't find this video." };
  }

  const calibration = await getCalibrationForVideo(membership.id, videoId);
  if (!calibration) {
    return {
      error: "Calibrate this video's pitch before generating a heatmap.",
    };
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
    console.error("[analysis] Failed to resolve ML video URL:", cloudflareError);
    return {
      error:
        "We couldn't prepare this recording for analysis. Try again shortly.",
    };
  }

  const dimensions = await CloudflareStreamService.getVideoDimensions(
    video.cloudflareStreamUid,
  );
  if (!dimensions) {
    return {
      error: "We couldn't determine this video's resolution. Try again.",
    };
  }

  let result;
  try {
    result = await requestVideoHeatmap({
      videoUrl,
      targetClass: target === "ball" ? "sports ball" : "person",
      pitchLengthMeters: calibration.pitchLengthMeters,
      pitchWidthMeters: calibration.pitchWidthMeters,
      gridCols: gridSizeForMeters(calibration.pitchLengthMeters),
      gridRows: gridSizeForMeters(calibration.pitchWidthMeters),
      calibrationPoints: calibration.points.map((point) => ({
        pixelX: point.fractionX * dimensions.width,
        pixelY: point.fractionY * dimensions.height,
        pitchX: point.pitchX,
        pitchY: point.pitchY,
      })),
    });
  } catch (mlError) {
    if (mlError instanceof MlServiceNotConfiguredError) {
      return { error: "The analysis service isn't configured yet." };
    }
    console.error("[analysis] Heatmap generation failed:", mlError);
    return { error: "We couldn't generate this heatmap. Try again." };
  }

  const supabase = await createClient();
  const { data: heatmap, error: insertError } = await supabase
    .from("heatmaps")
    .insert({
      organisation_id: membership.id,
      video_id: videoId,
      calibration_id: calibration.id,
      target,
      sample_fps: 1,
      frame_count: result.frame_count,
      sample_count: result.sample_count,
      grid_cols: result.grid_cols,
      grid_rows: result.grid_rows,
      grid: result.grid,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !heatmap) {
    console.error("[analysis] Failed to save heatmap:", insertError);
    return {
      error: "We generated the heatmap but couldn't save it. Try again.",
    };
  }

  revalidatePath(`/org/${slug}`);
  return { heatmapId: heatmap.id };
}
