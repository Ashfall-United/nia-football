import { z } from "zod";
import type { OrganisationRole } from "@/types/database";

export const invitableRoleOptions = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access except transferring ownership.",
  },
  {
    value: "coach",
    label: "Coach",
    description: "Manage teams, sessions, clips, and event tagging.",
  },
  {
    value: "analyst",
    label: "Analyst",
    description: "Tag events and create clips.",
  },
  {
    value: "media",
    label: "Media",
    description: "Manage cameras and record session footage.",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "View-only access to organisation content.",
  },
] as const;

const invitableRoleValues = invitableRoleOptions.map((option) => option.value);

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Enter a valid email address." }),
  role: z.enum(invitableRoleValues, {
    error: "Select a role.",
  }),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(invitableRoleValues, {
    error: "Select a role.",
  }),
});

export type InvitableRole = (typeof invitableRoleValues)[number];

export function roleLabel(role: OrganisationRole): string {
  if (role === "owner") {
    return "Owner";
  }

  return (
    invitableRoleOptions.find((option) => option.value === role)?.label ??
    role
  );
}

export function roleDescription(role: OrganisationRole): string | null {
  return (
    invitableRoleOptions.find((option) => option.value === role)?.description ??
    null
  );
}
