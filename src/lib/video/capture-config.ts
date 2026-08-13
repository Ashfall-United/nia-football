export const MAX_RECORDING_SECONDS = 3 * 60 * 60;

/** Target 720p capture with a practical mobile uplink footprint. */
export const CAPTURE_VIDEO_BITS_PER_SECOND = 2_500_000;
export const CAPTURE_AUDIO_BITS_PER_SECOND = 128_000;

export const CAPTURE_VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, max: 1280 },
  height: { ideal: 720, max: 720 },
} as const;

const MIN_TUS_CHUNK_BYTES = 5 * 1024 * 1024;
const DEFAULT_TUS_CHUNK_BYTES = 15 * 1024 * 1024;
const MAX_TUS_CHUNK_BYTES = 50 * 1024 * 1024;

type NetworkInformationLike = {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
};

export function buildMediaRecorderOptions(
  mimeType: string,
): MediaRecorderOptions {
  return {
    mimeType,
    videoBitsPerSecond: CAPTURE_VIDEO_BITS_PER_SECOND,
    audioBitsPerSecond: CAPTURE_AUDIO_BITS_PER_SECOND,
  };
}

export function estimateMaxRecordingBytes(): number {
  const bitsPerSecond =
    CAPTURE_VIDEO_BITS_PER_SECOND + CAPTURE_AUDIO_BITS_PER_SECOND;
  // 10% headroom for container overhead and encoder variance.
  return Math.ceil((bitsPerSecond * MAX_RECORDING_SECONDS) / 8 * 1.1);
}

/** Pick a TUS chunk size from connection quality (browser-only). */
export function getAdaptiveTusChunkSize(): number {
  if (typeof navigator === "undefined") {
    return DEFAULT_TUS_CHUNK_BYTES;
  }

  const connection = (navigator as Navigator & {
    connection?: NetworkInformationLike;
  }).connection;

  if (!connection) {
    return DEFAULT_TUS_CHUNK_BYTES;
  }

  if (connection.saveData) {
    return MIN_TUS_CHUNK_BYTES;
  }

  if (typeof connection.downlink === "number" && connection.downlink > 0) {
    if (connection.downlink >= 10) return MAX_TUS_CHUNK_BYTES;
    if (connection.downlink >= 5) return DEFAULT_TUS_CHUNK_BYTES;
    if (connection.downlink >= 2) return 10 * 1024 * 1024;
    return MIN_TUS_CHUNK_BYTES;
  }

  switch (connection.effectiveType) {
    case "slow-2g":
    case "2g":
      return MIN_TUS_CHUNK_BYTES;
    case "3g":
      return 10 * 1024 * 1024;
    case "4g":
      return DEFAULT_TUS_CHUNK_BYTES;
    default:
      return MAX_TUS_CHUNK_BYTES;
  }
}
