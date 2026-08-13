export type Camera = {
  id: string;
  organisationId: string;
  name: string;
  streamLiveInputId: string | null;
  activeSessionId: string | null;
  createdAt: string;
};

export type CameraStreamCredentials = {
  rtmpsUrl: string;
  rtmpsStreamKey: string;
  srtUrl: string;
  srtStreamId: string;
  srtPassphrase: string;
  webRtcUrl: string;
};

export type CameraLiveStatus = {
  cameraId: string;
  cameraName: string;
  streamLiveInputId: string | null;
  activeSessionId: string | null;
  connected: boolean;
  state: "idle" | "connected" | "disconnected" | "unknown";
};
