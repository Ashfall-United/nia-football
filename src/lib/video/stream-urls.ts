const CUSTOMER_CODE = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;

export function buildStreamThumbnailUrl(
  videoUid: string,
  height = 600,
): string | null {
  if (!CUSTOMER_CODE) {
    return null;
  }
  return `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${videoUid}/thumbnails/thumbnail.jpg?time=&height=${height}`;
}

export function buildStreamIframeSrc(
  videoUid: string,
  options?: { startTime?: number },
): string | null {
  if (!CUSTOMER_CODE) {
    return null;
  }
  const base = `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${videoUid}`;
  const poster = `${base}/thumbnails/thumbnail.jpg?time=&height=600`;
  const iframe = `${base}/iframe?poster=${encodeURIComponent(poster)}`;
  if (options?.startTime !== undefined && options.startTime > 0) {
    return `${iframe}&startTime=${Math.floor(options.startTime)}`;
  }
  return iframe;
}

export function buildStreamHlsUrl(videoUid: string): string | null {
  if (!CUSTOMER_CODE) {
    return null;
  }
  return `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${videoUid}/manifest/video.m3u8`;
}

/** Progressive MP4 — OpenCV reads this more reliably than HLS for ML jobs. */
export function buildStreamMp4DownloadUrl(videoUid: string): string | null {
  if (!CUSTOMER_CODE) {
    return null;
  }
  return `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${videoUid}/downloads/default.mp4`;
}

export function buildLiveInputIframeSrc(liveInputUid: string): string | null {
  if (!CUSTOMER_CODE) {
    return null;
  }
  return `https://customer-${CUSTOMER_CODE}.cloudflarestream.com/${liveInputUid}/iframe`;
}
