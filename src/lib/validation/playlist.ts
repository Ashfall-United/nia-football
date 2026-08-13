import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const playlistTitleSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter a playlist title." })
  .max(120, { error: "Title must be 120 characters or fewer." });

export const createPlaylistSchema = z.object({
  title: playlistTitleSchema,
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
});

export const addClipToPlaylistSchema = z.object({
  clipId: z.string().uuid({ error: "Choose a clip." }),
});

export const removeClipFromPlaylistSchema = z.object({
  clipId: z.string().uuid({ error: "Clip not found." }),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type AddClipToPlaylistInput = z.infer<typeof addClipToPlaylistSchema>;
