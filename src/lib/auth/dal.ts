import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import type { OrganisationRole } from "@/types/database";

// Re-verifies the session against Supabase Auth (not just a local cookie
// decode), so this is safe to treat as the source of truth for "is this
// request authenticated".
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

export const requireAuthenticatedUser = cache(async () => {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

// Verifies the caller belongs to the given organisation — and, if `roles`
// is passed, that their role is one of them — by querying
// organisation_members directly rather than trusting anything the caller
// sent. Every route or action that touches organisation-scoped data must
// go through this (or rely on RLS doing the equivalent check at the DB).
export async function requireOrganisationMembership(
  organisationId: string,
  roles?: OrganisationRole[],
) {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: membership, error } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    redirect("/dashboard");
  }

  if (roles && !roles.includes(membership.role)) {
    redirect("/dashboard");
  }

  return { user, role: membership.role };
}
