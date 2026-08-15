import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import {
  getPlayerPhotoUrls,
  listPlayersForTeam,
} from "@/domain/players/queries";
import { positionLabelByValue } from "@/lib/validation/player";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; teamId: string }> },
) {
  const { slug, teamId } = await context.params;
  const membership = await requireOrganisationBySlug(slug);

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  const players = await listPlayersForTeam(membership.id, teamId);
  const photoUrls = await getPlayerPhotoUrls(
    players.map((player) => player.photoPath),
  );

  return NextResponse.json({
    teamName: team.name,
    canManageRoster: ROSTER_MANAGEMENT_ROLES.includes(membership.role),
    players: players.map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      jerseyNumber: player.jerseyNumber,
      position:
        player.position !== null
          ? (positionLabelByValue.get(player.position) ?? player.position)
          : null,
      photoUrl: photoUrls.get(player.photoPath) ?? null,
    })),
  });
}
