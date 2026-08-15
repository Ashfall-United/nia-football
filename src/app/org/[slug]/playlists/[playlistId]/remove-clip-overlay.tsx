"use client";

import { RemoveClipButton } from "./remove-clip-button";

export function RemoveClipOverlay({
  slug,
  playlistId,
  clipId,
}: {
  slug: string;
  playlistId: string;
  clipId: string;
}) {
  return (
    <div
      className="absolute top-2 right-2 z-10 rounded-md bg-black/50 p-0.5 opacity-100 backdrop-blur-sm sm:opacity-0 sm:transition-opacity sm:group-hover/card:opacity-100 sm:focus-within:opacity-100"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <RemoveClipButton slug={slug} playlistId={playlistId} clipId={clipId} />
    </div>
  );
}
