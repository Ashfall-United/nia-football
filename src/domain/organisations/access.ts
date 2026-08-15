import "server-only";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { getOrganisationBySlugForUser } from "./queries";
import type { OrganisationRole } from "@/types/database";
import type { OrganisationMembership } from "./types";

export class OrganisationAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganisationAccessError";
  }
}

// Resolves an organisation by slug for the current user and verifies
// membership (and, if `roles` is passed, role) the same way
// requireOrganisationMembership does by id — every org-scoped route
// handler or page should go through one of the two.
export async function requireOrganisationBySlug(
  slug: string,
  roles?: OrganisationRole[],
): Promise<OrganisationMembership> {
  const user = await requireAuthenticatedUser();
  const membership = await getOrganisationBySlugForUser(slug, user.id);

  if (!membership) {
    redirect("/dashboard");
  }

  if (roles && !roles.includes(membership.role)) {
    redirect("/dashboard");
  }

  return membership;
}

/** For server actions — returns an error message instead of redirecting. */
export async function requireOrganisationBySlugForAction(
  slug: string,
  roles?: OrganisationRole[],
): Promise<OrganisationMembership> {
  const user = await requireAuthenticatedUser();
  const membership = await getOrganisationBySlugForUser(slug, user.id);

  if (!membership) {
    throw new OrganisationAccessError(
      "You don't have access to this organisation.",
    );
  }

  if (roles && !roles.includes(membership.role)) {
    throw new OrganisationAccessError(
      "You don't have permission to perform this action.",
    );
  }

  return membership;
}
