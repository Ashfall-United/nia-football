import "server-only";
import { createClient } from "@/services/supabase/server";
import type { Video, VideoWithContext } from "./types";

const VIDEO_COLUMNS =
  "id, organisation_id, session_id, camera_id, cloudflare_stream_uid, status, duration_seconds, created_at";

const RECENT_VIDEOS_PAGE_SIZE = 20;

function mapVideoRow(video: {
  id: string;
  organisation_id: string;
  session_id: string;
  camera_id: string;
  cloudflare_stream_uid: string;
  status: Video["status"];
  duration_seconds: number | null;
  created_at: string;
}): Video {
  return {
    id: video.id,
    organisationId: video.organisation_id,
    sessionId: video.session_id,
    cameraId: video.camera_id,
    cloudflareStreamUid: video.cloudflare_stream_uid,
    status: video.status,
    durationSeconds: video.duration_seconds,
    createdAt: video.created_at,
  };
}

export async function listVideosForSession(
  organisationId: string,
  sessionId: string,
): Promise<Video[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[videos] Failed to load videos:", error);
    throw new Error("Failed to load videos.");
  }

  return (data ?? []).map((video) => mapVideoRow(video));
}

export async function listRecentVideosForOrganisation(
  organisationId: string,
): Promise<VideoWithContext[]> {
  const supabase = await createClient();

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(RECENT_VIDEOS_PAGE_SIZE);

  if (videosError) {
    console.error("[videos] Failed to load recent videos:", videosError);
    throw new Error("Failed to load recent videos.");
  }

  if (!videos || videos.length === 0) {
    return [];
  }

  const sessionIds = [...new Set(videos.map((video) => video.session_id))];
  const cameraIds = [...new Set(videos.map((video) => video.camera_id))];
  const teamIds = new Set<string>();

  const [
    { data: sessions, error: sessionsError },
    { data: cameras, error: camerasError },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, team_id")
      .eq("organisation_id", organisationId)
      .in("id", sessionIds),
    supabase
      .from("cameras")
      .select("id, name")
      .eq("organisation_id", organisationId)
      .in("id", cameraIds),
  ]);

  if (sessionsError || camerasError) {
    console.error("[videos] Failed to load recent video context:", {
      sessionsError,
      camerasError,
    });
    throw new Error("Failed to load recent videos.");
  }

  for (const session of sessions ?? []) {
    teamIds.add(session.team_id);
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("organisation_id", organisationId)
    .in("id", [...teamIds]);

  if (teamsError) {
    console.error("[videos] Failed to load recent video teams:", teamsError);
    throw new Error("Failed to load recent videos.");
  }

  const teamBySessionId = new Map(
    (sessions ?? []).map((session) => [session.id, session.team_id]),
  );
  const teamNameById = new Map(
    (teams ?? []).map((team) => [team.id, team.name]),
  );
  const cameraNameById = new Map(
    (cameras ?? []).map((camera) => [camera.id, camera.name]),
  );

  return videos.flatMap((video) => {
    const teamId = teamBySessionId.get(video.session_id);
    const teamName = teamId ? teamNameById.get(teamId) : undefined;
    if (!teamId || !teamName) {
      return [];
    }

    return [
      {
        ...mapVideoRow(video),
        teamId,
        teamName,
        cameraName: cameraNameById.get(video.camera_id) ?? "Camera",
      },
    ];
  });
}

export async function countReadyVideosForSessions(
  organisationId: string,
  sessionIds: readonly string[],
): Promise<Map<string, number>> {
  if (sessionIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("session_id")
    .eq("organisation_id", organisationId)
    .eq("status", "ready")
    .in("session_id", [...sessionIds]);

  if (error) {
    console.error("[videos] Failed to count session videos:", error);
    throw new Error("Failed to load session footage counts.");
  }

  const counts = new Map<string, number>();
  for (const video of data ?? []) {
    counts.set(video.session_id, (counts.get(video.session_id) ?? 0) + 1);
  }
  return counts;
}

export async function getVideoForOrganisation(
  organisationId: string,
  videoId: string,
): Promise<Video | null> {
  const supabase = await createClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("id", videoId)
    .maybeSingle();

  if (error) {
    console.error("[videos] Failed to load video:", error);
    throw new Error("Failed to load video.");
  }

  if (!video) {
    return null;
  }

  return mapVideoRow(video);
}
