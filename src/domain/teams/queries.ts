import "server-only";
import { createClient } from "@/services/supabase/server";
import type { Team, TeamWithStats } from "./types";

export async function listTeamsForOrganisation(
  organisationId: string,
): Promise<Team[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, organisation_id, name, created_at")
    .eq("organisation_id", organisationId)
    .order("name");

  if (error) {
    console.error("[teams] Failed to load teams:", error);
    throw new Error("Failed to load teams.");
  }

  return (data ?? []).map((team) => ({
    id: team.id,
    organisationId: team.organisation_id,
    name: team.name,
    createdAt: team.created_at,
  }));
}

export async function listTeamsWithStatsForOrganisation(
  organisationId: string,
): Promise<TeamWithStats[]> {
  const teams = await listTeamsForOrganisation(organisationId);
  if (teams.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const teamIds = teams.map((team) => team.id);

  const [{ data: players, error: playersError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      supabase
        .from("players")
        .select("team_id")
        .eq("organisation_id", organisationId)
        .in("team_id", teamIds),
      supabase
        .from("sessions")
        .select("team_id")
        .eq("organisation_id", organisationId)
        .in("team_id", teamIds),
    ]);

  if (playersError || sessionsError) {
    console.error("[teams] Failed to load team stats:", {
      playersError,
      sessionsError,
    });
    throw new Error("Failed to load teams.");
  }

  const playerCountByTeam = new Map<string, number>();
  for (const player of players ?? []) {
    if (!player.team_id) continue;
    playerCountByTeam.set(
      player.team_id,
      (playerCountByTeam.get(player.team_id) ?? 0) + 1,
    );
  }

  const sessionCountByTeam = new Map<string, number>();
  for (const session of sessions ?? []) {
    sessionCountByTeam.set(
      session.team_id,
      (sessionCountByTeam.get(session.team_id) ?? 0) + 1,
    );
  }

  return teams.map((team) => ({
    ...team,
    playerCount: playerCountByTeam.get(team.id) ?? 0,
    sessionCount: sessionCountByTeam.get(team.id) ?? 0,
  }));
}

export async function getTeamForOrganisation(
  organisationId: string,
  teamId: string,
): Promise<Team | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, organisation_id, name, created_at")
    .eq("organisation_id", organisationId)
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    console.error("[teams] Failed to load team:", error);
    throw new Error("Failed to load team.");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    organisationId: data.organisation_id,
    name: data.name,
    createdAt: data.created_at,
  };
}
