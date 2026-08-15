import { Plus, Shield, UserRound } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import {
  getPlayerPhotoUrls,
  listPlayersForTeam,
} from "@/domain/players/queries";
import { listTeamsForOrganisation } from "@/domain/teams/queries";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CreatePlayerForm } from "../teams/[teamId]/create-player-form";
import { CreateTeamForm } from "../create-team-form";
import { RosterView } from "./roster-view";

export default async function RosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { slug } = await params;
  const { team: teamParam } = await searchParams;
  const membership = await requireOrganisationBySlug(slug);
  const teams = await listTeamsForOrganisation(membership.id);
  const canManageRoster = ROSTER_MANAGEMENT_ROLES.includes(membership.role);

  if (teams.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Roster" icon={UserRound} />
        <EmptyState
          icon={Shield}
          title="No teams yet"
          description={
            canManageRoster
              ? "Add a team first, then build its roster here."
              : "An owner, admin, or coach hasn't added any teams yet."
          }
        />
        {canManageRoster ? (
          <div className="flex justify-center">
            <FormDialog triggerLabel="Add team" title="Add a team">
              <CreateTeamForm slug={slug} />
            </FormDialog>
          </div>
        ) : null}
      </PageShell>
    );
  }

  const selectedTeamId =
    typeof teamParam === "string" && teams.some((team) => team.id === teamParam)
      ? teamParam
      : teams[0]?.id;

  if (!selectedTeamId) {
    return (
      <PageShell>
        <PageHeader title="Roster" icon={UserRound} />
        <EmptyState
          icon={Shield}
          title="No teams yet"
          description={
            canManageRoster
              ? "Add a team first, then build its roster here."
              : "An owner, admin, or coach hasn't added any teams yet."
          }
        />
      </PageShell>
    );
  }

  const team = teams.find((item) => item.id === selectedTeamId) ?? teams[0];
  if (!team) {
    return (
      <PageShell>
        <PageHeader title="Roster" icon={UserRound} />
        <EmptyState
          icon={Shield}
          title="Team not found"
          description="Choose another team from the filter below."
        />
      </PageShell>
    );
  }

  const players = await listPlayersForTeam(membership.id, team.id);
  const photoUrls = await getPlayerPhotoUrls(
    players.map((player) => player.photoPath),
  );

  const rosterPlayers = players.map((player) => ({
    ...player,
    photoUrl: photoUrls.get(player.photoPath),
  }));

  return (
    <PageShell>
      <PageHeader
        title="Roster"
        description={team.name}
        icon={UserRound}
        action={
          canManageRoster ? (
            <FormDialog
              triggerLabel="Add player"
              triggerIcon={<Plus className="size-4" />}
              title="Add a player"
              wide
            >
              <CreatePlayerForm slug={slug} teamId={team.id} />
            </FormDialog>
          ) : undefined
        }
      />

      <RosterView
        slug={slug}
        teamId={team.id}
        teams={teams}
        players={rosterPlayers}
        canManageRoster={canManageRoster}
      />
    </PageShell>
  );
}
