export type Clip = {
  id: string;
  organisationId: string;
  videoId: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  notes: string | null;
  sourceEventId: string | null;
  createdBy: string;
  createdAt: string;
};

export type ClipWithContext = Clip & {
  sessionId: string;
  teamId: string;
  teamName: string;
  sessionScheduledAt: string;
};
