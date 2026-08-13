"use client";

import { useActionState } from "react";
import {
  connectCameraToStreamAction,
  type ConnectCameraActionState,
} from "@/domain/cameras/actions";
import { Button } from "@/components/ui/button";

const initialState: ConnectCameraActionState = undefined;

export function ConnectCameraButton({
  slug,
  cameraId,
  className,
}: {
  slug: string;
  cameraId: string;
  className?: string;
}) {
  const boundAction = connectCameraToStreamAction.bind(null, slug, cameraId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  return (
    <form action={action} className={className}>
      <Button
        type="submit"
        size="sm"
        className="w-full bg-white text-[#01255f] hover:bg-white/90"
        disabled={pending}
      >
        {pending ? "Connecting…" : "Connect to Stream"}
      </Button>
      {state?.error && (
        <p className="mt-1.5 text-xs text-red-200">{state.error}</p>
      )}
    </form>
  );
}
