import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/dal", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/domain/organisations/queries", () => ({
  getOrganisationBySlugForUser: vi.fn(),
}));

const { requireOrganisationBySlug } = await import(
  "@/domain/organisations/access"
);
const { requireAuthenticatedUser } = await import("@/lib/auth/dal");
const { getOrganisationBySlugForUser } = await import(
  "@/domain/organisations/queries"
);

const MEMBERSHIP = {
  id: "org-1",
  name: "Ashfall United FC",
  slug: "ashfall-united",
  organisationType: "academy",
  country: "NG",
  logoUrl: null,
  referralSource: null,
  plan: "early_access",
  createdAt: "2026-01-01T00:00:00Z",
  role: "coach",
};

describe("requireOrganisationBySlug (tenant isolation + permissions)", () => {
  beforeEach(() => {
    vi.mocked(requireAuthenticatedUser).mockReset();
    vi.mocked(getOrganisationBySlugForUser).mockReset();
    vi.mocked(requireAuthenticatedUser).mockResolvedValue({
      id: "user-1",
    } as never);
  });

  it("redirects to /dashboard when the user has no membership in this organisation", async () => {
    vi.mocked(getOrganisationBySlugForUser).mockResolvedValue(null);

    await expect(
      requireOrganisationBySlug("some-org"),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /dashboard when the user's role isn't in the allowed list", async () => {
    vi.mocked(getOrganisationBySlugForUser).mockResolvedValue({
      ...MEMBERSHIP,
      role: "viewer",
    } as never);

    await expect(
      requireOrganisationBySlug("some-org", ["owner", "admin"]),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("returns the membership when the caller's role is explicitly allowed", async () => {
    vi.mocked(getOrganisationBySlugForUser).mockResolvedValue(
      MEMBERSHIP as never,
    );

    const result = await requireOrganisationBySlug("some-org", [
      "owner",
      "admin",
      "coach",
    ]);

    expect(result.role).toBe("coach");
  });

  it("returns the membership when no roles filter is passed (any member allowed)", async () => {
    vi.mocked(getOrganisationBySlugForUser).mockResolvedValue(
      MEMBERSHIP as never,
    );

    const result = await requireOrganisationBySlug("some-org");

    expect(result).toEqual(MEMBERSHIP);
  });
});
