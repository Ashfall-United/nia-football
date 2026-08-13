import type { OrganisationRole } from "@/types/database";

// Teams and players are edited by whoever runs football operations day to
// day. Analysts, media, and viewers only need read access to rosters.
export const ROSTER_MANAGEMENT_ROLES: OrganisationRole[] = [
  "owner",
  "admin",
  "coach",
];

// Camera equipment and stream connections are a media-team function, not
// a coaching one.
export const MEDIA_MANAGEMENT_ROLES: OrganisationRole[] = [
  "owner",
  "admin",
  "media",
];

// Clips and event/player tagging are how coaches and analysts turn
// footage into structured information — media and viewer roles can watch
// but not create.
export const ANALYSIS_MANAGEMENT_ROLES: OrganisationRole[] = [
  "owner",
  "admin",
  "coach",
  "analyst",
];

// Playlists and public share links match migration RLS: coaches can curate
// and share, but analysts/media/viewers are read-only inside the org.
export const PLAYLIST_MANAGEMENT_ROLES: OrganisationRole[] = [
  "owner",
  "admin",
  "coach",
];

// Inviting, removing, and changing organisation roles is restricted to
// owners and admins.
export const MEMBER_MANAGEMENT_ROLES: OrganisationRole[] = ["owner", "admin"];
