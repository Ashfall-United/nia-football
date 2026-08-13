"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { runBallDetectionSuggestionsAction } from "@/domain/events/actions";
import { Button } from "@/components/ui/button";

export function RunDetectionButton({
  slug,
  videoId,
}: {
  slug: string;
  videoId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleRun() {
    startTransition(async () => {
      const result = await runBallDetectionSuggestionsAction(slug, videoId);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      if (result?.skipped) {
        window.alert(
          "ML service is not configured. Set ML_SERVICE_URL and ML_API_KEY in your environment.",
        );
        return;
      }
      window.alert(
        result?.created
          ? `Added ${result.created} suggested shot${result.created === 1 ? "" : "s"} for review.`
          : "No new ball detections to suggest.",
      );
      window.location.reload();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={handleRun}
    >
      <Sparkles className="size-4" />
      {pending ? "Analysing…" : "Run ball detection"}
    </Button>
  );
}
