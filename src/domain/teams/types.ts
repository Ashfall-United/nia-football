export type Team = {
  id: string;
  organisationId: string;
  name: string;
  createdAt: string;
};

export type TeamWithStats = Team & {
  playerCount: number;
  sessionCount: number;
};
