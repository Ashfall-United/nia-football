import type { SessionType, PitchSurface } from "@/types/database";

export type { SessionType, PitchSurface };

export type Session = {
  id: string;
  organisationId: string;
  teamId: string;
  type: SessionType;
  scheduledAt: string;
  location: string | null;
  pitchSurface: PitchSurface | null;
  notes: string | null;
  opponentName: string | null;
  isHome: boolean | null;
  competition: string | null;
  teamScore: number | null;
  opponentScore: number | null;
  createdAt: string;
};

export type SessionWithTeam = Session & {
  teamName: string;
};
