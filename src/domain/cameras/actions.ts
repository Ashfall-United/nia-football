"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { MEDIA_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { createClient } from "@/services/supabase/server";
import { CloudflareStreamService } from "@/services/cloudflare/stream";
import { createCameraSchema, updateCameraSchema } from "@/lib/validation/camera";
import { getSessionForOrganisation } from "@/domain/sessions/queries";
import { getCameraForOrganisation } from "./queries";

export type CameraActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export type CreateCameraActionState = CameraActionState;

const UNIQUE_VIOLATION = "23505";

export async function createCameraAction(
  slug: string,
  _prevState: CreateCameraActionState,
  formData: FormData,
): Promise<CreateCameraActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const validated = createCameraSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cameras").insert({
    organisation_id: membership.id,
    name: validated.data.name,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        fieldErrors: { name: ["A camera with this name already exists."] },
      };
    }
    console.error("[cameras] Failed to create camera:", error);
    return { error: "We couldn't add this camera. Try again." };
  }

  revalidatePath(`/org/${slug}/cameras`);
}

export async function updateCameraAction(
  slug: string,
  cameraId: string,
  _prevState: CameraActionState,
  formData: FormData,
): Promise<CameraActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const existing = await getCameraForOrganisation(membership.id, cameraId);
  if (!existing) {
    return { error: "This camera could not be found." };
  }

  const validated = updateCameraSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cameras")
    .update({ name: validated.data.name })
    .eq("id", cameraId)
    .eq("organisation_id", membership.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        fieldErrors: { name: ["A camera with this name already exists."] },
      };
    }
    console.error("[cameras] Failed to update camera:", error);
    return { error: "We couldn't update this camera. Try again." };
  }

  revalidatePath(`/org/${slug}/cameras`);
}

export async function deleteCameraAction(
  slug: string,
  cameraId: string,
): Promise<{ error?: string }> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const existing = await getCameraForOrganisation(membership.id, cameraId);
  if (!existing) {
    return { error: "This camera could not be found." };
  }

  if (existing.streamLiveInputId) {
    try {
      await CloudflareStreamService.deleteLiveInput(existing.streamLiveInputId);
    } catch (cloudflareError) {
      console.error(
        "[cameras] Failed to delete Cloudflare Stream live input:",
        cloudflareError,
      );
      return {
        error:
          "We couldn't disconnect this camera from Stream. Try again or contact support.",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cameras")
    .delete()
    .eq("id", cameraId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[cameras] Failed to delete camera:", error);
    return { error: "We couldn't remove this camera. Try again." };
  }

  revalidatePath(`/org/${slug}/cameras`);
  return {};
}

export type SetCameraActiveSessionActionState = { error?: string } | undefined;

// Sets (or clears, with sessionId null) which session this camera's next
// live recording should be filed under. The Cloudflare Stream webhook
// reads this when a live recording finishes — see
// domain/cameras/live-recording.ts.
export async function setCameraActiveSessionAction(
  slug: string,
  cameraId: string,
  sessionId: string | null,
): Promise<SetCameraActiveSessionActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const camera = await getCameraForOrganisation(membership.id, cameraId);
  if (!camera) {
    return { error: "We couldn't find this camera." };
  }

  if (sessionId) {
    const session = await getSessionForOrganisation(membership.id, sessionId);
    if (!session) {
      return { error: "We couldn't find this session." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cameras")
    .update({ active_session_id: sessionId })
    .eq("id", cameraId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[cameras] Failed to set camera active session:", error);
    return { error: "We couldn't update this camera. Try again." };
  }

  revalidatePath(`/org/${slug}/live`);
}

export type ConnectCameraActionState = { error?: string } | undefined;

export async function connectCameraToStreamAction(
  slug: string,
  cameraId: string,
  _prevState: ConnectCameraActionState,
  _formData: FormData,
): Promise<ConnectCameraActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    MEDIA_MANAGEMENT_ROLES,
  );

  const camera = await getCameraForOrganisation(membership.id, cameraId);
  if (!camera) {
    return { error: "We couldn't find this camera." };
  }

  let liveInputId: string;
  try {
    const liveInput = await CloudflareStreamService.createLiveInput(
      camera.name,
    );
    liveInputId = liveInput.uid;
  } catch (cloudflareError) {
    console.error(
      "[cameras] Failed to create Cloudflare Stream live input:",
      cloudflareError,
    );
    return {
      error: "We couldn't connect this camera. Check the connection and try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cameras")
    .update({ stream_live_input_id: liveInputId })
    .eq("id", cameraId)
    .eq("organisation_id", membership.id);

  if (error) {
    console.error("[cameras] Failed to save live input id:", error);
    return { error: "We couldn't connect this camera. Try again." };
  }

  revalidatePath(`/org/${slug}/cameras`);
}
