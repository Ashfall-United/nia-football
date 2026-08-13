"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";
import {
  confirmEventAction,
  rejectEventAction,
} from "@/domain/events/actions";
import type { Event } from "@/domain/events/types";
import { eventTypeLabelByValue } from "@/lib/validation/event";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function ReviewEventRow({
  slug,
  event,
  videoHref,
  videoLabel,
}: {
  slug: string;
  event: Event;
  videoHref: string | null;
  videoLabel: string;
}) {
  const router = useRouter();
  const [isConfirming, startConfirm] = useTransition();
  const [isRejecting, startReject] = useTransition();
  const pending = isConfirming || isRejecting;

  function handleConfirm() {
    startConfirm(async () => {
      const result = await confirmEventAction(slug, event.id);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReject() {
    startReject(async () => {
      const result = await rejectEventAction(slug, event.id);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {eventTypeLabelByValue.get(event.type) ?? event.type}
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20">
            Suggested
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatTimestamp(event.timestampSeconds)} · {videoLabel}
        </p>
        {event.notes ? (
          <p className="text-sm text-muted-foreground">{event.notes}</p>
        ) : null}
        {videoHref ? (
          <Link
            href={videoHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open footage
            <ExternalLink className="size-3" />
          </Link>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleReject}
          className={cn(isRejecting && "opacity-70")}
        >
          <X className="size-4" />
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleConfirm}
          className={cn(isConfirming && "opacity-70")}
        >
          <Check className="size-4" />
          Confirm
        </Button>
      </div>
    </li>
  );
}
