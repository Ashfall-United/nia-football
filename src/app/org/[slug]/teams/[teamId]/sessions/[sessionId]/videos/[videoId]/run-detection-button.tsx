"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { runBallDetectionSuggestionsAction } from "@/domain/events/actions";
import { Button } from "@/components/ui/button";

const CLIENT_TIMEOUT_MS = 120_000;

export function RunDetectionButton({
  slug,
  videoId,
}: {
  slug: string;
  videoId: string;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  function clearClientTimeout() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  async function handleRun() {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    clearClientTimeout();

    timeoutRef.current = window.setTimeout(() => {
      setIsRunning(false);
      window.alert(
        "Ball detection is taking too long. If you're on production, ensure ML_SERVICE_URL points to a deployed ML service (not localhost) and that it can reach your Cloudflare Stream video URL.",
      );
    }, CLIENT_TIMEOUT_MS);

    try {
      const result = await runBallDetectionSuggestionsAction(slug, videoId);
      clearClientTimeout();

      if (result?.error) {
        window.alert(result.error);
        return;
      }

      window.alert(
        result?.created
          ? `Added ${result.created} suggested shot${result.created === 1 ? "" : "s"} for review. Open AI review in the sidebar to confirm them.`
          : "No new ball detections to suggest for this recording.",
      );
      window.location.reload();
    } catch {
      clearClientTimeout();
      window.alert(
        "Ball detection failed unexpectedly. Check the server logs and ML service connection.",
      );
    } finally {
      clearClientTimeout();
      setIsRunning(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isRunning}
      onClick={() => void handleRun()}
    >
      <Sparkles className="size-4" />
      {isRunning ? "Analysing…" : "Run ball detection"}
    </Button>
  );
}
