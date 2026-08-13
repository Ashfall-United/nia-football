import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

// Cloudflare Stream signs webhook payloads with a header shaped like
// `time=<unix_seconds>,sig1=<hex_hmac_sha256>`. The signed message is
// `${time}.${rawBody}`, HMAC-SHA256'd with the webhook secret Cloudflare
// issued when the notification URL was registered. Verifying this is the
// only thing standing between this endpoint and anyone on the internet
// POSTing a fake "recording ready" event.
export function verifyStreamWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key?.trim(), value?.trim()];
    }),
  );

  const time = parts.time;
  const signature = parts.sig1;
  if (!time || !signature || !/^\d+$/.test(time)) {
    return false;
  }

  // Reject stale signatures — bounds how long a captured request could
  // be replayed.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(time));
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${time}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
