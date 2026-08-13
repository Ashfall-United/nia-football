"use client";

import { useActionState } from "react";
import {
  updateCameraAction,
  type CameraActionState,
} from "@/domain/cameras/actions";
import type { Camera } from "@/domain/cameras/types";
import { useActionSuccess } from "@/hooks/use-action-success";
import { useFormDialogClose } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CameraActionState = undefined;

export function EditCameraForm({
  slug,
  camera,
}: {
  slug: string;
  camera: Camera;
}) {
  const boundAction = updateCameraAction.bind(null, slug, camera.id);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const close = useFormDialogClose();
  useActionSuccess(pending, Boolean(state?.error || state?.fieldErrors), close);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`name-${camera.id}`}>Camera name</Label>
        <Input
          id={`name-${camera.id}`}
          name="name"
          defaultValue={camera.name}
          required
        />
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
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
