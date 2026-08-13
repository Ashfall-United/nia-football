import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../support/supabase-mock";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

// requireAuthenticatedUser/getAuthenticatedUser are wrapped in React's
// cache(), which memoizes per request in real Next.js. That memoization
// must not leak between these test cases (each simulates a different
// user/session) — reset the module registry and re-import dal.ts fresh
// for every test so each gets an uncached instance, regardless of how
// cache() behaves outside a real request.
async function freshDal() {
  vi.resetModules();
  const supabaseServer = await import("@/services/supabase/server");
  return { dal: await import("@/lib/auth/dal"), supabaseServer };
}

function mockSupabase(
  supabaseServer: Awaited<ReturnType<typeof freshDal>>["supabaseServer"],
  responses: Record<string, { data: unknown; error: unknown }>,
  getUserResult: { data: { user: unknown }; error: unknown },
) {
  const mock = createSupabaseMock(responses);
  mock.getUser.mockResolvedValue(getUserResult);
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mock.client as never);
  return mock;
}

describe("requireAuthenticatedUser (authentication)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when there is no authenticated session", async () => {
    const { dal, supabaseServer } = await freshDal();
    mockSupabase(supabaseServer, {}, { data: { user: null }, error: null });

    await expect(dal.requireAuthenticatedUser()).rejects.toThrow(
      "REDIRECT:/login",
    );
  });

  it("returns the user when a session exists", async () => {
    const { dal, supabaseServer } = await freshDal();
    mockSupabase(
      supabaseServer,
      {},
      { data: { user: { id: "user-1" } }, error: null },
    );

    const user = await dal.requireAuthenticatedUser();
    expect(user).toEqual({ id: "user-1" });
  });
});

describe("requireOrganisationMembership (tenant isolation + permissions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /dashboard when the user has no membership row for this organisation", async () => {
    const { dal, supabaseServer } = await freshDal();
    mockSupabase(
      supabaseServer,
      { organisation_members: { data: null, error: null } },
      { data: { user: { id: "user-1" } }, error: null },
    );

    await expect(
      dal.requireOrganisationMembership("org-1"),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /dashboard when the membership's role isn't in the allowed list", async () => {
    const { dal, supabaseServer } = await freshDal();
    mockSupabase(
      supabaseServer,
      { organisation_members: { data: { role: "viewer" }, error: null } },
      { data: { user: { id: "user-1" } }, error: null },
    );

    await expect(
      dal.requireOrganisationMembership("org-1", ["owner", "admin"]),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("scopes the membership lookup to both the organisation and the specific user", async () => {
    const { dal, supabaseServer } = await freshDal();
    const mock = mockSupabase(
      supabaseServer,
      { organisation_members: { data: { role: "coach" }, error: null } },
      { data: { user: { id: "user-1" } }, error: null },
    );

    await dal.requireOrganisationMembership("org-1");

    const eqCalls = mock.calls.filter(
      (call) => call.table === "organisation_members" && call.method === "eq",
    );
    expect(eqCalls.map((call) => call.args)).toEqual([
      ["organisation_id", "org-1"],
      ["user_id", "user-1"],
    ]);
  });

  it("returns the user and role when membership and role both check out", async () => {
    const { dal, supabaseServer } = await freshDal();
    mockSupabase(
      supabaseServer,
      { organisation_members: { data: { role: "coach" }, error: null } },
      { data: { user: { id: "user-1" } }, error: null },
    );

    const result = await dal.requireOrganisationMembership("org-1", [
      "owner",
      "admin",
      "coach",
    ]);

    expect(result).toEqual({ user: { id: "user-1" }, role: "coach" });
  });
});
