import { notFound } from "next/navigation";
import { Plus, UserRound } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import {
  listPlayersForTeam,
  getPlayerPhotoUrls,
} from "@/domain/players/queries";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CreatePlayerForm } from "./create-player-form";
import { PlayerCard, PlayerCardGrid } from "./player-card";
import { RosterPlayerCard } from "./roster-player-card";

export default async function TeamPage(
  props: PageProps<"/org/[slug]/teams/[teamId]">,
) {
  const { slug, teamId } = await props.params;
  const membership = await requireOrganisationBySlug(slug);

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  const players = await listPlayersForTeam(membership.id, teamId);
  const photoUrls = await getPlayerPhotoUrls(players.map((p) => p.photoPath));
  const canManageRoster = ROSTER_MANAGEMENT_ROLES.includes(membership.role);

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

      {players.length > 0 ? (
        <PlayerCardGrid>
          {players.map((player) => (
            <li key={player.id}>
              {canManageRoster ? (
                <RosterPlayerCard
                  slug={slug}
                  teamId={teamId}
                  player={player}
                  photoUrl={photoUrls.get(player.photoPath)}
                />
              ) : (
                <PlayerCard
                  player={player}
                  photoUrl={photoUrls.get(player.photoPath)}
                />
              )}
            </li>
          ))}
        </PlayerCardGrid>
      ) : (
        <EmptyState
          icon={UserRound}
          title="No players yet"
          description={
            canManageRoster
              ? "Use the Add player button above to start building this team's roster."
              : "An owner, admin, or coach hasn't added any players yet."
          }
        />
      )}
    </PageShell>
  );
}
