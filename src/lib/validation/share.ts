import { z } from "zod";

export const shareResourceTypeSchema = z.enum(["clip", "playlist"]);

export const createShareLinkSchema = z.object({
  resourceType: shareResourceTypeSchema,
  resourceId: z.string().uuid({ error: "Resource not found." }),
});

const sharedPlaylistClipPreviewSchema = z.object({
  title: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  streamUid: z.string(),
  position: z.number(),
});

const sharedClipPreviewSchema = z.object({
  resourceType: z.literal("clip"),
  organisationName: z.string(),
  title: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  notes: z.string().nullable(),
  videoId: z.string().uuid(),
  streamUid: z.string(),
});

const sharedPlaylistPreviewSchema = z.object({
  resourceType: z.literal("playlist"),
  organisationName: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  clips: z.array(sharedPlaylistClipPreviewSchema),
});

export const sharedLinkExpiredSchema = z.object({
  expired: z.literal(true),
});

export const sharedLinkPreviewSchema = z.discriminatedUnion("resourceType", [
  sharedClipPreviewSchema,
  sharedPlaylistPreviewSchema,
]);

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
