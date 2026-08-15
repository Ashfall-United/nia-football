import "server-only";
import { getSharedLinkPreview } from "@/domain/shares/queries";
import type { SharedLinkResult } from "@/domain/shares/types";
import {
  appendDownloadFilename,
  resolveStreamDownloadUrl,
  sanitizeDownloadFilename,
} from "@/services/cloudflare/stream-downloads";
import { CloudflareStreamService } from "@/services/cloudflare/stream";

export type SharedDownloadResult =
  | { status: "ready"; url: string; filename: string }
  | { status: "processing" }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "error"; message: string };

function isActivePreview(
  preview: SharedLinkResult,
): preview is Exclude<SharedLinkResult, null | { expired: true }> {
  return preview !== null && !("expired" in preview);
}

export async function resolveSharedDownload(
  token: string,
  clipIndex = 0,
): Promise<SharedDownloadResult> {
  const preview = await getSharedLinkPreview(token);

  if (!preview) {
    return { status: "not_found" };
  }

  if ("expired" in preview) {
    return { status: "expired" };
  }

  if (!isActivePreview(preview)) {
    return { status: "not_found" };
  }

  const clip =
    preview.resourceType === "clip"
      ? {
          streamUid: preview.streamUid,
          startSeconds: preview.startSeconds,
          endSeconds: preview.endSeconds,
          title: preview.title,
        }
      : preview.clips[clipIndex];

  if (!clip) {
    return { status: "not_found" };
  }

  try {
    const durationSeconds = await CloudflareStreamService.getVideoDuration(
      clip.streamUid,
    );
    const download = await resolveStreamDownloadUrl({
      streamUid: clip.streamUid,
      startSeconds: clip.startSeconds,
      endSeconds: clip.endSeconds,
      title: clip.title,
      durationSeconds,
    });

    const filename = sanitizeDownloadFilename(clip.title);

    if (download.status === "processing") {
      return { status: "processing" };
    }

    return {
      status: "ready",
      url: appendDownloadFilename(download.url, filename),
      filename: `${filename}.mp4`,
    };
  } catch (error) {
    console.error("[shares] Failed to prepare download:", error);
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "We couldn't prepare this download. Try again.",
    };
  }
}
