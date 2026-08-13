import { notFound } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getTeamForOrganisation } from "@/domain/teams/queries";
import { listSessionsForTeam } from "@/domain/sessions/queries";
import { countReadyVideosForSessions } from "@/domain/videos/queries";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CreateSessionForm } from "./create-session-form";
import { ManageSessionCard } from "./manage-session-card";
import { SessionCard, SessionCardGrid } from "./session-card";

export default async function SessionsPage(
  props: PageProps<"/org/[slug]/teams/[teamId]/sessions">,
) {
  const { slug, teamId } = await props.params;
  const membership = await requireOrganisationBySlug(slug);

  const team = await getTeamForOrganisation(membership.id, teamId);
  if (!team) {
    notFound();
  }

  const sessions = await listSessionsForTeam(membership.id, teamId);
  const readyVideoCountBySession = await countReadyVideosForSessions(
    membership.id,
    sessions.map((session) => session.id),
  );
  const canManageSessions = ROSTER_MANAGEMENT_ROLES.includes(membership.role);

  return (
    <PageShell>
      <PageHeader
        title={team.name}
        description="Sessions"
        icon={CalendarDays}
        action={
          canManageSessions ? (
            <FormDialog
              triggerLabel="Schedule session"
              triggerIcon={<Plus className="size-4" />}
              title="Schedule a session"
              wide
            >
              <CreateSessionForm slug={slug} teamId={teamId} />
            </FormDialog>
          ) : undefined
        }
      />

      {sessions.length > 0 ? (
        <SessionCardGrid>
          {sessions.map((session) => (
            <li key={session.id}>
              {canManageSessions ? (
                <ManageSessionCard
                  slug={slug}
                  teamId={teamId}
                  session={session}
                  readyVideos={
                    readyVideoCountBySession.get(session.id) ?? 0
                  }
                />
              ) : (
                <SessionCard
                  session={session}
                  slug={slug}
                  teamId={teamId}
                  readyVideos={
                    readyVideoCountBySession.get(session.id) ?? 0
                  }
                />
              )}
            </li>
          ))}
        </SessionCardGrid>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No sessions yet"
          description={
            canManageSessions
              ? "Use the Schedule session button above to add a training session or match."
              : "An owner, admin, or coach hasn't scheduled any sessions yet."
          }
        />
      )}
    </PageShell>
  );
}
