export type Playlist = {
  id: string;
  organisationId: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistSummary = Playlist & {
  clipCount: number;
};

export type ListPlaylistsResult =
  | { ok: true; playlists: PlaylistSummary[] }
  | { ok: false; reason: "schema_missing" };

export type PlaylistClipItem = {
  clipId: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  notes: string | null;
  videoId: string;
  position: number;
  teamId: string | null;
  sessionId: string | null;
  teamName: string | null;
  sessionScheduledAt: string | null;
  streamUid: string | null;
};

export type PlaylistWithClips = Playlist & {
  clips: PlaylistClipItem[];
};
