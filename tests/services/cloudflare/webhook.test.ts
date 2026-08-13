import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStreamWebhookSignature } from "@/services/cloudflare/webhook";

const SECRET = "test-webhook-secret";
const BODY = JSON.stringify({ uid: "video-1", readyToStream: true });

function sign(body: string, secret: string, time: number): string {
  const hmac = createHmac("sha256", secret).update(`${time}.${body}`).digest("hex");
  return `time=${time},sig1=${hmac}`;
}

describe("verifyStreamWebhookSignature", () => {
  it("accepts a correctly signed, fresh payload", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = sign(BODY, SECRET, now);

    expect(verifyStreamWebhookSignature(BODY, header, SECRET)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = sign(BODY, "wrong-secret", now);

    expect(verifyStreamWebhookSignature(BODY, header, SECRET)).toBe(false);
  });

  it("rejects when the body was tampered with after signing", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = sign(BODY, SECRET, now);
    const tamperedBody = JSON.stringify({ uid: "video-2", readyToStream: true });

    expect(verifyStreamWebhookSignature(tamperedBody, header, SECRET)).toBe(
      false,
    );
  });

  it("rejects a missing signature header", () => {
    expect(verifyStreamWebhookSignature(BODY, null, SECRET)).toBe(false);
  });

  it("rejects a malformed signature header", () => {
    expect(
      verifyStreamWebhookSignature(BODY, "not-a-valid-header", SECRET),
    ).toBe(false);
  });

  it("rejects a stale signature outside the replay window", () => {
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 10 * 60;
    const header = sign(BODY, SECRET, tenMinutesAgo);

    expect(verifyStreamWebhookSignature(BODY, header, SECRET)).toBe(false);
  });
});
