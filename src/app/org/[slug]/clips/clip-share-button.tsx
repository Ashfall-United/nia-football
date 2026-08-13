"use client";

import { ShareLinkButton } from "@/components/share-link-button";

export function ClipShareButton({
  slug,
  clipId,
}: {
  slug: string;
  clipId: string;
}) {
  return (
    <div
      className="absolute right-3 bottom-3 z-10 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100"
      onClick={(event) => event.preventDefault()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <ShareLinkButton slug={slug} resourceType="clip" resourceId={clipId} />
    </div>
  );
}
