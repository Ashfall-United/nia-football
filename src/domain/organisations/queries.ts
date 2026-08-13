import "server-only";
import { createClient } from "@/services/supabase/server";
import type { OrganisationMembership } from "./types";

const ORGANISATION_COLUMNS =
  "id, name, slug, organisation_type, country, logo_url, referral_source, created_at";

function mapOrganisationRow(
  org: {
    id: string;
    name: string;
    slug: string;
    organisation_type: OrganisationMembership["organisationType"];
    country: string;
    logo_url: string | null;
    referral_source: string | null;
    created_at: string;
    plan?: OrganisationMembership["plan"];
  },
  role: OrganisationMembership["role"],
): OrganisationMembership {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    organisationType: org.organisation_type,
    country: org.country,
    logoUrl: org.logo_url,
    referralSource: org.referral_source,
    plan: org.plan ?? "early_access",
    createdAt: org.created_at,
    role,
  };
}

export async function listOrganisationsForUser(
  userId: string,
): Promise<OrganisationMembership[]> {
  const supabase = await createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    console.error(
      "[organisations] Failed to load memberships:",
      membershipError,
    );
    throw new Error("Failed to load organisation memberships.");
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const organisationIds = memberships.map((m) => m.organisation_id);

  const { data: organisations, error: organisationError } = await supabase
    .from("organisations")
    .select(ORGANISATION_COLUMNS)
    .in("id", organisationIds);

  if (organisationError) {
    console.error(
      "[organisations] Failed to load organisations:",
      organisationError,
    );
    throw new Error("Failed to load organisations.");
  }

  const roleByOrganisationId = new Map(
    memberships.map((m) => [m.organisation_id, m.role]),
  );

  return (organisations ?? []).map((org) =>
    mapOrganisationRow(org, roleByOrganisationId.get(org.id)!),
  );
}

// RLS already scopes the organisations SELECT to rows the user is a member
// of, so a non-member querying by slug simply gets no row back — the slug's
// existence is never leaked to a non-member.
export async function getOrganisationBySlugForUser(
  slug: string,
  userId: string,
): Promise<OrganisationMembership | null> {
  const supabase = await createClient();

  const { data: organisation, error: organisationError } = await supabase
    .from("organisations")
    .select(ORGANISATION_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (organisationError) {
    console.error(
      "[organisations] Failed to load organisation:",
      organisationError,
    );
    throw new Error("Failed to load organisation.");
  }

  if (!organisation) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisation.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  return mapOrganisationRow(organisation, membership.role);
}

export type OrganisationOverviewStats = {
  teams: number;
  clips: number;
  cameras: number;
};

export async function getOrganisationOverviewStats(
  organisationId: string,
): Promise<OrganisationOverviewStats> {
  const supabase = await createClient();

  const [teams, clips, cameras] = await Promise.all([
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId),
    supabase
      .from("clips")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId),
    supabase
      .from("cameras")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId),
  ]);

  if (teams.error || clips.error || cameras.error) {
    console.error("[organisations] Failed to load overview stats:", {
      teams: teams.error,
      clips: clips.error,
      cameras: cameras.error,
    });
    throw new Error("Failed to load organisation overview.");
  }

  return {
    teams: teams.count ?? 0,
    clips: clips.count ?? 0,
    cameras: cameras.count ?? 0,
  };
}

export type OrganisationUsageStats = {
  videos: number;
  totalDurationSeconds: number;
  clips: number;
  events: number;
  members: number;
  storageEstimateGb: number;
};

const BYTES_PER_VIDEO_MINUTE = 2_500_000;

export async function getOrganisationUsageStats(
  organisationId: string,
): Promise<OrganisationUsageStats> {
  const supabase = await createClient();

  const [videosResult, clipsResult, eventsResult, membersResult] =
    await Promise.all([
      supabase
        .from("videos")
        .select("duration_seconds")
        .eq("organisation_id", organisationId)
        .eq("status", "ready"),
      supabase
        .from("clips")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", organisationId),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", organisationId),
      supabase
        .from("organisation_members")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", organisationId),
    ]);

  if (
    videosResult.error ||
    clipsResult.error ||
    eventsResult.error ||
    membersResult.error
  ) {
    console.error("[organisations] Failed to load usage stats:", {
      videos: videosResult.error,
      clips: clipsResult.error,
      events: eventsResult.error,
      members: membersResult.error,
    });
    throw new Error("Failed to load organisation usage.");
  }

  const videoRows = videosResult.data ?? [];
  const totalDurationSeconds = videoRows.reduce(
    (sum, video) => sum + (video.duration_seconds ?? 0),
    0,
  );
  const storageEstimateBytes =
    (totalDurationSeconds / 60) * BYTES_PER_VIDEO_MINUTE;

  return {
    videos: videoRows.length,
    totalDurationSeconds,
    clips: clipsResult.count ?? 0,
    events: eventsResult.count ?? 0,
    members: membersResult.count ?? 0,
    storageEstimateGb: storageEstimateBytes / 1_000_000_000,
  };
}
