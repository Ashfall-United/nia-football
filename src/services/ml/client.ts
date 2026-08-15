import "server-only";
import { z } from "zod";

const ML_HEALTH_TIMEOUT_MS = 20_000;
const ML_HEALTH_RETRIES = 4;
const ML_HEALTH_RETRY_DELAY_MS = 5_000;
const ML_DETECTION_TIMEOUT_MS = 110_000;

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

export class MlServiceUnreachableError extends Error {
  constructor(message?: string) {
    super(message ?? "ML service is unreachable.");
    this.name = "MlServiceUnreachableError";
  }
}

export class MlServiceTimeoutError extends Error {
  constructor() {
    super("ML service request timed out.");
    this.name = "MlServiceTimeoutError";
  }
}

export class MlServiceUnauthorizedError extends Error {
  constructor() {
    super("ML service API key is invalid.");
    this.name = "MlServiceUnauthorizedError";
  }
}

export class MlServiceVideoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MlServiceVideoError";
  }
}

export class MlServiceLocalhostInProductionError extends Error {
  constructor() {
    super("ML service URL points to localhost in production.");
    this.name = "MlServiceLocalhostInProductionError";
  }
}

export const ML_SERVICE_CONFIG_HINT =
  "Set ML_SERVICE_URL=https://nia-football.onrender.com (no /docs) and ML_API_KEY to the same value as API_KEY on the Render ML service.";

function isProductionDeploy(): boolean {
  return process.env.VERCEL === "1" || process.env.RENDER === "true";
}

function normalizeMlBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.replace(/\/docs\/?.*$/, "");
}

function getMlConfig(): { baseUrl: string; apiKey: string } {
  const rawUrl = process.env.ML_SERVICE_URL;
  const baseUrl = rawUrl ? normalizeMlBaseUrl(rawUrl) : undefined;
  const apiKey = process.env.ML_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    throw new MlServiceNotConfiguredError();
  }

  if (isProductionDeploy() && isLocalhostUrl(baseUrl)) {
    throw new MlServiceLocalhostInProductionError();
  }

  return { baseUrl, apiKey };
}

function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MlServiceTimeoutError();
    }
    throw new MlServiceUnreachableError();
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseMlErrorDetail(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "detail" in parsed &&
      typeof parsed.detail === "string"
    ) {
      return parsed.detail;
    }
  } catch {
    return body.trim() || null;
  }
  return null;
}

function handleMlErrorResponse(status: number, body: string): never {
  if (status === 401 || status === 403) {
    throw new MlServiceUnauthorizedError();
  }

  if (status === 502 || status === 503 || status === 504) {
    throw new MlServiceUnreachableError(
      "Analysis service ran out of memory or restarted mid-request. On Render, upgrade nia-football-ml to the Standard plan (2 GB RAM) and redeploy.",
    );
  }

  const detail = parseMlErrorDetail(body);
  if (status === 422 && detail) {
    throw new MlServiceVideoError(detail);
  }

  console.error("[ml] Request failed:", status, body);
  throw new Error("ML service request failed.");
}

export async function requestVideoDetections(options: {
  videoUrl: string;
  sampleFps?: number;
  maxFrames?: number;
}): Promise<MlDetectionFrame[]> {
  const { baseUrl, apiKey } = getMlConfig();

  const response = await fetchWithTimeout(
    `${baseUrl}/detections`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: options.videoUrl,
        sample_fps: options.sampleFps ?? 1,
        max_frames: options.maxFrames ?? 24,
      }),
    },
    ML_DETECTION_TIMEOUT_MS,
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    handleMlErrorResponse(response.status, body);
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

  const response = await fetchWithTimeout(
    `${baseUrl}/heatmap`,
    {
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
    },
    ML_DETECTION_TIMEOUT_MS,
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    handleMlErrorResponse(response.status, body);
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
  for (let attempt = 0; attempt < ML_HEALTH_RETRIES; attempt += 1) {
    try {
      const { baseUrl } = getMlConfig();
      const response = await fetchWithTimeout(
        `${baseUrl}/health`,
        { cache: "no-store" },
        ML_HEALTH_TIMEOUT_MS,
      );
      if (!response.ok) {
        continue;
      }
      const json: unknown = await response.json();
      if (
        typeof json === "object" &&
        json !== null &&
        "status" in json &&
        json.status === "ok"
      ) {
        return true;
      }
    } catch {
      // Render free tier cold starts can take 30–60s — retry before failing.
    }

    if (attempt < ML_HEALTH_RETRIES - 1) {
      await sleep(ML_HEALTH_RETRY_DELAY_MS);
    }
  }

  return false;
}

export async function assertMlServiceReady(): Promise<void> {
  getMlConfig();
  const healthy = await checkMlServiceHealth();
  if (!healthy) {
    throw new MlServiceUnreachableError();
  }
}

export function mapMlErrorToMessage(error: unknown): string {
  if (error instanceof MlServiceNotConfiguredError) {
    return `Analysis service is not configured. ${ML_SERVICE_CONFIG_HINT}`;
  }
  if (error instanceof MlServiceLocalhostInProductionError) {
    return `ML_SERVICE_URL points to localhost. ${ML_SERVICE_CONFIG_HINT}`;
  }
  if (error instanceof MlServiceUnauthorizedError) {
    return `ML API key rejected. ${ML_SERVICE_CONFIG_HINT}`;
  }
  if (error instanceof MlServiceUnreachableError) {
    return error.message;
  }
  if (error instanceof MlServiceTimeoutError) {
    return "Analysis timed out. Try again with a shorter recording, or upgrade the Render ML service so it stays warm.";
  }
  if (error instanceof MlServiceVideoError) {
    return `Could not read this video for analysis: ${error.message}`;
  }
  return "Analysis failed. Try again.";
}
