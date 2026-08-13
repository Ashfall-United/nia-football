import "server-only";
import { z } from "zod";

const frameDetectionSchema = z.object({
  track_id: z.number(),
  class_name: z.string(),
  confidence: z.number(),
  bbox: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  }),
});

const frameSchema = z.object({
  timestamp_seconds: z.number(),
  detections: z.array(frameDetectionSchema),
});

const detectionsResponseSchema = z.object({
  video_url: z.string(),
  frame_count: z.number(),
  frames: z.array(frameSchema),
});

export type MlDetectionFrame = z.infer<typeof frameSchema>;

export class MlServiceNotConfiguredError extends Error {
  constructor() {
    super("ML service is not configured.");
    this.name = "MlServiceNotConfiguredError";
  }
}

function getMlConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.ML_SERVICE_URL?.replace(/\/$/, "");
  const apiKey = process.env.ML_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new MlServiceNotConfiguredError();
  }

  return { baseUrl, apiKey };
}

export async function requestVideoDetections(options: {
  videoUrl: string;
  sampleFps?: number;
  maxFrames?: number;
}): Promise<MlDetectionFrame[]> {
  const { baseUrl, apiKey } = getMlConfig();

  const response = await fetch(`${baseUrl}/detections`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: options.videoUrl,
      sample_fps: options.sampleFps ?? 1,
      max_frames: options.maxFrames ?? 120,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ml] Detection request failed:", response.status, body);
    throw new Error("Detection analysis failed.");
  }

  const json: unknown = await response.json();
  const parsed = detectionsResponseSchema.safeParse(json);

  if (!parsed.success) {
    console.error("[ml] Invalid detection response:", parsed.error.format());
    throw new Error("Detection analysis returned invalid data.");
  }

  return parsed.data.frames;
}

const heatmapResponseSchema = z.object({
  frame_count: z.number(),
  sample_count: z.number(),
  grid_cols: z.number(),
  grid_rows: z.number(),
  grid: z.array(z.array(z.number())),
});

export type MlHeatmapResult = z.infer<typeof heatmapResponseSchema>;

export type MlCalibrationPoint = {
  pixelX: number;
  pixelY: number;
  pitchX: number;
  pitchY: number;
};

export async function requestVideoHeatmap(options: {
  videoUrl: string;
  targetClass: "person" | "sports ball";
  sampleFps?: number;
  pitchLengthMeters: number;
  pitchWidthMeters: number;
  gridCols: number;
  gridRows: number;
  calibrationPoints: MlCalibrationPoint[];
}): Promise<MlHeatmapResult> {
  const { baseUrl, apiKey } = getMlConfig();

  const response = await fetch(`${baseUrl}/heatmap`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: options.videoUrl,
      sample_fps: options.sampleFps ?? 1,
      target_class: options.targetClass,
      pitch_length_meters: options.pitchLengthMeters,
      pitch_width_meters: options.pitchWidthMeters,
      grid_cols: options.gridCols,
      grid_rows: options.gridRows,
      calibration_points: options.calibrationPoints.map((point) => ({
        pixel_x: point.pixelX,
        pixel_y: point.pixelY,
        pitch_x: point.pitchX,
        pitch_y: point.pitchY,
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ml] Heatmap request failed:", response.status, body);
    throw new Error("Heatmap generation failed.");
  }

  const json: unknown = await response.json();
  const parsed = heatmapResponseSchema.safeParse(json);

  if (!parsed.success) {
    console.error("[ml] Invalid heatmap response:", parsed.error.format());
    throw new Error("Heatmap generation returned invalid data.");
  }

  return parsed.data;
}

export async function checkMlServiceHealth(): Promise<boolean> {
  try {
    const { baseUrl } = getMlConfig();
    const response = await fetch(`${baseUrl}/health`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return false;
    }
    const json: unknown = await response.json();
    return (
      typeof json === "object" &&
      json !== null &&
      "status" in json &&
      json.status === "ok"
    );
  } catch {
    return false;
  }
}
