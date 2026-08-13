import type { VideoStatus } from "@/types/database";

export type { VideoStatus };

export type Video = {
  id: string;
  organisationId: string;
  sessionId: string;
  cameraId: string;
  cloudflareStreamUid: string;
  status: VideoStatus;
  durationSeconds: number | null;
  createdAt: string;
};

export type VideoWithContext = Video & {
  teamId: string;
  teamName: string;
  cameraName: string;
};
