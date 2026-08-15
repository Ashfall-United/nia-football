import "server-only";
import {
  buildLiveInputIframeSrc,
  buildStreamHlsUrl,
  buildStreamIframeSrc,
  buildStreamMp4DownloadUrl,
  buildStreamThumbnailUrl,
} from "@/lib/video/stream-urls";
import { CloudflareStreamService } from "./stream";

export {
  buildLiveInputIframeSrc,
  buildStreamHlsUrl,
  buildStreamIframeSrc,
  buildStreamMp4DownloadUrl,
  buildStreamThumbnailUrl,
};

export async function resolveStreamMlVideoUrl(
  videoUid: string,
): Promise<string> {
  return CloudflareStreamService.resolveMlVideoUrl(videoUid);
}

export async function resolveStreamIframeSrc(
  videoUid: string,
  options?: { startTime?: number },
): Promise<string | null> {
  try {
    return await CloudflareStreamService.resolvePlaybackIframeSrc(
      videoUid,
      options,
    );
  } catch (error) {
    console.error("[cloudflare] Failed to resolve playback URL:", error);
    return buildStreamIframeSrc(videoUid, options);
  }
}
