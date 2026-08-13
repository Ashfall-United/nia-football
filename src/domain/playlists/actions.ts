"use server";

import { revalidatePath } from "next/cache";
import { requireOrganisationBySlug } from "@/domain/organisations/access";
import { PLAYLIST_MANAGEMENT_ROLES } from "@/domain/organisations/roles";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import {
  addClipToPlaylistSchema,
  createPlaylistSchema,
  removeClipFromPlaylistSchema,
} from "@/lib/validation/playlist";
import { createClient } from "@/services/supabase/server";
import { getPlaylistForOrganisation, listClipIdsInPlaylist } from "./queries";

export type PlaylistActionState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: {
        playlistId?: string;
      };
    }
  | undefined;

function revalidatePlaylistPaths(slug: string, playlistId?: string) {
  revalidatePath(`/org/${slug}/playlists`);
  if (playlistId) {
    revalidatePath(`/org/${slug}/playlists/${playlistId}`);
  }
}

export async function createPlaylistAction(
  slug: string,
  _prevState: PlaylistActionState,
  formData: FormData,
): Promise<PlaylistActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    PLAYLIST_MANAGEMENT_ROLES,
  );
  const user = await requireAuthenticatedUser();

  const validated = createPlaylistSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      organisation_id: membership.id,
      title: validated.data.title,
      description: validated.data.description ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[playlists] Failed to create playlist:", error);
    return { error: "We couldn't create this playlist. Try again." };
  }

  revalidatePlaylistPaths(slug);
  return { success: { playlistId: data.id } };
}

export async function addClipToPlaylistAction(
  slug: string,
  playlistId: string,
  _prevState: PlaylistActionState,
  formData: FormData,
): Promise<PlaylistActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    PLAYLIST_MANAGEMENT_ROLES,
  );

  const validated = addClipToPlaylistSchema.safeParse({
    clipId: formData.get("clipId"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const playlist = await getPlaylistForOrganisation(membership.id, playlistId);
  if (!playlist) {
    return { error: "This playlist could not be found." };
  }

  const existingClipIds = await listClipIdsInPlaylist(playlistId);
  if (existingClipIds.has(validated.data.clipId)) {
    return { error: "This clip is already in the playlist." };
  }

  const supabase = await createClient();

  const { data: clip, error: clipError } = await supabase
    .from("clips")
    .select("id")
    .eq("organisation_id", membership.id)
    .eq("id", validated.data.clipId)
    .maybeSingle();

  if (clipError || !clip) {
    return { error: "This clip could not be found." };
  }

  const nextPosition = playlist.clips.length;

  const { error } = await supabase.from("playlist_clips").insert({
    playlist_id: playlistId,
    clip_id: validated.data.clipId,
    position: nextPosition,
  });

  if (error) {
    console.error("[playlists] Failed to add clip:", error);
    return { error: "We couldn't add this clip. Try again." };
  }

  revalidatePlaylistPaths(slug, playlistId);
  return undefined;
}

export async function removeClipFromPlaylistAction(
  slug: string,
  playlistId: string,
  _prevState: PlaylistActionState,
  formData: FormData,
): Promise<PlaylistActionState> {
  const membership = await requireOrganisationBySlug(
    slug,
    PLAYLIST_MANAGEMENT_ROLES,
  );

  const validated = removeClipFromPlaylistSchema.safeParse({
    clipId: formData.get("clipId"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const playlist = await getPlaylistForOrganisation(membership.id, playlistId);
  if (!playlist) {
    return { error: "This playlist could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("playlist_clips")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("clip_id", validated.data.clipId);

  if (error) {
    console.error("[playlists] Failed to remove clip:", error);
    return { error: "We couldn't remove this clip. Try again." };
  }

  revalidatePlaylistPaths(slug, playlistId);
  return undefined;
}
