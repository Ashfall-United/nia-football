"use client";

import { useActionState, useState } from "react";
import {
  createClipAction,
  type CreateClipActionState,
} from "@/domain/clips/actions";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: CreateClipActionState = undefined;

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

type ClipMode = "full" | "highlight";

export function CreateClipForm({
  slug,
  videoId,
  durationSeconds,
}: {
  slug: string;
  videoId: string;
  durationSeconds: number | null;
}) {
  const canUseFullRecording =
    durationSeconds !== null && durationSeconds > 0;
  const [mode, setMode] = useState<ClipMode>(
    canUseFullRecording ? "full" : "highlight",
  );
  const boundAction = createClipAction.bind(null, slug, videoId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error || state?.fieldErrors), close);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "full"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            !canUseFullRecording && "cursor-not-allowed opacity-50",
          )}
          disabled={!canUseFullRecording}
          onClick={() => setMode("full")}
        >
          Full recording
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "highlight"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setMode("highlight")}
        >
          Highlight
        </button>
      </div>

      {mode === "full" && canUseFullRecording ? (
        <p className="text-sm text-muted-foreground">
          Saves the entire recording ({formatDuration(durationSeconds!)}) to your
          clip library. You don&apos;t need start and end times.
        </p>
      ) : !canUseFullRecording ? (
        <p className="text-sm text-muted-foreground">
          Full recording isn&apos;t available because this capture has no saved
          duration yet. Use Highlight and enter start/end times manually.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Mark a moment inside the recording with a start and end time.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="clip-title">Title</Label>
        <Input
          id="clip-title"
          name="title"
          placeholder={
            mode === "full" ? "Training — Aug 14" : "Build-up to first goal"
          }
          required
        />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.title[0]}
          </p>
        )}
      </div>

      {mode === "full" && canUseFullRecording ? (
        <input type="hidden" name="fullRecording" value="true" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="clip-start">Start (seconds)</Label>
            <Input
              id="clip-start"
              name="startSeconds"
              type="number"
              min={0}
              required
            />
            {state?.fieldErrors?.startSeconds && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.startSeconds[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clip-end">End (seconds)</Label>
            <Input
              id="clip-end"
              name="endSeconds"
              type="number"
              min={0}
              required
            />
            {state?.fieldErrors?.endSeconds && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.endSeconds[0]}
              </p>
            )}
          </div>
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "full"
            ? "Save full recording"
            : "Add highlight"}
      </Button>
    </form>
  );
}
