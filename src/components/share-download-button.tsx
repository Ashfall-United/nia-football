"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DownloadState = "idle" | "preparing" | "error";

export function ShareDownloadButton({
  token,
  clipIndex,
  label = "Download video",
}: {
  token: string;
  clipIndex?: number;
  label?: string;
}) {
  const [state, setState] = useState<DownloadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDownload() {
    setState("preparing");
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (clipIndex !== undefined) {
      params.set("clip", String(clipIndex));
    }

    const endpoint = `/api/share/${token}/download${
      params.size > 0 ? `?${params.toString()}` : ""
    }`;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(endpoint);
        const payload = (await response.json()) as {
          status?: string;
          url?: string;
          filename?: string;
          error?: string;
          message?: string;
        };

        if (response.status === 202 || payload.status === "processing") {
          await new Promise((resolve) => {
            setTimeout(resolve, 3_000);
          });
          continue;
        }

        if (!response.ok || payload.status !== "ready" || !payload.url) {
          setState("error");
          setErrorMessage(
            payload.error ?? payload.message ?? "Download failed. Try again.",
          );
          return;
        }

        const link = document.createElement("a");
        link.href = payload.url;
        link.download = payload.filename ?? "video.mp4";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setState("idle");
        return;
      } catch {
        setState("error");
        setErrorMessage("Download failed. Check your connection and try again.");
        return;
      }
    }

    setState("error");
    setErrorMessage("Download is still preparing. Try again in a minute.");
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        disabled={state === "preparing"}
        onClick={() => {
          void handleDownload();
        }}
      >
        {state === "preparing" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {state === "preparing" ? "Preparing…" : label}
      </Button>
      {errorMessage ? (
        <p className="text-center text-xs text-red-300">{errorMessage}</p>
      ) : null}
    </div>
  );
}
