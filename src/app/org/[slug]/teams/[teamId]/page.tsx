import { notFound } from "next/navigation";
import { Plus, UserRound } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getTeamForOrganisation, listTeamsForOrganisation } from "@/domain/teams/queries";
import {
  listPlayersForTeam,
  getPlayerPhotoUrls,
} from "@/domain/players/queries";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CreatePlayerForm } from "./create-player-form";
import { RosterView } from "./roster-view";

export default async function TeamPage(
  props: PageProps<"/org/[slug]/teams/[teamId]">,
) {
  const { slug, teamId } = await props.params;
  const membership = await requireOrganisationBySlug(slug);

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  const teams = await listTeamsForOrganisation(membership.id);
  const players = await listPlayersForTeam(membership.id, teamId);
  const photoUrls = await getPlayerPhotoUrls(players.map((p) => p.photoPath));
  const canManageRoster = ROSTER_MANAGEMENT_ROLES.includes(membership.role);

  const rosterPlayers = players.map((player) => ({
    ...player,
    photoUrl: photoUrls.get(player.photoPath),
  }));

  return (
    <PageShell>
      <PageHeader
        title={team.name}
        description="Roster"
        icon={UserRound}
        action={
          canManageRoster ? (
            <FormDialog
              triggerLabel="Add player"
              triggerIcon={<Plus className="size-4" />}
              title="Add a player"
              wide
            >
              <CreatePlayerForm slug={slug} teamId={teamId} />
            </FormDialog>
          ) : undefined
        }
      />

      <RosterView
        slug={slug}
        teamId={teamId}
        teams={teams}
        players={rosterPlayers}
        canManageRoster={canManageRoster}
      />
    </PageShell>
  );
}
