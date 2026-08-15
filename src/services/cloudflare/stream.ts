import "server-only";
import { z } from "zod";
import {
  buildStreamHlsUrl,
  buildStreamIframeSrc,
} from "@/lib/video/stream-urls";
import { cloudflareFetch, CloudflareApiError } from "./client";

export type StreamLiveInput = {
  uid: string;
  rtmps: { url: string; streamKey: string };
  srt: { url: string; streamId: string; passphrase: string };
  webRTC: { url: string };
  status: { current: { state: string } } | null;
  created: string;
};

export type DirectUpload = {
  uid: string;
  uploadUrl: string;
};

async function createLiveInput(name: string): Promise<StreamLiveInput> {
  return cloudflareFetch<StreamLiveInput>("/stream/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: { name },
      recording: { mode: "automatic" },
    }),
  });
}

async function getLiveInput(uid: string): Promise<StreamLiveInput> {
  return cloudflareFetch<StreamLiveInput>(`/stream/live_inputs/${uid}`);
}

async function deleteLiveInput(uid: string): Promise<void> {
  await cloudflareFetch<null>(`/stream/live_inputs/${uid}`, {
    method: "DELETE",
  });
}

async function deleteVideo(uid: string): Promise<void> {
  await cloudflareFetch<null>(`/stream/${uid}`, {
    method: "DELETE",
  });
}

// Recording happens locally on the device first (MediaRecorder), so by the
// time we ask Cloudflare for an upload slot we already know the file size —
// TUS requires it upfront. Use /stream?direct_user=true (not /direct_upload,
// which is JSON-only for basic POST uploads). The returned Location URL is
// handed to tus-js-client in the browser without exposing the API token.
async function createDirectUpload(options: {
  maxDurationSeconds: number;
  uploadLengthBytes: number;
}): Promise<DirectUpload> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new CloudflareApiError("Cloudflare is not configured.", 0);
  }

  const uploadMetadata = [
    `maxdurationseconds ${Buffer.from(String(options.maxDurationSeconds)).toString("base64")}`,
  ].join(",");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(options.uploadLengthBytes),
        "Upload-Metadata": uploadMetadata,
      },
    },
  );

  const uploadUrl = response.headers.get("Location");
  const uid =
    response.headers.get("stream-media-id") ??
    (uploadUrl ? extractStreamUidFromUploadUrl(uploadUrl) : null);

  if (!response.ok || !uploadUrl || !uid) {
    const body = await response.text().catch(() => "");
    console.error(
      "[cloudflare] TUS direct upload creation failed:",
      response.status,
      body,
    );
    throw new CloudflareApiError(
      "Failed to start video upload.",
      response.status,
    );
  }

  return { uid, uploadUrl };
}

function extractStreamUidFromUploadUrl(uploadUrl: string): string | null {
  try {
    const segments = new URL(uploadUrl).pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

const streamVideoDetailsSchema = z.object({
  duration: z.number().optional(),
  preview: z.string().url().optional(),
  requireSignedURLs: z.boolean().optional(),
  playback: z
    .object({
      hls: z.string().url().optional(),
    })
    .optional(),
  input: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
});

function iframeSrcFromPreview(preview: string): string | null {
  try {
    const url = new URL(preview);
    url.pathname = url.pathname.replace(/\/watch\/?$/, "/iframe");
    if (!url.pathname.endsWith("/iframe")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function iframeSrcFromHls(hls: string): string | null {
  try {
    const url = new URL(hls);
    const uid = url.pathname.split("/").filter(Boolean)[0];
    if (!uid) {
      return null;
    }
    return `https://${url.host}/${uid}/iframe`;
  } catch {
    return null;
  }
}

async function getVideoDetails(uid: string) {
  const raw = await cloudflareFetch<unknown>(`/stream/${uid}`);
  return streamVideoDetailsSchema.safeParse(raw);
}

async function getVideoDuration(uid: string): Promise<number | null> {
  const parsed = await getVideoDetails(uid);
  if (!parsed.success) {
    return null;
  }
  const { duration } = parsed.data;
  if (duration === undefined || duration <= 0) {
    return null;
  }
  return duration;
}

// The pixel resolution of the source video, as Cloudflare received it.
// Needed so pitch calibration points (clicked against a thumbnail image,
// which is rendered at a different resolution) can be converted to the
// pixel coordinates the ML service will actually see when it reads
// frames from the source video.
async function getVideoDimensions(
  uid: string,
): Promise<{ width: number; height: number } | null> {
  const parsed = await getVideoDetails(uid);
  if (!parsed.success) {
    return null;
  }
  const { width, height } = parsed.data.input ?? {};
  if (!width || !height) {
    return null;
  }
  return { width, height };
}

async function getVideoIframeSrc(uid: string): Promise<string | null> {
  const parsed = await getVideoDetails(uid);
  if (!parsed.success) {
    return null;
  }

  if (parsed.data.preview) {
    const fromPreview = iframeSrcFromPreview(parsed.data.preview);
    if (fromPreview) {
      return fromPreview;
    }
  }

  if (parsed.data.playback?.hls) {
    return iframeSrcFromHls(parsed.data.playback.hls);
  }

  return null;
}

function buildSignedIframeSrc(
  token: string,
  options?: { startTime?: number },
): string | null {
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!customerCode) {
    return null;
  }

  const base = `https://customer-${customerCode}.cloudflarestream.com/${token}`;
  const poster = `${base}/thumbnails/thumbnail.jpg?time=&height=600`;
  let iframe = `${base}/iframe?poster=${encodeURIComponent(poster)}`;

  if (options?.startTime !== undefined && options.startTime > 0) {
    iframe += `&startTime=${Math.floor(options.startTime)}`;
  }

  return iframe;
}

function appendStartTimeToIframe(
  iframeSrc: string,
  startTime?: number,
): string {
  if (startTime === undefined || startTime <= 0) {
    return iframeSrc;
  }

  const url = new URL(iframeSrc);
  url.searchParams.set("startTime", String(Math.floor(startTime)));
  return url.toString();
}

async function resolvePlaybackIframeSrc(
  uid: string,
  options?: { startTime?: number },
): Promise<string | null> {
  const parsed = await getVideoDetails(uid);

  if (parsed.success && parsed.data.requireSignedURLs === true) {
    try {
      const token = await createSignedStreamToken(uid);
      const signed = buildSignedIframeSrc(token, options);
      if (signed) {
        return signed;
      }
    } catch (error) {
      console.error("[cloudflare] Failed to create signed playback token:", error);
    }
  }

  const fromEnv = buildStreamIframeSrc(uid, options);
  if (fromEnv) {
    return fromEnv;
  }

  const fromApi = await getVideoIframeSrc(uid);
  if (!fromApi) {
    return null;
  }

  return appendStartTimeToIframe(fromApi, options?.startTime);
}

const streamTokenResponseSchema = z.union([
  z.object({ token: z.string().min(1) }),
  z.string().min(1),
]);

async function createSignedStreamToken(uid: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const raw = await cloudflareFetch<unknown>(`/stream/${uid}/token`, {
    method: "POST",
    body: JSON.stringify({ exp }),
  });
  const parsed = streamTokenResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CloudflareApiError("Failed to create Stream playback token.", 0);
  }
  return typeof parsed.data === "string" ? parsed.data : parsed.data.token;
}

function signedHlsUrl(token: string): string | null {
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!customerCode) {
    return null;
  }
  return `https://customer-${customerCode}.cloudflarestream.com/${token}/manifest/video.m3u8`;
}

// OpenCV reads Cloudflare HLS directly; MP4 downloads must be created
// separately and often 404 until encoded — HLS is available as soon as the
// video is ready to stream.
async function resolveMlVideoUrl(uid: string): Promise<string> {
  const parsed = await getVideoDetails(uid);
  if (!parsed.success) {
    throw new CloudflareApiError("Video not found in Stream.", 404);
  }

  if (parsed.data.requireSignedURLs === true) {
    const token = await createSignedStreamToken(uid);
    const signedUrl = signedHlsUrl(token);
    if (!signedUrl) {
      throw new CloudflareApiError(
        "Stream customer code is not configured.",
        0,
      );
    }
    return signedUrl;
  }

  const hlsUrl =
    parsed.data.playback?.hls ?? buildStreamHlsUrl(uid);
  if (!hlsUrl) {
    throw new CloudflareApiError("HLS playback is not configured.", 0);
  }

  return hlsUrl;
}

export const CloudflareStreamService = {
  createLiveInput,
  getLiveInput,
  deleteLiveInput,
  deleteVideo,
  createDirectUpload,
  getVideoIframeSrc,
  getVideoDuration,
  getVideoDimensions,
  resolveMlVideoUrl,
  resolvePlaybackIframeSrc,
};
