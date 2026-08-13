"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { createHighlightClipAction } from "@/domain/clips/actions";
import { Button } from "@/components/ui/button";
import { formatVideoTimestamp } from "@/lib/video/timestamp";

export type HighlightCandidate = {
  eventId: string;
  typeLabel: string;
  timestampSeconds: number;
};

export function HighlightsPanel({
  slug,
  videoId,
  candidates,
}: {
  slug: string;
  videoId: string;
  candidates: HighlightCandidate[];
}) {
  const router = useRouter();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startAdd] = useTransition();

  if (candidates.length === 0) {
    return null;
  }

  function handleAdd(eventId: string) {
    setError(null);
    setAddingId(eventId);
    startAdd(async () => {
      const result = await createHighlightClipAction(slug, videoId, eventId);
      setAddingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-4 text-primary" />
        Highlights
      </h2>
      <p className="text-xs text-muted-foreground">
        Confirmed goals, shots, and chances from this footage — add any of
        these straight to your clip library.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm">
        {candidates.map((candidate) => (
          <li
            key={candidate.eventId}
            className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm"
          >
            <div>
              <p className="font-medium">{candidate.typeLabel}</p>
              <p className="text-xs text-muted-foreground">
                {formatVideoTimestamp(candidate.timestampSeconds)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={addingId === candidate.eventId}
              onClick={() => handleAdd(candidate.eventId)}
            >
              <Plus className="size-4" />
              {addingId === candidate.eventId ? "Adding…" : "Add as clip"}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
