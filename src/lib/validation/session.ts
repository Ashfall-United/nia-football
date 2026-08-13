import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const pitchSurfaceOptions = [
  { value: "grass", label: "Grass" },
  { value: "turf", label: "Turf" },
  { value: "gravel", label: "Gravel" },
  { value: "sand", label: "Sand" },
  { value: "mud", label: "Mud" },
  { value: "mixed", label: "Mixed" },
  { value: "other", label: "Other" },
] as const;

const pitchSurfaceValues = pitchSurfaceOptions.map((o) => o.value);

const baseFields = {
  scheduledAt: z.string().min(1, { error: "Choose a date and time." }),
  location: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  pitchSurface: z.preprocess(
    emptyToUndefined,
    z.enum(pitchSurfaceValues).optional(),
  ),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
};

export const createSessionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("training"),
    ...baseFields,
  }),
  z.object({
    type: z.literal("match"),
    ...baseFields,
    opponentName: z
      .string()
      .trim()
      .min(1, { error: "Enter the opponent's name." })
      .max(120, { error: "Must be 120 characters or fewer." }),
    isHome: z.preprocess(
      (value) =>
        value === "true" ? true : value === "false" ? false : undefined,
      z.boolean({ error: "Select home or away." }),
    ),
    competition: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(120).optional(),
    ),
    teamScore: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).max(99).optional(),
    ),
    opponentScore: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0).max(99).optional(),
    ),
  }),
]);

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export const updateSessionSchema = createSessionSchema;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
