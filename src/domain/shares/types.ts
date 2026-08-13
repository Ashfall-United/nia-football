import type { ShareResourceType } from "@/types/database";

export type SharedLink = {
  id: string;
  organisationId: string;
  token: string;
  resourceType: ShareResourceType;
  resourceId: string;
  createdBy: string;
  expiresAt: string | null;
  createdAt: string;
};

export type SharedClipPreview = {
  resourceType: "clip";
  organisationName: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  notes: string | null;
  videoId: string;
  streamUid: string;
};

export type SharedPlaylistClipPreview = {
  title: string;
  startSeconds: number;
  endSeconds: number;
  streamUid: string;
  position: number;
};

export type SharedPlaylistPreview = {
  resourceType: "playlist";
  organisationName: string;
  title: string;
  description: string | null;
  clips: SharedPlaylistClipPreview[];
};

export type SharedLinkPreview = SharedClipPreview | SharedPlaylistPreview;

export type SharedLinkExpired = {
  expired: true;
};

export type SharedLinkResult = SharedLinkPreview | SharedLinkExpired | null;
