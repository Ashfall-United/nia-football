"use server";

import {
  OrganisationAccessError,
  requireOrganisationBySlugForAction,
} from "@/domain/organisations/access";
import { SHARE_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { getPlaylistForOrganisation } from "@/domain/playlists/queries";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { createShareLinkSchema } from "@/lib/validation/share";
import { createClient } from "@/services/supabase/server";
import {
  isMissingSchemaError,
  logSupabaseError,
} from "@/lib/supabase/errors";
import { buildShareUrl } from "./queries";

export type ShareActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: {
        shareUrl: string;
      };
    }
  | undefined;

export async function createShareLinkAction(
  slug: string,
  _prevState: ShareActionState,
  formData: FormData,
): Promise<ShareActionState> {
  try {
    const membership = await requireOrganisationBySlugForAction(
      slug,
      SHARE_MANAGEMENT_ROLES,
    );
    const user = await requireAuthenticatedUser();

    const validated = createShareLinkSchema.safeParse({
      resourceType: formData.get("resourceType"),
      resourceId: formData.get("resourceId"),
    });

    if (!validated.success) {
      return { fieldErrors: validated.error.flatten().fieldErrors };
    }

    const { resourceType, resourceId } = validated.data;
    const supabase = await createClient();

    if (resourceType === "clip") {
      const { data: clip, error: clipError } = await supabase
        .from("clips")
        .select("id")
        .eq("organisation_id", membership.id)
        .eq("id", resourceId)
        .maybeSingle();

      if (clipError || !clip) {
        return { error: "This clip could not be found." };
      }
    } else {
      const playlist = await getPlaylistForOrganisation(
        membership.id,
        resourceId,
      );
      if (!playlist) {
        return { error: "This playlist could not be found." };
      }
    }

    const { data, error } = await supabase
      .from("shared_links")
      .insert({
        organisation_id: membership.id,
        resource_type: resourceType,
        resource_id: resourceId,
        created_by: user.id,
      })
      .select("token")
      .single();

    if (error || !data) {
      if (error && isMissingSchemaError(error)) {
        return {
          error:
            "Share links need a database update. Run supabase db push from the project root, then try again.",
        };
      }
      logSupabaseError("[shares] Failed to create share link:", error ?? {});
      return { error: "We couldn't create a share link. Try again." };
    }

    return {
      success: {
        shareUrl: buildShareUrl(data.token),
      },
    };
  } catch (accessError) {
    if (accessError instanceof OrganisationAccessError) {
      return {
        error:
          "Only owners, admins, coaches, and analysts can create share links.",
      };
    }
    throw accessError;
  }
}
