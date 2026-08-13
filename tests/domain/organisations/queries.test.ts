import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../support/supabase-mock";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { createClient } = await import("@/services/supabase/server");
const { getOrganisationBySlugForUser } = await import(
  "@/domain/organisations/queries"
);

function mockSupabaseWith(responses: Record<string, { data: unknown; error: unknown }>) {
  const mock = createSupabaseMock(responses);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

const ORGANISATION_ROW = {
  id: "org-1",
  name: "Ashfall United FC",
  slug: "ashfall-united",
  organisation_type: "academy",
  country: "NG",
  logo_url: null,
  referral_source: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("getOrganisationBySlugForUser (tenant isolation)", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("returns null when no organisation matches the slug — an unknown/guessed slug leaks nothing", async () => {
    mockSupabaseWith({
      organisations: { data: null, error: null },
    });

    const result = await getOrganisationBySlugForUser("no-such-org", "user-1");

    expect(result).toBeNull();
  });

  it("returns null when the organisation exists but the user has no membership row — a real org, wrong tenant", async () => {
    const mock = mockSupabaseWith({
      organisations: { data: ORGANISATION_ROW, error: null },
      organisation_members: { data: null, error: null },
    });

    const result = await getOrganisationBySlugForUser(
      "ashfall-united",
      "user-outside-org",
    );

    expect(result).toBeNull();
    // The membership lookup must be scoped to this specific organisation,
    // not just this user — otherwise a member of *any* org could match.
    const membershipCall = mock.calls.find(
      (call) => call.table === "organisation_members" && call.method === "eq",
    );
    expect(membershipCall?.args).toEqual(["organisation_id", "org-1"]);
  });

  it("returns the membership (with role) when the user really belongs to the organisation", async () => {
    mockSupabaseWith({
      organisations: { data: ORGANISATION_ROW, error: null },
      organisation_members: { data: { role: "coach" }, error: null },
    });

    const result = await getOrganisationBySlugForUser(
      "ashfall-united",
      "user-1",
    );

    expect(result?.id).toBe("org-1");
    expect(result?.role).toBe("coach");
  });
});
