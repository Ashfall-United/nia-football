"use client";

import { useActionState } from "react";
import {
  updateSessionAction,
  type SessionActionState,
} from "@/domain/sessions/actions";
import type { Session } from "@/domain/sessions/types";
import {
  pitchSurfaceOptions,
  toDatetimeLocalValue,
} from "@/lib/validation/session";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: SessionActionState = undefined;

const homeAwayOptions = [
  { value: "true", label: "Home" },
  { value: "false", label: "Away" },
] as const;

export function EditSessionForm({
  slug,
  teamId,
  session,
}: {
  slug: string;
  teamId: string;
  session: Session;
}) {
  const boundAction = updateSessionAction.bind(
    null,
    slug,
    teamId,
    session.id,
  );
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  useActionSuccess(
    pending,
    Boolean(state?.error || state?.fieldErrors),
    close,
  );

  const isMatch = session.type === "match";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={session.type} />
      <div className="space-y-2">
        <Label>Type</Label>
        <Badge variant={isMatch ? "default" : "secondary"}>
          {isMatch ? "Match" : "Training"}
        </Badge>
        <p className="text-xs text-muted-foreground">
          Type can&apos;t be changed after creation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`scheduledAt-${session.id}`}>Date and time</Label>
        <Input
          id={`scheduledAt-${session.id}`}
          name="scheduledAt"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(session.scheduledAt)}
          required
        />
        {state?.fieldErrors?.scheduledAt && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.scheduledAt[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`location-${session.id}`}>Location</Label>
          <Input
            id={`location-${session.id}`}
            name="location"
            defaultValue={session.location ?? undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`pitchSurface-${session.id}`}>Pitch surface</Label>
          <Select
            name="pitchSurface"
            items={pitchSurfaceOptions}
            defaultValue={session.pitchSurface ?? undefined}
          >
            <SelectTrigger id={`pitchSurface-${session.id}`} className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {pitchSurfaceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMatch && (
        <div className="space-y-4 rounded-lg border border-dashed p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`opponentName-${session.id}`}>Opponent</Label>
              <Input
                id={`opponentName-${session.id}`}
                name="opponentName"
                defaultValue={session.opponentName ?? undefined}
                required
              />
              {state?.fieldErrors?.opponentName && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.opponentName[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`isHome-${session.id}`}>Home or away</Label>
              <Select
                name="isHome"
                items={homeAwayOptions}
                defaultValue={
                  session.isHome === true
                    ? "true"
                    : session.isHome === false
                      ? "false"
                      : undefined
                }
              >
                <SelectTrigger id={`isHome-${session.id}`} className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {homeAwayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.fieldErrors?.isHome && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.isHome[0]}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`competition-${session.id}`}>Competition</Label>
            <Input
              id={`competition-${session.id}`}
              name="competition"
              defaultValue={session.competition ?? undefined}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Final score{" "}
              <span className="font-normal">
                — add once the match has been played
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`teamScore-${session.id}`}>Our score</Label>
                <Input
                  id={`teamScore-${session.id}`}
                  name="teamScore"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={session.teamScore ?? undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`opponentScore-${session.id}`}>
                  Their score
                </Label>
                <Input
                  id={`opponentScore-${session.id}`}
                  name="opponentScore"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={session.opponentScore ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`notes-${session.id}`}>Notes</Label>
        <Textarea
          id={`notes-${session.id}`}
          name="notes"
          rows={3}
          defaultValue={session.notes ?? undefined}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
