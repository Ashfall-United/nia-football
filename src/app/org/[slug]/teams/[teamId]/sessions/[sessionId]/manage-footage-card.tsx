"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteVideoAction } from "@/domain/videos/actions";
import type { Video as SessionVideo } from "@/domain/videos/types";
import type { FootageClipSummary } from "./footage-card";
import { FootageCard } from "./footage-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export function ManageFootageCard({
  slug,
  sessionId,
  video,
  cameraName,
  thumbnailUrl,
  href,
  clips = [],
}: {
  slug: string;
  sessionId: string;
  video: SessionVideo;
  cameraName: string;
  thumbnailUrl: string | null;
  href: string;
  clips?: FootageClipSummary[];
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Remove this ${cameraName} recording? Clips and events on this footage will also be deleted.`,
    );
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteVideoAction(slug, sessionId, video.id);
      if (result.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <FootageCard
      video={video}
      cameraName={cameraName}
      thumbnailUrl={thumbnailUrl}
      href={href}
      clips={clips}
      actions={
        <div className="absolute top-2 left-2 z-10 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="size-8 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                  disabled={pending}
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Remove recording
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  );
}
