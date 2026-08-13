import type { PlayerPosition } from "@/types/database";

export type { PlayerPosition };

export type Player = {
  id: string;
  organisationId: string;
  teamId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  position: PlayerPosition | null;
  jerseyNumber: number | null;
  photoPath: string;
  createdAt: string;
};
