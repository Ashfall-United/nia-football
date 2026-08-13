"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { createClient } from "@/services/supabase/server";
import {
  createSessionSchema,
  updateSessionSchema,
} from "@/lib/validation/session";

export type SessionActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export type CreateSessionActionState = SessionActionState;

function sessionRowFromValidated(
  data: Extract<
    import("@/lib/validation/session").CreateSessionInput,
    { type: "training" | "match" }
  >,
) {
  return {
    type: data.type,
    scheduled_at: new Date(data.scheduledAt).toISOString(),
    location: data.location ?? null,
    pitch_surface: data.pitchSurface ?? null,
    notes: data.notes ?? null,
    opponent_name: data.type === "match" ? data.opponentName : null,
    is_home: data.type === "match" ? data.isHome : null,
    competition: data.type === "match" ? (data.competition ?? null) : null,
    team_score: data.type === "match" ? (data.teamScore ?? null) : null,
    opponent_score:
      data.type === "match" ? (data.opponentScore ?? null) : null,
  };
}

export async function createSessionAction(
  slug: string,
  teamId: string,
  _prevState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const validated = createSessionSchema.safeParse({
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
    pitchSurface: formData.get("pitchSurface"),
    notes: formData.get("notes"),
    opponentName: formData.get("opponentName"),
    isHome: formData.get("isHome"),
    competition: formData.get("competition"),
    teamScore: formData.get("teamScore"),
    opponentScore: formData.get("opponentScore"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").insert({
    organisation_id: membership.id,
    team_id: teamId,
    ...sessionRowFromValidated(validated.data),
  });

  if (error) {
    console.error("[sessions] Failed to create session:", error);
    return { error: "We couldn't create the session. Try again." };
  }

  redirect(`/org/${slug}/teams/${teamId}/sessions`);
}

export async function updateSessionAction(
  slug: string,
  teamId: string,
  sessionId: string,
  _prevState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const existing = await getSessionForOrganisation(membership.id, sessionId);
  if (!existing || existing.teamId !== teamId) {
    return { error: "This session could not be found." };
  }

  const validated = updateSessionSchema.safeParse({
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
    pitchSurface: formData.get("pitchSurface"),
    notes: formData.get("notes"),
    opponentName: formData.get("opponentName"),
    isHome: formData.get("isHome"),
    competition: formData.get("competition"),
    teamScore: formData.get("teamScore"),
    opponentScore: formData.get("opponentScore"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.type !== existing.type) {
    return {
      error: "Session type can't be changed. Create a new session instead.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update(sessionRowFromValidated(validated.data))
    .eq("id", sessionId)
    .eq("organisation_id", membership.id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[sessions] Failed to update session:", error);
    return { error: "We couldn't update this session. Try again." };
  }

  revalidatePath(`/org/${slug}/teams/${teamId}/sessions`);
  revalidatePath(`/org/${slug}/teams/${teamId}/sessions/${sessionId}`);
}

export async function deleteSessionAction(
  slug: string,
  teamId: string,
  sessionId: string,
): Promise<{ error?: string }> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const existing = await getSessionForOrganisation(membership.id, sessionId);
  if (!existing || existing.teamId !== teamId) {
    return { error: "This session could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("organisation_id", membership.id)
    .eq("team_id", teamId);

  if (error) {
    console.error("[sessions] Failed to delete session:", error);
    return { error: "We couldn't remove this session. Try again." };
  }

  revalidatePath(`/org/${slug}/teams/${teamId}/sessions`);
  revalidatePath(`/org/${slug}/clips`);
  redirect(`/org/${slug}/teams/${teamId}/sessions`);
}
