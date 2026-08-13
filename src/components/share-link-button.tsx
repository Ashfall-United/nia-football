"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import {
  createShareLinkAction,
  type ShareActionState,
} from "@/domain/shares/actions";
import type { ShareResourceType } from "@/types/database";
import { Button } from "@/components/ui/button";

const initialState: ShareActionState = undefined;

export function ShareLinkButton({
  slug,
  resourceType,
  resourceId,
  label = "Share",
}: {
  slug: string;
  resourceType: ShareResourceType;
  resourceId: string;
  label?: string;
}) {
  const boundAction = createShareLinkAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [copied, setCopied] = useState(false);
  const lastCopiedUrl = useRef<string | null>(null);

  useEffect(() => {
    const shareUrl = state?.success?.shareUrl;
    if (!shareUrl || shareUrl === lastCopiedUrl.current) {
      return;
    }

    lastCopiedUrl.current = shareUrl;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });
  }, [state?.success?.shareUrl]);

  return (
    <form action={formAction}>
      <input type="hidden" name="resourceType" value={resourceType} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Link2 className="size-4" />
        )}
        {pending ? "Creating…" : copied ? "Link copied" : label}
      </Button>
      {state?.error ? (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
