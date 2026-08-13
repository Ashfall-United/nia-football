import type {
  OrganisationPlan,
  OrganisationRole,
  OrganisationType,
} from "@/types/database";

export type { OrganisationPlan, OrganisationRole, OrganisationType };

export type Organisation = {
  id: string;
  name: string;
  slug: string;
  organisationType: OrganisationType;
  country: string;
  logoUrl: string | null;
  referralSource: string | null;
  plan: OrganisationPlan;
  createdAt: string;
};

export type OrganisationMembership = Organisation & {
  role: OrganisationRole;
};
