import type { EventType, EventReviewStatus } from "@/types/database";

export type { EventType, EventReviewStatus };

export type Event = {
  id: string;
  organisationId: string;
  videoId: string;
  type: EventType;
  timestampSeconds: number;
  reviewStatus: EventReviewStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  playerIds: string[];
};
