import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const positionOptions = [
  { value: "gk", label: "GK — Goalkeeper" },
  { value: "rb", label: "RB — Right-back" },
  { value: "cb", label: "CB — Centre-back" },
  { value: "lb", label: "LB — Left-back" },
  { value: "rwb", label: "RWB — Right wing-back" },
  { value: "lwb", label: "LWB — Left wing-back" },
  { value: "cdm", label: "CDM — Defensive midfielder" },
  { value: "cm", label: "CM — Central midfielder" },
  { value: "cam", label: "CAM — Attacking midfielder" },
  { value: "rm", label: "RM — Right midfielder" },
  { value: "lm", label: "LM — Left midfielder" },
  { value: "rw", label: "RW — Right winger" },
  { value: "lw", label: "LW — Left winger" },
  { value: "st", label: "ST — Striker" },
  { value: "cf", label: "CF — Centre-forward" },
] as const;

const positionValues = positionOptions.map((o) => o.value);

export const positionLabelByValue = new Map(
  positionOptions.map((o) => [o.value, o.label.split(" — ")[0]]),
);

export const createPlayerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { error: "Enter a first name." })
    .max(60, { error: "First name must be 60 characters or fewer." }),
  lastName: z
    .string()
    .trim()
    .min(1, { error: "Enter a last name." })
    .max(60, { error: "Last name must be 60 characters or fewer." }),
  dateOfBirth: z.preprocess(
    emptyToUndefined,
    z.iso.date({ error: "Enter a valid date." }).optional(),
  ),
  position: z.preprocess(
    emptyToUndefined,
    z.enum(positionValues, { error: "Select a position." }).optional(),
  ),
  jerseyNumber: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: "Jersey number must be a number." })
      .int()
      .min(1, { error: "Jersey number must be between 1 and 99." })
      .max(99, { error: "Jersey number must be between 1 and 99." })
      .optional(),
  ),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;

export const updatePlayerSchema = createPlayerSchema;

export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
