import type { OrganisationRole } from "@/types/database";

export type OrganisationMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: OrganisationRole;
  createdAt: string;
};

export type OrganisationInvite = {
  id: string;
  email: string;
  avatarUrl: string | null;
  role: OrganisationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type OrganisationInvitePreview = {
  organisationName: string;
  organisationSlug: string;
  role: OrganisationRole;
  email: string;
  isExpired: boolean;
  isAccepted: boolean;
};
