import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import {
  listPlayersForTeam,
  getPlayerPhotoUrls,
} from "@/domain/players/queries";
import { TeamRosterSidebar } from "@/components/team-roster-sidebar";
import { TeamWorkspaceShell } from "./team-workspace-shell";

export default async function TeamLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const membership = await requireOrganisationBySlug(slug);

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  const players = await listPlayersForTeam(membership.id, teamId);
  const photoUrls = await getPlayerPhotoUrls(players.map((player) => player.photoPath));
  const canManageRoster = ROSTER_MANAGEMENT_ROLES.includes(membership.role);

  const rosterPlayers = players.map((player) => ({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    photoUrl: photoUrls.get(player.photoPath),
  }));

  return (
    <TeamWorkspaceShell
      slug={slug}
      teamId={teamId}
      roster={
        <TeamRosterSidebar
          slug={slug}
          teamId={teamId}
          teamName={team.name}
          players={rosterPlayers}
          canManageRoster={canManageRoster}
        />
      }
    >
      {children}
    </TeamWorkspaceShell>
  );
}
