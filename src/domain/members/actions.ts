"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEMBER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { buildInviteUrl } from "@/domain/members/queries";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/validation/member";
import { createAdminClient } from "@/services/supabase/admin";
import { createClient } from "@/services/supabase/server";

export type MemberActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: {
        message: string;
        inviteUrl?: string;
      };
    }
  | undefined;

function revalidateStaffPage(slug: string) {
  revalidatePath(`/org/${slug}/staff`);
}

async function countOwners(
  organisationId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("organisation_members")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("role", "owner");

  if (error) {
    throw new Error("Failed to verify organisation owners.");
  }

  return count ?? 0;
}

export async function inviteMemberAction(
  slug: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );

  const validated = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const email = validated.data.email;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: existingUserId, error: lookupError } = await admin.rpc(
    "find_user_id_by_email",
    { user_email: email },
  );

  if (lookupError) {
    console.error("[members] User lookup failed:", lookupError);
    return { error: "We couldn't send the invite. Try again." };
  }

  if (existingUserId) {
    const { data: existingMember, error: memberLookupError } = await supabase
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", membership.id)
      .eq("user_id", existingUserId)
      .maybeSingle();

    if (memberLookupError) {
      console.error("[members] Membership lookup failed:", memberLookupError);
      return { error: "We couldn't add this person. Try again." };
    }

    if (existingMember) {
      return { error: "This person is already on your staff." };
    }

    const { error: insertError } = await supabase
      .from("organisation_members")
      .insert({
        organisation_id: membership.id,
        user_id: existingUserId,
        role: validated.data.role,
      });

    if (insertError) {
      console.error("[members] Direct add failed:", insertError);
      return { error: "We couldn't add this person. Try again." };
    }

    revalidateStaffPage(slug);
    return {
      success: {
        message: `${email} was added to your staff.`,
      },
    };
  }

  const { data: pendingInvite, error: pendingInviteError } = await supabase
    .from("organisation_invites")
    .select("id")
    .eq("organisation_id", membership.id)
    .ilike("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pendingInviteError) {
    console.error("[members] Pending invite lookup failed:", pendingInviteError);
    return { error: "We couldn't send the invite. Try again." };
  }

  if (pendingInvite) {
    return { error: "An invite is already pending for this email." };
  }

  const user = await requireAuthenticatedUser();

  const { data: invite, error: inviteError } = await supabase
    .from("organisation_invites")
    .insert({
      organisation_id: membership.id,
      email,
      role: validated.data.role,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (inviteError || !invite) {
    console.error("[members] Invite insert failed:", inviteError);
    return { error: "We couldn't send the invite. Try again." };
  }

  const inviteUrl = buildInviteUrl(invite.token);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error: authInviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/confirm?next=/invite/${invite.token}`,
    },
  );

  if (authInviteError) {
    console.error("[members] Supabase invite email failed:", authInviteError);
  }

  revalidateStaffPage(slug);

  return {
    success: {
      message: authInviteError
        ? "Invite created. Share the link below — the email could not be sent automatically."
        : "Invite sent. They'll also receive an email with a sign-up link.",
      inviteUrl,
    },
  };
}

export async function updateMemberRoleAction(
  slug: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );

  const validated = updateMemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { data: targetMember, error: targetError } = await supabase
    .from("organisation_members")
    .select("id, user_id, role")
    .eq("id", validated.data.memberId)
    .eq("organisation_id", membership.id)
    .maybeSingle();

  if (targetError || !targetMember) {
    return { error: "Staff member not found." };
  }

  if (targetMember.role === "owner") {
    return { error: "The owner role cannot be changed here." };
  }

  const { error: updateError } = await supabase
    .from("organisation_members")
    .update({ role: validated.data.role })
    .eq("id", validated.data.memberId)
    .eq("organisation_id", membership.id);

  if (updateError) {
    console.error("[members] Role update failed:", updateError);
    return { error: "We couldn't update this role. Try again." };
  }

  revalidateStaffPage(slug);
  return undefined;
}

export async function removeMemberAction(
  slug: string,
  memberId: string,
): Promise<MemberActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: targetMember, error: targetError } = await supabase
    .from("organisation_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("organisation_id", membership.id)
    .maybeSingle();

  if (targetError || !targetMember) {
    return { error: "Staff member not found." };
  }

  if (targetMember.user_id === user.id) {
    return { error: "You cannot remove yourself from the staff." };
  }

  if (targetMember.role === "owner") {
    const owners = await countOwners(membership.id);
    if (owners <= 1) {
      return { error: "Your organisation must keep at least one owner." };
    }
  }

  const { error: deleteError } = await supabase
    .from("organisation_members")
    .delete()
    .eq("id", memberId)
    .eq("organisation_id", membership.id);

  if (deleteError) {
    console.error("[members] Remove member failed:", deleteError);
    return { error: "We couldn't remove this person. Try again." };
  }

  revalidateStaffPage(slug);
  return undefined;
}

export async function revokeInviteAction(
  slug: string,
  inviteId: string,
): Promise<MemberActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEMBER_MANAGEMENT_ROLES,
  );
  const supabase = await createClient();

  const { error } = await supabase
    .from("organisation_invites")
    .delete()
    .eq("id", inviteId)
    .eq("organisation_id", membership.id)
    .is("accepted_at", null);

  if (error) {
    console.error("[members] Revoke invite failed:", error);
    return { error: "We couldn't revoke this invite. Try again." };
  }

  revalidateStaffPage(slug);
  return undefined;
}

export async function acceptInviteAction(
  token: string,
): Promise<MemberActionState> {
  await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: organisationSlug, error } = await supabase.rpc(
    "accept_organisation_invite",
    { invite_token: token },
  );

  if (error) {
    console.error("[members] Accept invite failed:", error);
    return {
      error:
        error.message.includes("different email")
          ? "Sign in with the email address this invite was sent to."
          : "This invite is invalid, expired, or already used.",
    };
  }

  if (!organisationSlug) {
    return { error: "This invite is invalid, expired, or already used." };
  }

  redirect(`/org/${organisationSlug}`);
}
