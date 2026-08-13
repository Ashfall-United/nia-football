import "server-only";
import { createClient } from "@/services/supabase/server";
import type { EventReviewStatus, EventType } from "@/types/database";
import type { Event } from "./types";

const EVENT_COLUMNS =
  "id, organisation_id, video_id, type, timestamp_seconds, review_status, notes, created_by, created_at";

export type EventListFilters = {
  type?: EventType;
  reviewStatus?: EventReviewStatus;
  playerId?: string;
  videoId?: string;
};

type EventRow = {
  id: string;
  organisation_id: string;
  video_id: string;
  type: EventType;
  timestamp_seconds: number;
  review_status: EventReviewStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
};

async function attachPlayerIdsToEvents(
  events: EventRow[],
): Promise<Event[]> {
  if (events.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const eventIds = events.map((event) => event.id);
  const { data: tags, error: tagsError } = await supabase
    .from("event_players")
    .select("event_id, player_id")
    .in("event_id", eventIds);

  if (tagsError) {
    console.error("[events] Failed to load event players:", tagsError);
    throw new Error("Failed to load event players.");
  }

  const playerIdsByEvent = new Map<string, string[]>();
  for (const tag of tags ?? []) {
    const list = playerIdsByEvent.get(tag.event_id) ?? [];
    list.push(tag.player_id);
    playerIdsByEvent.set(tag.event_id, list);
  }

  return events.map((event) => ({
    id: event.id,
    organisationId: event.organisation_id,
    videoId: event.video_id,
    type: event.type,
    timestampSeconds: event.timestamp_seconds,
    reviewStatus: event.review_status,
    notes: event.notes,
    createdBy: event.created_by,
    createdAt: event.created_at,
    playerIds: playerIdsByEvent.get(event.id) ?? [],
  }));
}

function mapEventRow(event: EventRow): Event {
  return {
    id: event.id,
    organisationId: event.organisation_id,
    videoId: event.video_id,
    type: event.type,
    timestampSeconds: event.timestamp_seconds,
    reviewStatus: event.review_status,
    notes: event.notes,
    createdBy: event.created_by,
    createdAt: event.created_at,
    playerIds: [],
  };
}

export async function listEventsForVideo(
  organisationId: string,
  videoId: string,
): Promise<Event[]> {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("video_id", videoId)
    .order("timestamp_seconds");

  if (error) {
    console.error("[events] Failed to load events:", error);
    throw new Error("Failed to load events.");
  }

  return attachPlayerIdsToEvents(events ?? []);
}

export async function listEventsForOrganisation(
  organisationId: string,
  filters: EventListFilters = {},
): Promise<Event[]> {
  const supabase = await createClient();

  let eventIdsForPlayer: string[] | null = null;
  if (filters.playerId) {
    const { data: playerTags, error: playerTagsError } = await supabase
      .from("event_players")
      .select("event_id")
      .eq("player_id", filters.playerId);

    if (playerTagsError) {
      console.error("[events] Failed to filter by player:", playerTagsError);
      throw new Error("Failed to load events.");
    }

    eventIdsForPlayer = (playerTags ?? []).map((tag) => tag.event_id);
    if (eventIdsForPlayer.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.reviewStatus) {
    query = query.eq("review_status", filters.reviewStatus);
  }
  if (filters.videoId) {
    query = query.eq("video_id", filters.videoId);
  }
  if (eventIdsForPlayer) {
    query = query.in("id", eventIdsForPlayer);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error("[events] Failed to load organisation events:", error);
    throw new Error("Failed to load events.");
  }

  return attachPlayerIdsToEvents(events ?? []);
}

export async function listSuggestedEventsForOrganisation(
  organisationId: string,
): Promise<Event[]> {
  return listEventsForOrganisation(organisationId, {
    reviewStatus: "suggested",
  });
}

export type EventCountByType = Partial<Record<EventType, number>>;

export async function getEventCountsByTypeForSessions(
  organisationId: string,
  sessionIds: readonly string[],
): Promise<Map<string, EventCountByType>> {
  if (sessionIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id, session_id")
    .eq("organisation_id", organisationId)
    .in("session_id", [...sessionIds]);

  if (videosError) {
    console.error("[events] Failed to load session videos:", videosError);
    throw new Error("Failed to load session events.");
  }

  if (!videos || videos.length === 0) {
    return new Map(sessionIds.map((sessionId) => [sessionId, {}]));
  }

  const videoIds = videos.map((video) => video.id);
  const sessionIdByVideoId = new Map(
    videos.map((video) => [video.id, video.session_id]),
  );

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("video_id, type")
    .eq("organisation_id", organisationId)
    .in("video_id", videoIds)
    .neq("review_status", "rejected");

  if (eventsError) {
    console.error("[events] Failed to load session event counts:", eventsError);
    throw new Error("Failed to load session events.");
  }

  const countsBySession = new Map<string, EventCountByType>(
    sessionIds.map((sessionId) => [sessionId, {}]),
  );

  for (const event of events ?? []) {
    const sessionId = sessionIdByVideoId.get(event.video_id);
    if (!sessionId) continue;

    const counts = countsBySession.get(sessionId) ?? {};
    counts[event.type] = (counts[event.type] ?? 0) + 1;
    countsBySession.set(sessionId, counts);
  }

  return countsBySession;
}

export async function getEventForOrganisation(
  organisationId: string,
  eventId: string,
): Promise<Event | null> {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("organisation_id", organisationId)
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[events] Failed to load event:", error);
    throw new Error("Failed to load event.");
  }

  if (!event) {
    return null;
  }

  const [mapped] = await attachPlayerIdsToEvents([event]);
  return mapped ?? mapEventRow(event);
}
