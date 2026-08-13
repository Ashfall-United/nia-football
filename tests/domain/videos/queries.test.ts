import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../support/supabase-mock";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import("@/services/supabase/server");
const { getVideoForOrganisation } = await import("@/domain/videos/queries");

describe("getVideoForOrganisation (tenant scoping)", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("scopes the lookup by both organisation_id and video id — never id alone", async () => {
    const mock = createSupabaseMock({
      videos: { data: null, error: null },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await getVideoForOrganisation("org-1", "video-1");

    const eqCalls = mock.calls.filter(
      (call) => call.table === "videos" && call.method === "eq",
    );
    // A video belongs to exactly one organisation. If a future edit drops
    // the organisation_id filter (leaving only the id lookup), any
    // authenticated user could fetch any organisation's video by
    // guessing/enumerating its UUID — this is the regression that filter
    // guards against.
    expect(eqCalls.map((call) => call.args)).toEqual([
      ["organisation_id", "org-1"],
      ["id", "video-1"],
    ]);
  });

  it("returns null rather than another organisation's row when nothing matches", async () => {
    const mock = createSupabaseMock({
      videos: { data: null, error: null },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await getVideoForOrganisation("org-1", "video-owned-by-another-org");

    expect(result).toBeNull();
  });
});
