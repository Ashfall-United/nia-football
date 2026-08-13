"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StreamPlayerInstance = {
  currentTime: number;
  duration: number;
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener: (event: string, listener: () => void) => void;
};

declare global {
  interface Window {
    Stream?: (element: HTMLIFrameElement) => StreamPlayerInstance;
  }
}

export function useStreamPlayer(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  iframeSrc: string | null,
  sdkReady: boolean,
) {
  const playerRef = useRef<StreamPlayerInstance | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (!sdkReady || !iframeSrc || !iframeRef.current || !window.Stream) {
      return;
    }

    const player = window.Stream(iframeRef.current);
    playerRef.current = player;

    const syncTime = () => {
      setCurrentTime(player.currentTime);
    };
    const syncDuration = () => {
      setDuration(player.duration);
      setPlayerReady(true);
    };

    player.addEventListener("timeupdate", syncTime);
    player.addEventListener("loadedmetadata", syncDuration);
    player.addEventListener("durationchange", syncDuration);

    syncTime();
    if (player.duration > 0) {
      syncDuration();
    }

    return () => {
      player.removeEventListener("timeupdate", syncTime);
      player.removeEventListener("loadedmetadata", syncDuration);
      player.removeEventListener("durationchange", syncDuration);
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [iframeRef, iframeSrc, sdkReady]);

  const seek = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = Math.max(0, seconds);
    setCurrentTime(player.currentTime);
  }, []);

  const getCurrentTimestamp = useCallback((): number => {
    const player = playerRef.current;
    return Math.floor(player?.currentTime ?? currentTime);
  }, [currentTime]);

  return {
    currentTime,
    duration,
    playerReady,
    seek,
    getCurrentTimestamp,
  };
}
