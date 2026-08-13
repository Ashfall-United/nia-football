import { Plus, Shield } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { listTeamsWithStatsForOrganisation } from "@/domain/teams/queries";
import { organisationTypeOptions } from "@/lib/validation/organisation";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CreateTeamForm } from "../create-team-form";
import { TeamCard, TeamCardGrid } from "./team-card";

export default async function TeamsPage(
  props: PageProps<"/org/[slug]/teams">,
) {
  const { slug } = await props.params;
  const membership = await requireOrganisationBySlug(slug);
  const teams = await listTeamsWithStatsForOrganisation(membership.id);
  const canManageTeams = ROSTER_MANAGEMENT_ROLES.includes(membership.role);
  const organisationTypeLabel =
    organisationTypeOptions.find(
      (option) => option.value === membership.organisationType,
    )?.label ?? membership.organisationType;

  return (
    <PageShell>
      <PageHeader
        title="Teams"
        icon={Shield}
        action={
          canManageTeams ? (
            <FormDialog
              triggerLabel="Add team"
              triggerIcon={<Plus className="size-4" />}
              title="Add a team"
            >
              <CreateTeamForm slug={slug} />
            </FormDialog>
          ) : undefined
        }
      />

      {teams.length > 0 ? (
        <TeamCardGrid>
          {teams.map((team) => (
            <li key={team.id}>
              <TeamCard
                team={team}
                slug={slug}
                logoUrl={membership.logoUrl}
                organisationTypeLabel={organisationTypeLabel}
              />
            </li>
          ))}
        </TeamCardGrid>
      ) : (
        <EmptyState
          icon={Shield}
          title="No teams yet"
          description={
            canManageTeams
              ? "Use the Add team button above to start building rosters and scheduling sessions."
              : "An owner, admin, or coach hasn't added any teams yet."
          }
        />
      )}
    </PageShell>
  );
}
