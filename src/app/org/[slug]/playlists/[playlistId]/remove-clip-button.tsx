"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import {
  removeClipFromPlaylistAction,
  type PlaylistActionState,
} from "@/domain/playlists/actions";
import { Button } from "@/components/ui/button";

const initialState: PlaylistActionState = undefined;

export function RemoveClipButton({
  slug,
  playlistId,
  clipId,
}: {
  slug: string;
  playlistId: string;
  clipId: string;
}) {
  const boundAction = removeClipFromPlaylistAction.bind(null, slug, playlistId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  return (
    <form action={action}>
      <input type="hidden" name="clipId" value={clipId} />
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        aria-label="Remove clip from playlist"
      >
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
      {state?.error ? (
        <p className="sr-only">{state.error}</p>
      ) : null}
    </form>
  );
}
