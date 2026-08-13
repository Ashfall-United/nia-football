import "server-only";
import { createClient } from "@/services/supabase/server";
import { CloudflareStreamService } from "@/services/cloudflare/stream";
import type {
  Camera,
  CameraLiveStatus,
  CameraStreamCredentials,
} from "./types";

const CAMERA_COLUMNS =
  "id, organisation_id, name, stream_live_input_id, active_session_id, created_at";

export async function listCamerasForOrganisation(
  organisationId: string,
): Promise<Camera[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cameras")
    .select(CAMERA_COLUMNS)
    .eq("organisation_id", organisationId)
    .order("name");

  if (error) {
    console.error("[cameras] Failed to load cameras:", error);
    throw new Error("Failed to load cameras.");
  }

  return (data ?? []).map((camera) => ({
    id: camera.id,
    organisationId: camera.organisation_id,
    name: camera.name,
    streamLiveInputId: camera.stream_live_input_id,
    activeSessionId: camera.active_session_id,
    createdAt: camera.created_at,
  }));
}

export async function getCameraForOrganisation(
  organisationId: string,
  cameraId: string,
): Promise<Camera | null> {
  const supabase = await createClient();

  const { data: camera, error } = await supabase
    .from("cameras")
    .select(CAMERA_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("id", cameraId)
    .maybeSingle();

  if (error) {
    console.error("[cameras] Failed to load camera:", error);
    throw new Error("Failed to load camera.");
  }

  if (!camera) {
    return null;
  }

  return {
    id: camera.id,
    organisationId: camera.organisation_id,
    name: camera.name,
    streamLiveInputId: camera.stream_live_input_id,
    activeSessionId: camera.active_session_id,
    createdAt: camera.created_at,
  };
}

function mapLiveInputState(
  state: string | undefined,
): CameraLiveStatus["state"] {
  if (!state) {
    return "unknown";
  }
  const normalized = state.toLowerCase();
  if (normalized.includes("connected") && !normalized.includes("dis")) {
    return "connected";
  }
  if (normalized.includes("disconnected") || normalized.includes("idle")) {
    return normalized.includes("disconnected") ? "disconnected" : "idle";
  }
  return "unknown";
}

export async function getCameraStreamCredentials(
  organisationId: string,
  cameraId: string,
): Promise<CameraStreamCredentials | null> {
  const camera = await getCameraForOrganisation(organisationId, cameraId);
  if (!camera?.streamLiveInputId) {
    return null;
  }

  const liveInput = await CloudflareStreamService.getLiveInput(
    camera.streamLiveInputId,
  );

  return {
    rtmpsUrl: liveInput.rtmps.url,
    rtmpsStreamKey: liveInput.rtmps.streamKey,
    srtUrl: liveInput.srt.url,
    srtStreamId: liveInput.srt.streamId,
    srtPassphrase: liveInput.srt.passphrase,
    webRtcUrl: liveInput.webRTC.url,
  };
}

export async function getCameraLiveStatus(
  organisationId: string,
  cameraId: string,
): Promise<CameraLiveStatus | null> {
  const camera = await getCameraForOrganisation(organisationId, cameraId);
  if (!camera) {
    return null;
  }

  if (!camera.streamLiveInputId) {
    return {
      cameraId: camera.id,
      cameraName: camera.name,
      streamLiveInputId: null,
      activeSessionId: camera.activeSessionId,
      connected: false,
      state: "idle",
    };
  }

  try {
    const liveInput = await CloudflareStreamService.getLiveInput(
      camera.streamLiveInputId,
    );
    const state = mapLiveInputState(liveInput.status?.current?.state);
    return {
      cameraId: camera.id,
      cameraName: camera.name,
      streamLiveInputId: camera.streamLiveInputId,
      activeSessionId: camera.activeSessionId,
      connected: state === "connected",
      state,
    };
  } catch (error) {
    console.error("[cameras] Failed to load live status:", error);
    return {
      cameraId: camera.id,
      cameraName: camera.name,
      streamLiveInputId: camera.streamLiveInputId,
      activeSessionId: camera.activeSessionId,
      connected: false,
      state: "unknown",
    };
  }
}

export async function listCameraLiveStatuses(
  organisationId: string,
): Promise<CameraLiveStatus[]> {
  const cameras = await listCamerasForOrganisation(organisationId);
  return Promise.all(
    cameras.map(async (camera) => {
      const status = await getCameraLiveStatus(organisationId, camera.id);
      return (
        status ?? {
          cameraId: camera.id,
          cameraName: camera.name,
          streamLiveInputId: camera.streamLiveInputId,
          activeSessionId: camera.activeSessionId,
          connected: false,
          state: "unknown" as const,
        }
      );
    }),
  );
}
