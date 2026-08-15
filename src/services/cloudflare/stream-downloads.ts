import "server-only";
import { z } from "zod";
import { buildStreamMp4DownloadUrl } from "@/lib/video/stream-urls";
import { cloudflareFetch, CloudflareApiError } from "./client";

const streamDownloadEntrySchema = z.object({
  status: z.string(),
  url: z.string().url(),
  percentComplete: z.number().optional(),
});

const streamDownloadsSchema = z.object({
  default: streamDownloadEntrySchema.optional(),
});

const streamClipResponseSchema = z.object({
  uid: z.string().min(1),
  requireSignedURLs: z.boolean().optional(),
  readyToStream: z.boolean().optional(),
});

const streamReadySchema = z.object({
  readyToStream: z.boolean().optional(),
  requireSignedURLs: z.boolean().optional(),
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildSignedDownloadUrl(token: string): string | null {
  const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!customerCode) {
    return null;
  }
  return `https://customer-${customerCode}.cloudflarestream.com/${token}/downloads/default.mp4`;
}

async function createSignedDownloadToken(uid: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const raw = await cloudflareFetch<unknown>(`/stream/${uid}/token`, {
    method: "POST",
    body: JSON.stringify({ exp, downloadable: true }),
  });

  const parsed = z
    .union([z.object({ token: z.string().min(1) }), z.string().min(1)])
    .safeParse(raw);

  if (!parsed.success) {
    throw new CloudflareApiError("Failed to create Stream download token.", 0);
  }

  return typeof parsed.data === "string" ? parsed.data : parsed.data.token;
}

async function getStreamDownloadState(uid: string) {
  try {
    const raw = await cloudflareFetch<unknown>(`/stream/${uid}/downloads`, {
      method: "GET",
    });
    return streamDownloadsSchema.safeParse(raw);
  } catch (error) {
    if (error instanceof CloudflareApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
}

async function requestStreamDownload(uid: string) {
  const raw = await cloudflareFetch<unknown>(`/stream/${uid}/downloads`, {
    method: "POST",
  });
  return streamDownloadsSchema.safeParse(raw);
}

async function waitForStreamReady(
  uid: string,
  maxAttempts: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const raw = await cloudflareFetch<unknown>(`/stream/${uid}`);
    const parsed = streamReadySchema.safeParse(raw);
    if (parsed.success && parsed.data.readyToStream === true) {
      return true;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(2_000);
    }
  }
  return false;
}

async function waitForDownloadReady(
  uid: string,
  maxAttempts: number,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const parsed = await getStreamDownloadState(uid);
    const download = parsed?.success ? parsed.data.default : undefined;
    if (download?.status === "ready") {
      return download.url;
    }
    if (!download && attempt === 0) {
      await requestStreamDownload(uid);
    }
    if (attempt < maxAttempts - 1) {
      await sleep(2_000);
    }
  }
  return null;
}

async function createStreamClip(options: {
  clippedFromVideoUID: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  name: string;
}): Promise<{ uid: string; requireSignedURLs: boolean }> {
  const scheduledDeletion = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const raw = await cloudflareFetch<unknown>("/stream/clip", {
    method: "POST",
    body: JSON.stringify({
      clippedFromVideoUID: options.clippedFromVideoUID,
      startTimeSeconds: options.startTimeSeconds,
      endTimeSeconds: options.endTimeSeconds,
      scheduledDeletion,
      meta: { name: options.name },
    }),
  });

  const parsed = streamClipResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CloudflareApiError("Failed to create Stream clip.", 0);
  }

  const ready =
    parsed.data.readyToStream === true ||
    (await waitForStreamReady(parsed.data.uid, 10));
  if (!ready) {
    throw new CloudflareApiError("Clip is still processing. Try again shortly.", 408);
  }

  return {
    uid: parsed.data.uid,
    requireSignedURLs: parsed.data.requireSignedURLs === true,
  };
}

async function resolveDownloadUid(options: {
  streamUid: string;
  startSeconds: number;
  endSeconds: number;
  title: string;
  durationSeconds: number | null;
}): Promise<{ uid: string; requireSignedURLs: boolean }> {
  const { streamUid, startSeconds, endSeconds, title, durationSeconds } = options;
  const clipLength = endSeconds - startSeconds;
  const isPartialClip =
    startSeconds > 0 ||
    (durationSeconds !== null && endSeconds < durationSeconds - 1);

  if (!isPartialClip || clipLength <= 0) {
    const raw = await cloudflareFetch<unknown>(`/stream/${streamUid}`);
    const parsed = streamReadySchema.safeParse(raw);
    return {
      uid: streamUid,
      requireSignedURLs: parsed.success && parsed.data.requireSignedURLs === true,
    };
  }

  return createStreamClip({
    clippedFromVideoUID: streamUid,
    startTimeSeconds: startSeconds,
    endTimeSeconds: endSeconds,
    name: title,
  });
}

export type StreamDownloadResult =
  | { status: "ready"; url: string }
  | { status: "processing" };

export async function resolveStreamDownloadUrl(options: {
  streamUid: string;
  startSeconds: number;
  endSeconds: number;
  title: string;
  durationSeconds?: number | null;
}): Promise<StreamDownloadResult> {
  try {
    const target = await resolveDownloadUid({
      streamUid: options.streamUid,
      startSeconds: options.startSeconds,
      endSeconds: options.endSeconds,
      title: options.title,
      durationSeconds: options.durationSeconds ?? null,
    });

    let downloadUrl = await waitForDownloadReady(target.uid, 6);
    if (!downloadUrl) {
      return { status: "processing" };
    }

    if (target.requireSignedURLs) {
      const token = await createSignedDownloadToken(target.uid);
      downloadUrl = buildSignedDownloadUrl(token) ?? downloadUrl;
    } else if (!downloadUrl.startsWith("http")) {
      downloadUrl = buildStreamMp4DownloadUrl(target.uid) ?? downloadUrl;
    }

    return { status: "ready", url: downloadUrl };
  } catch (error) {
    if (error instanceof CloudflareApiError && error.status === 408) {
      return { status: "processing" };
    }
    throw error;
  }
}

export function appendDownloadFilename(url: string, filename: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set(
    "filename",
    filename.endsWith(".mp4") ? filename : `${filename}.mp4`,
  );
  return parsed.toString();
}

export function sanitizeDownloadFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "nia-football-video";
}
