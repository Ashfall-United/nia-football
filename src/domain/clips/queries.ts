import "server-only";
import { createClient } from "@/services/supabase/server";
import type { Clip, ClipWithContext } from "./types";

const CLIPS_PAGE_SIZE = 50;

const CLIP_COLUMNS =
  "id, organisation_id, video_id, title, start_seconds, end_seconds, notes, created_by, created_at";

type ClipRow = {
  id: string;
  organisation_id: string;
  video_id: string;
  title: string;
  start_seconds: number;
  end_seconds: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  source_event_id?: string | null;
};

function mapClipRow(clip: ClipRow) {
  return {
    id: clip.id,
    organisationId: clip.organisation_id,
    videoId: clip.video_id,
    title: clip.title,
    startSeconds: clip.start_seconds,
    endSeconds: clip.end_seconds,
    notes: clip.notes,
    sourceEventId: clip.source_event_id ?? null,
    createdBy: clip.created_by,
    createdAt: clip.created_at,
  };
}

export async function listClipsForVideo(
  organisationId: string,
  videoId: string,
): Promise<Clip[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clips")
    .select(CLIP_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("video_id", videoId)
    .order("start_seconds");

  if (error) {
    console.error("[clips] Failed to load clips:", error);
    throw new Error("Failed to load clips.");
  }

  return (data ?? []).map(mapClipRow);
}

export async function listClipsForVideos(
  organisationId: string,
  videoIds: readonly string[],
): Promise<Clip[]> {
  if (videoIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clips")
    .select(CLIP_COLUMNS)
    .eq("organisation_id", organisationId)
    .in("video_id", [...videoIds])
    .order("start_seconds");

  if (error) {
    console.error("[clips] Failed to load clips for videos:", error);
    throw new Error("Failed to load clips.");
  }

  return (data ?? []).map(mapClipRow);
}

export async function listClipsForOrganisation(
  organisationId: string,
): Promise<ClipWithContext[]> {
  const supabase = await createClient();

  const { data: clips, error: clipsError } = await supabase
    .from("clips")
    .select(CLIP_COLUMNS)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .limit(CLIPS_PAGE_SIZE);

  if (clipsError) {
    console.error("[clips] Failed to load organisation clips:", clipsError);
    throw new Error("Failed to load clips.");
  }

  if (!clips || clips.length === 0) {
    return [];
  }

  const videoIds = [...new Set(clips.map((clip) => clip.video_id))];

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, session_id")
    .eq("organisation_id", organisationId)
    .in("id", videoIds);

  if (videosError) {
    console.error("[clips] Failed to load clip videos:", videosError);
    throw new Error("Failed to load clips.");
  }

  const sessionIds = [...new Set((videos ?? []).map((video) => video.session_id))];

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, team_id, scheduled_at")
    .eq("organisation_id", organisationId)
    .in("id", sessionIds);

  if (sessionsError) {
    console.error("[clips] Failed to load clip sessions:", sessionsError);
    throw new Error("Failed to load clips.");
  }

  const teamIds = [...new Set((sessions ?? []).map((session) => session.team_id))];
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("organisation_id", organisationId)
    .in("id", teamIds);

  if (teamsError) {
    console.error("[clips] Failed to load clip teams:", teamsError);
    throw new Error("Failed to load clips.");
  }

  const sessionByVideoId = new Map(
    (videos ?? []).map((video) => [video.id, video.session_id]),
  );
  const sessionById = new Map(
    (sessions ?? []).map((session) => [session.id, session]),
  );
  const teamNameById = new Map(
    (teams ?? []).map((team) => [team.id, team.name]),
  );

  return clips.flatMap((clip) => {
    const sessionId = sessionByVideoId.get(clip.video_id);
    const session = sessionId ? sessionById.get(sessionId) : undefined;
    const teamId = session?.team_id;
    const teamName = teamId ? teamNameById.get(teamId) : undefined;

    if (!sessionId || !teamId || !teamName || !session) {
      return [];
    }

    return [
      {
        ...mapClipRow(clip),
        sessionId,
        teamId,
        teamName,
        sessionScheduledAt: session.scheduled_at,
      },
    ];
  });
}
