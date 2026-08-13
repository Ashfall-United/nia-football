import "server-only";
import { createClient } from "@/services/supabase/server";
import type { Player } from "./types";

const PHOTO_SIGNED_URL_TTL_SECONDS = 3600;

export async function listPlayersForTeam(
  organisationId: string,
  teamId: string,
): Promise<Player[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("players")
    .select(
      "id, organisation_id, team_id, first_name, last_name, date_of_birth, position, jersey_number, photo_path, created_at",
    )
    .eq("organisation_id", organisationId)
    .eq("team_id", teamId)
    .order("last_name");

  if (error) {
    console.error("[players] Failed to load players:", error);
    throw new Error("Failed to load players.");
  }

  return (data ?? []).map((player) => ({
    id: player.id,
    organisationId: player.organisation_id,
    teamId: player.team_id,
    firstName: player.first_name,
    lastName: player.last_name,
    dateOfBirth: player.date_of_birth,
    position: player.position,
    jerseyNumber: player.jersey_number,
    photoPath: player.photo_path,
    createdAt: player.created_at,
  }));
}

export async function getPlayerForOrganisation(
  organisationId: string,
  teamId: string,
  playerId: string,
): Promise<Player | null> {
  const supabase = await createClient();

  const { data: player, error } = await supabase
    .from("players")
    .select(
      "id, organisation_id, team_id, first_name, last_name, date_of_birth, position, jersey_number, photo_path, created_at",
    )
    .eq("organisation_id", organisationId)
    .eq("team_id", teamId)
    .eq("id", playerId)
    .maybeSingle();

  if (error) {
    console.error("[players] Failed to load player:", error);
    throw new Error("Failed to load player.");
  }

  if (!player) {
    return null;
  }

  return {
    id: player.id,
    organisationId: player.organisation_id,
    teamId: player.team_id,
    firstName: player.first_name,
    lastName: player.last_name,
    dateOfBirth: player.date_of_birth,
    position: player.position,
    jerseyNumber: player.jersey_number,
    photoPath: player.photo_path,
    createdAt: player.created_at,
  };
}

// Player photos live in a private bucket, so every display needs a
// short-lived signed URL rather than a permanent public one.
export async function getPlayerPhotoUrls(
  photoPaths: string[],
): Promise<Map<string, string>> {
  if (photoPaths.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("player-photos")
    .createSignedUrls(photoPaths, PHOTO_SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return new Map();
  }

  return new Map(
    data
      .filter(
        (entry): entry is typeof entry & { signedUrl: string } =>
          Boolean(entry.signedUrl) && !entry.error,
      )
      .map((entry) => [entry.path ?? "", entry.signedUrl]),
  );
}
