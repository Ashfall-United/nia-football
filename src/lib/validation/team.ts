import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter a team name." })
    .max(60, { error: "Team name must be 60 characters or fewer." }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
