import { z } from "zod";

export const calibrationPointSchema = z.object({
  fractionX: z.number().min(0).max(1),
  fractionY: z.number().min(0).max(1),
  pitchX: z.number({ error: "Enter a pitch X coordinate." }).min(0),
  pitchY: z.number({ error: "Enter a pitch Y coordinate." }).min(0),
});

export const saveCalibrationSchema = z.object({
  pitchLengthMeters: z.coerce
    .number({ error: "Enter the pitch length." })
    .positive({ error: "Pitch length must be greater than 0." })
    .max(200, { error: "Pitch length looks too large." }),
  pitchWidthMeters: z.coerce
    .number({ error: "Enter the pitch width." })
    .positive({ error: "Pitch width must be greater than 0." })
    .max(200, { error: "Pitch width looks too large." }),
  points: z
    .array(calibrationPointSchema)
    .min(4, { error: "Click at least 4 points before saving." }),
});

export type SaveCalibrationInput = z.infer<typeof saveCalibrationSchema>;

export const heatmapTargetOptions = [
  { value: "person", label: "Players" },
  { value: "ball", label: "Ball" },
] as const;
