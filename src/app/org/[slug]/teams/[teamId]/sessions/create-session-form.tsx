"use client";

import { useActionState, useState } from "react";
import {
  createSessionAction,
  type CreateSessionActionState,
} from "@/domain/sessions/actions";
import { pitchSurfaceOptions } from "@/lib/validation/session";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: CreateSessionActionState = undefined;

const homeAwayOptions = [
  { value: "true", label: "Home" },
  { value: "false", label: "Away" },
] as const;

export function CreateSessionForm({
  slug,
  teamId,
}: {
  slug: string;
  teamId: string;
}) {
  const boundAction = createSessionAction.bind(null, slug, teamId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [type, setType] = useState<"training" | "match">("training");
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error), close);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <RadioGroup
          name="type"
          value={type}
          onValueChange={(value) => setType(value as "training" | "match")}
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="training" /> Training
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="match" /> Match
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Date and time</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
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
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Home ground" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pitchSurface">Pitch surface</Label>
          <Select name="pitchSurface" items={pitchSurfaceOptions}>
            <SelectTrigger id="pitchSurface" className="w-full">
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

      {type === "match" && (
        <div className="space-y-4 rounded-lg border border-dashed p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="opponentName">Opponent</Label>
              <Input id="opponentName" name="opponentName" required />
              {state?.fieldErrors?.opponentName && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.opponentName[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="isHome">Home or away</Label>
              <Select name="isHome" items={homeAwayOptions}>
                <SelectTrigger id="isHome" className="w-full">
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
            <Label htmlFor="competition">Competition</Label>
            <Input
              id="competition"
              name="competition"
              placeholder="League, friendly…"
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
                <Label htmlFor="teamScore">Our score</Label>
                <Input
                  id="teamScore"
                  name="teamScore"
                  type="number"
                  min={0}
                  max={99}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opponentScore">Their score</Label>
                <Input
                  id="opponentScore"
                  name="opponentScore"
                  type="number"
                  min={0}
                  max={99}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Create session"}
      </Button>
    </form>
  );
}
