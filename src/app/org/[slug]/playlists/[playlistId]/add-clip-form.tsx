"use client";

import { useActionState } from "react";
import {
  addClipToPlaylistAction,
  type PlaylistActionState,
} from "@/domain/playlists/actions";
import type { ClipWithContext } from "@/domain/clips/types";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: PlaylistActionState = undefined;

function formatClipLabel(clip: ClipWithContext): string {
  const duration = Math.max(0, clip.endSeconds - clip.startSeconds);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return `${clip.title} · ${clip.teamName} · ${durationLabel}`;
}

export function AddClipToPlaylistForm({
  slug,
  playlistId,
  availableClips,
}: {
  slug: string;
  playlistId: string;
  availableClips: ClipWithContext[];
}) {
  const boundAction = addClipToPlaylistAction.bind(null, slug, playlistId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error || state?.fieldErrors), close);

  if (availableClips.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All organisation clips are already in this playlist, or you haven&apos;t
        saved any clips yet.
      </p>
    );
  }

  const clipOptions = availableClips.map((clip) => ({
    value: clip.id,
    label: formatClipLabel(clip),
  }));

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clipId">Clip</Label>
        <Select name="clipId" items={clipOptions} required>
          <SelectTrigger id="clipId">
            <SelectValue placeholder="Choose a clip" />
          </SelectTrigger>
          <SelectContent>
            {clipOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.fieldErrors?.clipId && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.clipId[0]}
          </p>
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add clip"}
      </Button>
    </form>
  );
}
