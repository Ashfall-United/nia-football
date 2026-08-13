import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStreamWebhookSignature } from "@/services/cloudflare/webhook";
import { ingestLiveRecording } from "@/domain/cameras/live-recording";

// One-time setup, once this app is deployed at a real public URL
// (can't be done against localhost): register this endpoint with
// Cloudflare Stream and save the secret it returns as
// CLOUDFLARE_STREAM_WEBHOOK_SECRET.
//
//   curl -X PUT \
//     "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/stream/webhook" \
//     -H "Authorization: Bearer $CLOUDFLARE_STREAM_API_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"notificationUrl": "https://<your-domain>/api/webhooks/cloudflare-stream"}'
//
// The response body's `result.secret` is the value to set.

// Cloudflare Stream calls this for every video state change (uploads,
// encoding, live input connect/disconnect). We only care about one case:
// a live input's automatic recording becoming ready to stream — that's
// when `readyToStream` is true and `liveInput` is set. Direct uploads
// already get their `videos` row created explicitly by
// createVideoUploadAction/markVideoReadyAction when the browser upload
// finishes, so everything else here is intentionally ignored.
const webhookPayloadSchema = z.object({
  uid: z.string(),
  readyToStream: z.boolean().optional(),
  liveInput: z.string().optional(),
  duration: z.number().optional(),
});

export async function POST(request: Request) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[webhooks] CLOUDFLARE_STREAM_WEBHOOK_SECRET is not configured.",
    );
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // Signature verification needs the exact raw bytes Cloudflare signed —
  // parsing to JSON first (and re-serializing) could change whitespace
  // and break the signature check, so read as text first.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("Webhook-Signature");

  if (!verifyStreamWebhookSignature(rawBody, signatureHeader, secret)) {
    console.error(
      "[webhooks] Cloudflare Stream webhook signature verification failed.",
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = webhookPayloadSchema.safeParse(json);
  if (!parsed.success) {
    console.error(
      "[webhooks] Unexpected Cloudflare Stream webhook payload:",
      parsed.error.format(),
    );
    // Acknowledge anyway — this is a shape we don't handle, not an
    // error Cloudflare should retry.
    return NextResponse.json({ received: true });
  }

  const { uid, readyToStream, liveInput, duration } = parsed.data;

  if (!readyToStream || !liveInput) {
    return NextResponse.json({ received: true });
  }

  const result = await ingestLiveRecording({
    liveInputUid: liveInput,
    recordingUid: uid,
    durationSeconds: duration ?? null,
  });

  if (result.status === "skipped") {
    console.warn("[webhooks] Skipped ingesting live recording:", result.reason);
  }

  return NextResponse.json({ received: true });
}
