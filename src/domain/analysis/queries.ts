import "server-only";
import { createClient } from "@/services/supabase/server";
import type { CalibrationPoint, Heatmap, VideoCalibration } from "./types";

const CALIBRATION_COLUMNS =
  "id, organisation_id, video_id, pitch_length_meters, pitch_width_meters, points, created_by, created_at, updated_at";

const HEATMAP_COLUMNS =
  "id, organisation_id, video_id, calibration_id, target, sample_fps, frame_count, sample_count, grid_cols, grid_rows, grid, created_by, created_at";

function mapCalibrationRow(row: {
  id: string;
  organisation_id: string;
  video_id: string;
  pitch_length_meters: number;
  pitch_width_meters: number;
  points: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
}): VideoCalibration {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    videoId: row.video_id,
    pitchLengthMeters: row.pitch_length_meters,
    pitchWidthMeters: row.pitch_width_meters,
    points: row.points as CalibrationPoint[],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHeatmapRow(row: {
  id: string;
  organisation_id: string;
  video_id: string;
  calibration_id: string;
  target: Heatmap["target"];
  sample_fps: number;
  frame_count: number;
  sample_count: number;
  grid_cols: number;
  grid_rows: number;
  grid: unknown;
  created_by: string;
  created_at: string;
}): Heatmap {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    videoId: row.video_id,
    calibrationId: row.calibration_id,
    target: row.target,
    sampleFps: row.sample_fps,
    frameCount: row.frame_count,
    sampleCount: row.sample_count,
    gridCols: row.grid_cols,
    gridRows: row.grid_rows,
    grid: row.grid as number[][],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getCalibrationForVideo(
  organisationId: string,
  videoId: string,
): Promise<VideoCalibration | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("video_calibrations")
    .select(CALIBRATION_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("video_id", videoId)
    .maybeSingle();

  if (error) {
    console.error("[analysis] Failed to load calibration:", error);
    throw new Error("Failed to load pitch calibration.");
  }

  return data ? mapCalibrationRow(data) : null;
}

export async function listHeatmapsForVideo(
  organisationId: string,
  videoId: string,
): Promise<Heatmap[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("heatmaps")
    .select(HEATMAP_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("video_id", videoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[analysis] Failed to load heatmaps:", error);
    throw new Error("Failed to load heatmaps.");
  }

  return (data ?? []).map(mapHeatmapRow);
}
