import { describe, expect, it } from "vitest";
import { saveCalibrationSchema } from "@/lib/validation/analysis";

const VALID_POINTS = [
  { fractionX: 0.1, fractionY: 0.9, pitchX: 0, pitchY: 0 },
  { fractionX: 0.9, fractionY: 0.9, pitchX: 105, pitchY: 0 },
  { fractionX: 0.9, fractionY: 0.1, pitchX: 105, pitchY: 68 },
  { fractionX: 0.1, fractionY: 0.1, pitchX: 0, pitchY: 68 },
];

describe("saveCalibrationSchema", () => {
  it("rejects fewer than 4 calibration points — a homography can't be computed from less", () => {
    const result = saveCalibrationSchema.safeParse({
      pitchLengthMeters: 105,
      pitchWidthMeters: 68,
      points: VALID_POINTS.slice(0, 3),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive pitch length", () => {
    const result = saveCalibrationSchema.safeParse({
      pitchLengthMeters: 0,
      pitchWidthMeters: 68,
      points: VALID_POINTS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a pitch dimension that's unrealistically large", () => {
    const result = saveCalibrationSchema.safeParse({
      pitchLengthMeters: 105,
      pitchWidthMeters: 5000,
      points: VALID_POINTS,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a calibration point with a negative pitch coordinate", () => {
    const result = saveCalibrationSchema.safeParse({
      pitchLengthMeters: 105,
      pitchWidthMeters: 68,
      points: [
        ...VALID_POINTS.slice(0, 3),
        { fractionX: 0.5, fractionY: 0.5, pitchX: -1, pitchY: 30 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts 4 well-formed calibration points with realistic pitch dimensions", () => {
    const result = saveCalibrationSchema.safeParse({
      pitchLengthMeters: 105,
      pitchWidthMeters: 68,
      points: VALID_POINTS,
    });
    expect(result.success).toBe(true);
  });
});
