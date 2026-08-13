import "server-only";
import { createClient } from "@/services/supabase/server";
import { createAdminClient } from "@/services/supabase/admin";
import {
  resolveMemberAvatarUrl,
  resolveMemberDisplayName,
} from "@/lib/member/avatar";
import { gravatarUrl } from "@/lib/member/gravatar";
import type {
  OrganisationInvite,
  OrganisationInvitePreview,
  OrganisationMember,
} from "./types";

function logSupabaseError(context: string, error: unknown) {
  console.error(context, error);
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if ("message" in record) console.error(`${context} message:`, record.message);
    if ("code" in record) console.error(`${context} code:`, record.code);
    if ("details" in record) console.error(`${context} details:`, record.details);
  }
}

export async function listMembersForOrganisation(
  organisationId: string,
): Promise<OrganisationMember[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("organisation_members")
    .select("id, user_id, role, created_at")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseError("[members] Failed to load members:", error);
    throw new Error("Failed to load staff members.");
  }

  if (!members || members.length === 0) {
    return [];
  }

  const admin = createAdminClient();

  return Promise.all(
    members.map(async (member) => {
      const { data, error: userError } = await admin.auth.admin.getUserById(
        member.user_id,
      );

      if (userError) {
        logSupabaseError(
          `[members] Failed to load email for ${member.user_id}:`,
          userError,
        );
      }

      const email = data.user?.email ?? "Unknown";

      return {
        id: member.id,
        userId: member.user_id,
        email,
        displayName: resolveMemberDisplayName(email, data.user),
        avatarUrl: resolveMemberAvatarUrl(email, data.user),
        role: member.role,
        createdAt: member.created_at,
      };
    }),
  );
}

export async function listPendingInvitesForOrganisation(
  organisationId: string,
): Promise<OrganisationInvite[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organisation_invites")
    .select("id, email, role, token, expires_at, created_at")
    .eq("organisation_id", organisationId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("[members] Failed to load invites:", error);
    throw new Error("Failed to load pending invites.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    avatarUrl: gravatarUrl(row.email),
    role: row.role,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function getOrganisationInvitePreview(
  token: string,
): Promise<OrganisationInvitePreview | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_organisation_invite_preview", {
    invite_token: token,
  });

  if (error) {
    logSupabaseError("[members] Failed to load invite preview:", error);
    throw new Error("Failed to load invite.");
  }

  const row = data?.[0];
  if (!row) {
    return null;
  }

  return {
    organisationName: row.organisation_name,
    organisationSlug: row.organisation_slug,
    role: row.role,
    email: row.email,
    isExpired: row.is_expired,
    isAccepted: row.is_accepted,
  };
}

export function buildInviteUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl.replace(/\/$/, "")}/invite/${token}`;
}
