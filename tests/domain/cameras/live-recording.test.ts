import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../support/supabase-mock";

vi.mock("@/services/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const { createAdminClient } = await import("@/services/supabase/admin");
const { ingestLiveRecording } = await import(
  "@/domain/cameras/live-recording"
);

function mockAdminWith(responses: Record<string, { data: unknown; error: unknown }>) {
  const mock = createSupabaseMock(responses);
  vi.mocked(createAdminClient).mockReturnValue(mock.client as never);
  return mock;
}

describe("ingestLiveRecording", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
  });

  it("skips when no camera is connected to the reported live input", async () => {
    mockAdminWith({
      cameras: { data: null, error: null },
    });

    const result = await ingestLiveRecording({
      liveInputUid: "live-input-unknown",
      recordingUid: "video-1",
      durationSeconds: 90,
    });

    expect(result.status).toBe("skipped");
  });

  it("skips (without guessing) when the camera has no active session set", async () => {
    const mock = mockAdminWith({
      cameras: {
        data: {
          id: "camera-1",
          organisation_id: "org-1",
          active_session_id: null,
        },
        error: null,
      },
    });

    const result = await ingestLiveRecording({
      liveInputUid: "live-input-1",
      recordingUid: "video-1",
      durationSeconds: 90,
    });

    expect(result.status).toBe("skipped");
    // Must not have attempted to insert a video with no session to file
    // it under.
    expect(mock.calls.some((call) => call.table === "videos")).toBe(false);
  });

  it("files the recording under the camera's active session and clears it afterward", async () => {
    const mock = mockAdminWith({
      cameras: {
        data: {
          id: "camera-1",
          organisation_id: "org-1",
          active_session_id: "session-1",
        },
        error: null,
      },
      videos: { data: { id: "video-row-1" }, error: null },
    });

    const result = await ingestLiveRecording({
      liveInputUid: "live-input-1",
      recordingUid: "recording-uid-1",
      durationSeconds: 5400,
    });

    expect(result).toEqual({ status: "ingested", videoId: "video-row-1" });

    const insertCall = mock.calls.find(
      (call) => call.table === "videos" && call.method === "insert",
    );
    expect(insertCall?.args[0]).toMatchObject({
      organisation_id: "org-1",
      session_id: "session-1",
      camera_id: "camera-1",
      cloudflare_stream_uid: "recording-uid-1",
      status: "ready",
      duration_seconds: 5400,
    });

    const clearCall = mock.calls.find(
      (call) => call.table === "cameras" && call.method === "update",
    );
    expect(clearCall?.args[0]).toEqual({ active_session_id: null });
  });
});
