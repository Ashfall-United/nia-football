import { Clock, Plus, UserCheck, Users, UserCog, Video } from "lucide-react";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEMBER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import {
  buildInviteUrl,
  listMembersForOrganisation,
  listPendingInvitesForOrganisation,
} from "@/domain/members/queries";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "@/components/form-dialog";
import {
  ListPanel,
  PageHeader,
  PageShell,
  SectionHeading,
  SummaryStatCard,
} from "@/components/page-shell";
import { InviteMemberForm } from "./invite-member-form";
import { MemberRow, PendingInviteRow } from "./member-row";

function countByRole(
  members: Awaited<ReturnType<typeof listMembersForOrganisation>>,
  role: string,
) {
  return members.filter((member) => member.role === role).length;
}

export default async function StaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );
  const user = await requireAuthenticatedUser();

  const [members, pendingInvites] = await Promise.all([
    listMembersForOrganisation(membership.id),
    listPendingInvitesForOrganisation(membership.id),
  ]);

  const coachCount = countByRole(members, "coach");
  const mediaCount = countByRole(members, "media");

  return (
    <PageShell>
      <PageHeader
        title="Staff"
        titleCase="sentence"
        icon={Users}
        description="Manage coaches, analysts, media, and viewers for your organisation."
        action={
          <FormDialog
            triggerLabel="Invite member"
            triggerIcon={<Plus className="size-4" />}
            title="Invite a staff member"
            description="Add coaches, analysts, media staff, or viewers to your organisation."
          >
            <InviteMemberForm slug={slug} />
          </FormDialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard
          icon={Users}
          label="Active staff"
          value={members.length}
          hint="People with access today"
        />
        <SummaryStatCard
          icon={Clock}
          label="Pending invites"
          value={pendingInvites.length}
          hint="Awaiting sign-up"
          accentClassName="bg-amber-500/10 [&_svg]:text-amber-700"
        />
        <SummaryStatCard
          icon={UserCog}
          label="Coaches"
          value={coachCount}
          hint="Roster and session access"
          accentClassName="bg-emerald-500/10 [&_svg]:text-emerald-600"
        />
        <SummaryStatCard
          icon={Video}
          label="Media"
          value={mediaCount}
          hint="Camera and capture access"
          accentClassName="bg-sky-500/10 [&_svg]:text-sky-600"
        />
      </div>

      <div className="space-y-8">
        <section className="space-y-3">
          <SectionHeading icon={UserCheck}>Active members</SectionHeading>
          {members.length > 0 ? (
            <ListPanel>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  slug={slug}
                  member={member}
                  currentUserId={user.id}
                  canManage
                />
              ))}
            </ListPanel>
          ) : (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Invite coaches, analysts, or media staff to get started."
            />
          )}
        </section>

        {pendingInvites.length > 0 ? (
          <section className="space-y-3">
            <SectionHeading icon={Clock}>Pending invites</SectionHeading>
            <ListPanel>
              {pendingInvites.map((invite) => (
                <PendingInviteRow
                  key={invite.id}
                  slug={slug}
                  inviteId={invite.id}
                  email={invite.email}
                  avatarUrl={invite.avatarUrl}
                  role={invite.role}
                  inviteUrl={buildInviteUrl(invite.token)}
                />
              ))}
            </ListPanel>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
