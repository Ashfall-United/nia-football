"use client";

import { useActionState } from "react";
import {
  createTeamAction,
  type CreateTeamActionState,
} from "@/domain/teams/actions";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateTeamActionState = undefined;

export function CreateTeamForm({ slug }: { slug: string }) {
  const boundAction = createTeamAction.bind(null, slug);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error || state?.fieldErrors), close);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Team name</Label>
        <Input id="name" name="name" placeholder="First Team" required />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add team"}
      </Button>
    </form>
  );
}
