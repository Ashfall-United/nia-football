import "server-only";
import { createClient } from "@/services/supabase/server";
import {
  logSupabaseError,
  isMissingSchemaError,
} from "@/lib/supabase/errors";
import type {
  ListPlaylistsResult,
  PlaylistClipItem,
  PlaylistSummary,
  PlaylistWithClips,
} from "./types";

const PLAYLIST_COLUMNS =
  "id, organisation_id, title, description, created_by, created_at, updated_at";

function mapPlaylist(row: {
  id: string;
  organisation_id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    title: row.title,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPlaylistsForOrganisation(
  organisationId: string,
): Promise<ListPlaylistsResult> {
  const supabase = await createClient();

  const { data: playlists, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_COLUMNS)
    .eq("organisation_id", organisationId)
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseError("[playlists] Failed to load playlists:", error);
    if (isMissingSchemaError(error)) {
      return { ok: false, reason: "schema_missing" };
    }
    throw new Error(
      error.message
        ? `Failed to load playlists: ${error.message}`
        : "Failed to load playlists.",
    );
  }

  if (!playlists || playlists.length === 0) {
    return { ok: true, playlists: [] };
  }

  const playlistIds = playlists.map((playlist) => playlist.id);

  const { data: clipRows, error: clipCountError } = await supabase
    .from("playlist_clips")
    .select("playlist_id")
    .in("playlist_id", playlistIds);

  if (clipCountError) {
    logSupabaseError("[playlists] Failed to load clip counts:", clipCountError);
    if (isMissingSchemaError(clipCountError)) {
      return { ok: false, reason: "schema_missing" };
    }
    throw new Error(
      clipCountError.message
        ? `Failed to load playlists: ${clipCountError.message}`
        : "Failed to load playlists.",
    );
  }

  const clipCountByPlaylistId = new Map<string, number>();
  for (const row of clipRows ?? []) {
    clipCountByPlaylistId.set(
      row.playlist_id,
      (clipCountByPlaylistId.get(row.playlist_id) ?? 0) + 1,
    );
  }

  return {
    ok: true,
    playlists: playlists.map((playlist) => ({
      ...mapPlaylist(playlist),
      clipCount: clipCountByPlaylistId.get(playlist.id) ?? 0,
    })),
  };
}

export async function getPlaylistForOrganisation(
  organisationId: string,
  playlistId: string,
): Promise<PlaylistWithClips | null> {
  const supabase = await createClient();

  const { data: playlist, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("id", playlistId)
    .maybeSingle();

  if (error) {
    console.error("[playlists] Failed to load playlist:", error);
    throw new Error("Failed to load playlist.");
  }

  if (!playlist) {
    return null;
  }

  const { data: playlistClips, error: clipsError } = await supabase
    .from("playlist_clips")
    .select("clip_id, position")
    .eq("playlist_id", playlistId)
    .order("position");

  if (clipsError) {
    console.error("[playlists] Failed to load playlist clips:", clipsError);
    throw new Error("Failed to load playlist.");
  }

  if (!playlistClips || playlistClips.length === 0) {
    return {
      ...mapPlaylist(playlist),
      clips: [],
    };
  }

  const clipIds = playlistClips.map((row) => row.clip_id);

  const { data: clips, error: clipDetailsError } = await supabase
    .from("clips")
    .select("id, title, start_seconds, end_seconds, notes, video_id")
    .eq("organisation_id", organisationId)
    .in("id", clipIds);

  if (clipDetailsError) {
    console.error("[playlists] Failed to load clip details:", clipDetailsError);
    throw new Error("Failed to load playlist.");
  }

  const clipById = new Map((clips ?? []).map((clip) => [clip.id, clip]));
  const videoIds = [...new Set((clips ?? []).map((clip) => clip.video_id))];

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, session_id, cloudflare_stream_uid")
    .eq("organisation_id", organisationId)
    .in("id", videoIds);

  if (videosError) {
    console.error("[playlists] Failed to load clip videos:", videosError);
    throw new Error("Failed to load playlist.");
  }

  const sessionIds = [
    ...new Set((videos ?? []).map((video) => video.session_id)),
  ];

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, team_id, scheduled_at")
    .eq("organisation_id", organisationId)
    .in("id", sessionIds);

  if (sessionsError) {
    console.error("[playlists] Failed to load clip sessions:", sessionsError);
    throw new Error("Failed to load playlist.");
  }

  const teamIds = [...new Set((sessions ?? []).map((session) => session.team_id))];

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("organisation_id", organisationId)
    .in("id", teamIds);

  if (teamsError) {
    console.error("[playlists] Failed to load clip teams:", teamsError);
    throw new Error("Failed to load playlist.");
  }

  const videoById = new Map((videos ?? []).map((video) => [video.id, video]));
  const sessionById = new Map(
    (sessions ?? []).map((session) => [session.id, session]),
  );
  const teamNameById = new Map(
    (teams ?? []).map((team) => [team.id, team.name]),
  );

  const items: PlaylistClipItem[] = playlistClips.flatMap((row) => {
    const clip = clipById.get(row.clip_id);
    if (!clip) {
      return [];
    }

    const video = videoById.get(clip.video_id);
    const session = video ? sessionById.get(video.session_id) : undefined;
    const teamId = session?.team_id ?? null;
    const teamName = teamId ? (teamNameById.get(teamId) ?? null) : null;

    return [
      {
        clipId: clip.id,
        title: clip.title,
        startSeconds: clip.start_seconds,
        endSeconds: clip.end_seconds,
        notes: clip.notes,
        videoId: clip.video_id,
        position: row.position,
        sessionId: video?.session_id ?? null,
        teamId,
        teamName,
        sessionScheduledAt: session?.scheduled_at ?? null,
        streamUid: video?.cloudflare_stream_uid ?? null,
      },
    ];
  });

  return {
    ...mapPlaylist(playlist),
    clips: items,
  };
}

export async function listClipIdsInPlaylist(
  playlistId: string,
): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("playlist_clips")
    .select("clip_id")
    .eq("playlist_id", playlistId);

  if (error) {
    console.error("[playlists] Failed to load playlist clip ids:", error);
    throw new Error("Failed to load playlist.");
  }

  return new Set((data ?? []).map((row) => row.clip_id));
}
