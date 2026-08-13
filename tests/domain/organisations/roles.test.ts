import { describe, expect, it } from "vitest";
import {
  ANALYSIS_MANAGEMENT_ROLES,
  MEDIA_MANAGEMENT_ROLES,
  MEMBER_MANAGEMENT_ROLES,
  ROSTER_MANAGEMENT_ROLES,
} from "@/domain/organisations/roles";

const ALL_MANAGEMENT_ROLE_LISTS = [
  ROSTER_MANAGEMENT_ROLES,
  MEDIA_MANAGEMENT_ROLES,
  ANALYSIS_MANAGEMENT_ROLES,
  MEMBER_MANAGEMENT_ROLES,
];

describe("organisation role constants", () => {
  it("never grants the read-only viewer role any management permission", () => {
    for (const roles of ALL_MANAGEMENT_ROLE_LISTS) {
      expect(roles).not.toContain("viewer");
    }
  });

  it("always lets an owner manage everything", () => {
    for (const roles of ALL_MANAGEMENT_ROLE_LISTS) {
      expect(roles).toContain("owner");
    }
  });

  it("always lets an admin manage everything", () => {
    for (const roles of ALL_MANAGEMENT_ROLE_LISTS) {
      expect(roles).toContain("admin");
    }
  });

  it("restricts member management to owners and admins only", () => {
    expect([...MEMBER_MANAGEMENT_ROLES].sort()).toEqual(["admin", "owner"]);
  });

  it("keeps roster management to football-operations roles (owner/admin/coach)", () => {
    expect([...ROSTER_MANAGEMENT_ROLES].sort()).toEqual([
      "admin",
      "coach",
      "owner",
    ]);
  });
});
