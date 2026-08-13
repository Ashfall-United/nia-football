import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const clipTitleSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter a clip title." })
  .max(120, { error: "Title must be 120 characters or fewer." });

const clipFieldsSchema = z.object({
  title: clipTitleSchema,
  startSeconds: z.coerce
    .number({ error: "Enter a start time." })
    .int()
    .min(0, { error: "Start time can't be negative." }),
  endSeconds: z.coerce
    .number({ error: "Enter an end time." })
    .int()
    .min(0, { error: "End time can't be negative." }),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
});

export const createClipSchema = clipFieldsSchema.refine(
  (data) => data.endSeconds > data.startSeconds,
  {
    error: "End time must be after the start time.",
    path: ["endSeconds"],
  },
);

export const createFullRecordingClipSchema = z.object({
  title: clipTitleSchema,
});

export type CreateClipInput = z.infer<typeof createClipSchema>;
