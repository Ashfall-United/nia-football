import { z } from "zod";

export const createCameraSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter a camera name." })
    .max(60, { error: "Camera name must be 60 characters or fewer." }),
});

export const updateCameraSchema = createCameraSchema;

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
