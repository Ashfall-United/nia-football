import "server-only";
import { createClient } from "@/services/supabase/server";
import type { Session, SessionWithTeam } from "./types";

const SESSION_COLUMNS =
  "id, organisation_id, team_id, type, scheduled_at, location, pitch_surface, notes, opponent_name, is_home, competition, team_score, opponent_score, created_at";

const RECENT_SESSIONS_PAGE_SIZE = 30;

function mapSessionRow(session: {
  id: string;
  organisation_id: string;
  team_id: string;
  type: Session["type"];
  scheduled_at: string;
  location: string | null;
  pitch_surface: Session["pitchSurface"];
  notes: string | null;
  opponent_name: string | null;
  is_home: boolean | null;
  competition: string | null;
  team_score: number | null;
  opponent_score: number | null;
  created_at: string;
}): Session {
  return {
    id: session.id,
    organisationId: session.organisation_id,
    teamId: session.team_id,
    type: session.type,
    scheduledAt: session.scheduled_at,
    location: session.location,
    pitchSurface: session.pitch_surface,
    notes: session.notes,
    opponentName: session.opponent_name,
    isHome: session.is_home,
    competition: session.competition,
    teamScore: session.team_score,
    opponentScore: session.opponent_score,
    createdAt: session.created_at,
  };
}

// Cameras aren't team-scoped, so picking "which session is this camera
// live for" (Live Monitor) needs sessions across the whole organisation,
// not just one team — closest-to-now first, since a live broadcast is
// almost always for a session happening right now or very soon.
export async function listRecentSessionsForOrganisation(
  organisationId: string,
): Promise<SessionWithTeam[]> {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("organisation_id", organisationId)
    .order("scheduled_at", { ascending: false })
    .limit(RECENT_SESSIONS_PAGE_SIZE);

  if (error) {
    console.error("[sessions] Failed to load recent sessions:", error);
    throw new Error("Failed to load recent sessions.");
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const teamIds = [...new Set(sessions.map((session) => session.team_id))];
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("organisation_id", organisationId)
    .in("id", teamIds);

  if (teamsError) {
    console.error(
      "[sessions] Failed to load teams for recent sessions:",
      teamsError,
    );
    throw new Error("Failed to load recent sessions.");
  }

  const teamNameById = new Map(
    (teams ?? []).map((team) => [team.id, team.name]),
  );

  return sessions.map((session) => ({
    ...mapSessionRow(session),
    teamName: teamNameById.get(session.team_id) ?? "Team",
  }));
}

export async function listSessionsForTeam(
  organisationId: string,
  teamId: string,
): Promise<Session[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("[sessions] Failed to load sessions:", error);
    throw new Error("Failed to load sessions.");
  }

  return (data ?? []).map(mapSessionRow);
}

export async function getSessionForOrganisation(
  organisationId: string,
  sessionId: string,
): Promise<Session | null> {
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[sessions] Failed to load session:", error);
    throw new Error("Failed to load session.");
  }

  if (!session) {
    return null;
  }

  return mapSessionRow(session);
}
