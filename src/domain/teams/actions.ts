"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { createClient } from "@/services/supabase/server";
import { createTeamSchema } from "@/lib/validation/team";

export type CreateTeamActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

const UNIQUE_VIOLATION = "23505";

export async function createTeamAction(
  slug: string,
  _prevState: CreateTeamActionState,
  formData: FormData,
): Promise<CreateTeamActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const validated = createTeamSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    organisation_id: membership.id,
    name: validated.data.name,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        fieldErrors: { name: ["A team with this name already exists."] },
      };
    }
    return { error: "We couldn't create the team. Try again." };
  }

  revalidatePath(`/org/${slug}`);
  revalidatePath(`/org/${slug}/teams`);
}
