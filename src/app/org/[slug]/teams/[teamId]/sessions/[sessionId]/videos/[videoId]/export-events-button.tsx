"use client";

import { useActionState, useEffect } from "react";
import { Download } from "lucide-react";
import {
  exportEventsCsvAction,
  type ExportEventsActionState,
} from "@/domain/events/actions";
import { Button } from "@/components/ui/button";

const initialState: ExportEventsActionState = undefined;

export function ExportEventsButton({
  slug,
  videoId,
}: {
  slug: string;
  videoId: string;
}) {
  const boundAction = exportEventsCsvAction.bind(null, slug, videoId);
  const [state, action, pending] = useActionState(boundAction, initialState);

  useEffect(() => {
    if (state?.url) {
      window.location.href = state.url;
    }
  }, [state?.url]);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Download className="size-3.5" />
        {pending ? "Exporting…" : "Export CSV"}
      </Button>
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
