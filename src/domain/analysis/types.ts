import type { HeatmapTarget } from "@/types/database";

export type { HeatmapTarget };

// Stored as fractions (0..1) of the source video's frame width/height,
// not raw pixels — the analyst calibrates against a thumbnail image,
// which is rendered at a different resolution than the frames the ML
// service samples. Fractions are resolution-independent; they get
// converted to absolute pixel coordinates (using the video's real
// dimensions) at heatmap-generation time.
export type CalibrationPoint = {
  fractionX: number;
  fractionY: number;
  pitchX: number;
  pitchY: number;
};

export type VideoCalibration = {
  id: string;
  organisationId: string;
  videoId: string;
  pitchLengthMeters: number;
  pitchWidthMeters: number;
  points: CalibrationPoint[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Heatmap = {
  id: string;
  organisationId: string;
  videoId: string;
  calibrationId: string;
  target: HeatmapTarget;
  sampleFps: number;
  frameCount: number;
  sampleCount: number;
  gridCols: number;
  gridRows: number;
  grid: number[][];
  createdBy: string;
  createdAt: string;
};
