"use client";

import { useState } from "react";
import { useActionState } from "react";
import { UserRound } from "lucide-react";
import {
  createPlayerAction,
  type PlayerActionState,
} from "@/domain/players/actions";
import { positionOptions } from "@/lib/validation/player";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: PlayerActionState = undefined;

export function CreatePlayerForm({
  slug,
  teamId,
}: {
  slug: string;
  teamId: string;
}) {
  const boundAction = createPlayerAction.bind(null, slug, teamId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error || state?.fieldErrors), close);

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        <label
          htmlFor="photo"
          className="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-input bg-muted text-muted-foreground hover:bg-muted/70"
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <UserRound className="size-6" />
          )}
        </label>
        <div className="space-y-1">
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            required
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPhotoPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <Label htmlFor="photo" className="cursor-pointer">
            Player photo (required)
          </Label>
          {state?.fieldErrors?.photo && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.photo[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
          {state?.fieldErrors?.firstName && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.firstName[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
          {state?.fieldErrors?.lastName && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.lastName[0]}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" />
          {state?.fieldErrors?.dateOfBirth && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.dateOfBirth[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="jerseyNumber">Number</Label>
          <Input
            id="jerseyNumber"
            name="jerseyNumber"
            type="number"
            min={1}
            max={99}
          />
          {state?.fieldErrors?.jerseyNumber && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.jerseyNumber[0]}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <Select name="position" items={positionOptions}>
          <SelectTrigger id="position">
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            {positionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state?.fieldErrors?.position && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.position[0]}
          </p>
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add player"}
      </Button>
    </form>
  );
}
