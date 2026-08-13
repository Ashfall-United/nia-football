import Link from "next/link";
import { getOrganisationInvitePreview } from "@/domain/members/queries";
import { getAuthenticatedUser } from "@/lib/auth/dal";
import { roleDescription, roleLabel } from "@/lib/validation/member";
import { AuthCard } from "@/components/auth-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AcceptInviteButton } from "./accept-invite-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getOrganisationInvitePreview(token);

  if (!invite) {
    return (
      <AuthCard
        title="Invite not found"
        description="This invite link is invalid or has already been used."
      >
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  if (invite.isAccepted) {
    return (
      <AuthCard
        title="Invite already used"
        description={`This invite to ${invite.organisationName} has already been accepted.`}
      >
        <Link
          href={`/org/${invite.organisationSlug}`}
          className={cn(buttonVariants(), "w-full")}
        >
          Open organisation
        </Link>
      </AuthCard>
    );
  }

  if (invite.isExpired) {
    return (
      <AuthCard
        title="Invite expired"
        description="Ask an owner or admin to send a new invite."
      >
        <Link href="/login" className={cn(buttonVariants(), "w-full")}>
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  const user = await getAuthenticatedUser();

  if (user) {
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return (
        <AuthCard
          title="Wrong account"
          description={`This invite was sent to ${invite.email}. Sign in with that email to join ${invite.organisationName}.`}
        >
          <Link href="/login" className={cn(buttonVariants(), "w-full")}>
            Sign in with another account
          </Link>
        </AuthCard>
      );
    }

    return (
      <AuthCard
        title={`Join ${invite.organisationName}`}
        description={`You've been invited as ${roleLabel(invite.role).toLowerCase()}. ${roleDescription(invite.role) ?? ""}`}
      >
        <AcceptInviteButton token={token} />
      </AuthCard>
    );
  }

  const signUpHref = `/sign-up?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/invite/${token}`)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <AuthCard
      title={`Join ${invite.organisationName}`}
      description={`You've been invited as ${roleLabel(invite.role).toLowerCase()} for ${invite.email}. Create an account or sign in to accept.`}
    >
      <div className="space-y-3">
        <Link href={signUpHref} className={cn(buttonVariants(), "w-full")}>
          Create account
        </Link>
        <Link
          href={loginHref}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Sign in
        </Link>
      </div>
    </AuthCard>
  );
}
