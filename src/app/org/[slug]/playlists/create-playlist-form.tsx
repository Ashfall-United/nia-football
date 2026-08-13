"use client";

import { useActionState } from "react";
import {
  createPlaylistAction,
  type PlaylistActionState,
} from "@/domain/playlists/actions";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: PlaylistActionState = undefined;

export function CreatePlaylistForm({ slug }: { slug: string }) {
  const boundAction = createPlaylistAction.bind(null, slug);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error || state?.fieldErrors), close);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="playlist-title">Title</Label>
        <Input
          id="playlist-title"
          name="title"
          placeholder="Set piece patterns"
          required
        />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.title[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="playlist-description">Description (optional)</Label>
        <Textarea
          id="playlist-description"
          name="description"
          placeholder="Clips to review before the next match"
          rows={3}
        />
        {state?.fieldErrors?.description && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.description[0]}
          </p>
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create playlist"}
      </Button>
    </form>
  );
}
