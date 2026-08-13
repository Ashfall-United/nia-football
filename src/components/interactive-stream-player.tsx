"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useStreamPlayer } from "@/hooks/use-stream-player";
import { formatVideoTimestamp } from "@/lib/video/timestamp";

const STREAM_SDK = "https://embed.cloudflarestream.com/embed/sdk.latest.js";

export function InteractiveStreamPlayer({
  iframeSrc,
  initialSeekSeconds,
  onPlayerReady,
  onTimeUpdate,
  playerBridgeRef,
}: {
  iframeSrc: string | null;
  initialSeekSeconds?: number | null;
  onPlayerReady?: (ready: boolean) => void;
  onTimeUpdate?: (seconds: number) => void;
  playerBridgeRef?: React.MutableRefObject<{
    getCurrentTimestamp: () => number;
    seek: (seconds: number) => void;
  } | null>;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialSeekAppliedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const { currentTime, playerReady, seek, getCurrentTimestamp } =
    useStreamPlayer(iframeRef, iframeSrc, sdkReady);

  useEffect(() => {
    initialSeekAppliedRef.current = false;
  }, [iframeSrc, initialSeekSeconds]);

  useEffect(() => {
    if (
      !playerReady ||
      initialSeekSeconds == null ||
      initialSeekSeconds < 0 ||
      initialSeekAppliedRef.current
    ) {
      return;
    }
    initialSeekAppliedRef.current = true;
    seek(initialSeekSeconds);
  }, [playerReady, initialSeekSeconds, seek]);

  useEffect(() => {
    onPlayerReady?.(playerReady);
  }, [onPlayerReady, playerReady]);

  useEffect(() => {
    onTimeUpdate?.(currentTime);
  }, [onTimeUpdate, currentTime]);

  useEffect(() => {
    if (!playerBridgeRef) return;
    playerBridgeRef.current = { getCurrentTimestamp, seek };
    return () => {
      playerBridgeRef.current = null;
    };
  }, [playerBridgeRef, getCurrentTimestamp, seek]);

  if (!iframeSrc) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted px-6 text-center text-sm text-muted-foreground">
        <p>Video playback isn&apos;t connected yet.</p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={STREAM_SDK}
        strategy="lazyOnload"
        onReady={() => setSdkReady(true)}
      />
      <div className="relative w-full overflow-hidden rounded-lg bg-black pt-[56.25%]">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          loading="lazy"
          className="absolute inset-0 size-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          title="Video playback"
        />
        {playerReady && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/65 px-2.5 py-1 font-mono text-xs tabular-nums text-white ring-1 ring-white/15 backdrop-blur-sm">
            {formatVideoTimestamp(currentTime)}
          </div>
        )}
      </div>
    </>
  );
}
