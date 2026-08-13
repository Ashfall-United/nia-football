"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { ROSTER_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getPlayerForOrganisation } from "@/domain/players/queries";
import { createClient } from "@/services/supabase/server";
import { createPlayerSchema, updatePlayerSchema } from "@/lib/validation/player";

export type PlayerActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

async function uploadPlayerPhoto(
  organisationId: string,
  photoFile: File,
): Promise<{ photoPath: string } | { fieldErrors: Record<string, string[]> }> {
  if (!photoFile.type.startsWith("image/")) {
    return { fieldErrors: { photo: ["Photo must be an image file."] } };
  }
  if (photoFile.size > MAX_PHOTO_BYTES) {
    return { fieldErrors: { photo: ["Photo must be smaller than 5MB."] } };
  }

  const supabase = await createClient();
  const extension = photoFile.name.split(".").pop() || "jpg";
  const photoPath = `${organisationId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("player-photos")
    .upload(photoPath, photoFile, { contentType: photoFile.type });

  if (uploadError) {
    return { fieldErrors: { photo: ["We couldn't upload the photo. Try again."] } };
  }

  return { photoPath };
}

export async function createPlayerAction(
  slug: string,
  teamId: string,
  _prevState: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const validated = createPlayerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    position: formData.get("position"),
    jerseyNumber: formData.get("jerseyNumber"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const photoFile = formData.get("photo");
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return { fieldErrors: { photo: ["A player photo is required."] } };
  }

  const uploadResult = await uploadPlayerPhoto(membership.id, photoFile);
  if ("fieldErrors" in uploadResult) {
    return { fieldErrors: uploadResult.fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({
    organisation_id: membership.id,
    team_id: teamId,
    first_name: validated.data.firstName,
    last_name: validated.data.lastName,
    date_of_birth: validated.data.dateOfBirth ?? null,
    position: validated.data.position ?? null,
    jersey_number: validated.data.jerseyNumber ?? null,
    photo_path: uploadResult.photoPath,
  });

  if (error) {
    return { error: "We couldn't add this player. Try again." };
  }

  revalidatePath(`/org/${slug}/teams/${teamId}`);
}

export async function updatePlayerAction(
  slug: string,
  teamId: string,
  playerId: string,
  _prevState: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const existing = await getPlayerForOrganisation(
    membership.id,
    teamId,
    playerId,
  );
  if (!existing) {
    return { error: "This player could not be found." };
  }

  const validated = updatePlayerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    position: formData.get("position"),
    jerseyNumber: formData.get("jerseyNumber"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  let photoPath = existing.photoPath;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const uploadResult = await uploadPlayerPhoto(membership.id, photoFile);
    if ("fieldErrors" in uploadResult) {
      return { fieldErrors: uploadResult.fieldErrors };
    }
    photoPath = uploadResult.photoPath;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({
      first_name: validated.data.firstName,
      last_name: validated.data.lastName,
      date_of_birth: validated.data.dateOfBirth ?? null,
      position: validated.data.position ?? null,
      jersey_number: validated.data.jerseyNumber ?? null,
      photo_path: photoPath,
    })
    .eq("id", playerId)
    .eq("organisation_id", membership.id)
    .eq("team_id", teamId);

  if (error) {
    return { error: "We couldn't update this player. Try again." };
  }

  if (photoPath !== existing.photoPath) {
    await supabase.storage.from("player-photos").remove([existing.photoPath]);
  }

  revalidatePath(`/org/${slug}/teams/${teamId}`);
}

export async function deletePlayerAction(
  slug: string,
  teamId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const membership = await requireOrganisationBySlug(
    slug,
    ROSTER_MANAGEMENT_ROLES,
  );

  const existing = await getPlayerForOrganisation(
    membership.id,
    teamId,
    playerId,
  );
  if (!existing) {
    return { error: "This player could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId)
    .eq("organisation_id", membership.id)
    .eq("team_id", teamId);

  if (error) {
    return { error: "We couldn't remove this player. Try again." };
  }

  await supabase.storage.from("player-photos").remove([existing.photoPath]);

  revalidatePath(`/org/${slug}/teams/${teamId}`);
  return {};
}
