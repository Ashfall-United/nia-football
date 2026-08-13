"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import {
  saveCalibrationAction,
  generateHeatmapAction,
  type SaveCalibrationActionState,
} from "@/domain/analysis/actions";
import type { CalibrationPoint, Heatmap, HeatmapTarget } from "@/domain/analysis/types";
import { useActionSuccess } from "@/hooks/use-action-success";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PitchHeatmap } from "./pitch-heatmap";

const initialSaveState: SaveCalibrationActionState = undefined;

const HEATMAP_TARGETS: { value: HeatmapTarget; label: string }[] = [
  { value: "person", label: "Player" },
  { value: "ball", label: "Ball" },
];

type CalibrationSummary = {
  id: string;
  pitchLengthMeters: number;
  pitchWidthMeters: number;
  points: CalibrationPoint[];
};

/** Form draft — pitch coords stay as strings so empty fields aren't shown as 0. */
type DraftCalibrationPoint = {
  fractionX: number;
  fractionY: number;
  pitchX: string;
  pitchY: string;
};

function toDraftPoint(point: CalibrationPoint): DraftCalibrationPoint {
  return {
    fractionX: point.fractionX,
    fractionY: point.fractionY,
    pitchX: String(point.pitchX),
    pitchY: String(point.pitchY),
  };
}

function serializeDraftPoints(
  points: DraftCalibrationPoint[],
): CalibrationPoint[] | null {
  const serialized: CalibrationPoint[] = [];
  for (const point of points) {
    const pitchX = Number(point.pitchX);
    const pitchY = Number(point.pitchY);
    if (
      point.pitchX.trim() === "" ||
      point.pitchY.trim() === "" ||
      !Number.isFinite(pitchX) ||
      !Number.isFinite(pitchY)
    ) {
      return null;
    }
    serialized.push({
      fractionX: point.fractionX,
      fractionY: point.fractionY,
      pitchX,
      pitchY,
    });
  }
  return serialized;
}

const PITCH_CORNER_COORDS = [
  { label: "Bottom-left corner", pitchX: 0, pitchY: 0 },
  { label: "Bottom-right corner", pitchX: "length", pitchY: 0 },
  { label: "Top-right corner", pitchX: "length", pitchY: "width" },
  { label: "Top-left corner", pitchX: 0, pitchY: "width" },
] as const;

function formatFramePosition(fractionX: number, fractionY: number): string {
  return `${Math.round(fractionX * 100)}% from left, ${Math.round(fractionY * 100)}% from top`;
}

export function PitchAnalysisPanel({
  slug,
  videoId,
  thumbnailUrl,
  calibration,
  heatmaps,
}: {
  slug: string;
  videoId: string;
  thumbnailUrl: string | null;
  calibration: CalibrationSummary | null;
  heatmaps: Heatmap[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!calibration);
  const [pitchLength, setPitchLength] = useState(
    String(calibration?.pitchLengthMeters ?? 105),
  );
  const [pitchWidth, setPitchWidth] = useState(
    String(calibration?.pitchWidthMeters ?? 68),
  );
  const [points, setPoints] = useState<DraftCalibrationPoint[]>(
    () => (calibration?.points ?? []).map(toDraftPoint),
  );
  const [saveClientError, setSaveClientError] = useState<string | null>(null);
  const [generatingTarget, setGeneratingTarget] = useState<HeatmapTarget | null>(
    null,
  );
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [, startGenerate] = useTransition();

  const boundSave = saveCalibrationAction.bind(null, slug, videoId);
  const [saveState, saveFormAction, savePending] = useActionState(
    boundSave,
    initialSaveState,
  );

  useActionSuccess(
    savePending,
    Boolean(saveState?.error || saveState?.fieldErrors),
    () => {
      setExpanded(false);
      router.refresh();
    },
  );

  function handleImageClick(event: React.MouseEvent<HTMLImageElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPoints((current) => [
      ...current,
      {
        fractionX: (event.clientX - rect.left) / rect.width,
        fractionY: (event.clientY - rect.top) / rect.height,
        pitchX: "",
        pitchY: "",
      },
    ]);
  }

  function fillPitchCornersInClickOrder() {
    const length = Number(pitchLength);
    const width = Number(pitchWidth);
    if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) {
      setSaveClientError("Enter valid pitch length and width first.");
      return;
    }
    if (points.length !== 4) {
      setSaveClientError("Add exactly 4 clicked points before using corner fill.");
      return;
    }

    setSaveClientError(null);
    setPoints((current) =>
      current.map((point, index) => {
        const corner = PITCH_CORNER_COORDS[index];
        if (!corner) {
          return point;
        }
        const pitchX =
          corner.pitchX === "length" ? length : corner.pitchX;
        const pitchY =
          corner.pitchY === "width" ? width : corner.pitchY;
        return {
          ...point,
          pitchX: String(pitchX),
          pitchY: String(pitchY),
        };
      }),
    );
  }

  function handleSaveSubmit(event: React.FormEvent<HTMLFormElement>) {
    const serialized = serializeDraftPoints(points);
    if (!serialized || serialized.length < 4) {
      event.preventDefault();
      setSaveClientError(
        "Enter the real pitch position in meters for every clicked point.",
      );
      return;
    }
    setSaveClientError(null);
  }

  function updatePoint(
    index: number,
    field: "pitchX" | "pitchY",
    value: string,
  ) {
    setSaveClientError(null);
    setPoints((current) =>
      current.map((point, i) =>
        i === index ? { ...point, [field]: value } : point,
      ),
    );
  }

  function removePoint(index: number) {
    setPoints((current) => current.filter((_, i) => i !== index));
  }

  function handleGenerate(target: HeatmapTarget) {
    setGenerateError(null);
    setGeneratingTarget(target);
    startGenerate(async () => {
      const result = await generateHeatmapAction(slug, videoId, target);
      setGeneratingTarget(null);
      if (result?.error) {
        setGenerateError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const latestByTarget = new Map(
    heatmaps.map((heatmap) => [heatmap.target, heatmap]),
  );

  const serializedPoints = serializeDraftPoints(points);
  const canSave =
    points.length >= 4 &&
    serializedPoints !== null &&
    serializedPoints.length >= 4;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <h3 className="font-heading text-base font-semibold uppercase tracking-wide">
            Pitch analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            Calibrate the pitch once, then generate player and ball position
            heatmaps from tracked footage.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? "Hide calibration"
            : calibration
              ? "Edit calibration"
              : "Calibrate pitch"}
        </Button>
      </div>

      {expanded &&
        (thumbnailUrl ? (
          <form action={saveFormAction} className="space-y-5" onSubmit={handleSaveSubmit}>
            <input
              type="hidden"
              name="points"
              value={JSON.stringify(serializedPoints ?? [])}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pitch-length">Pitch length (m)</Label>
                <Input
                  id="pitch-length"
                  name="pitchLengthMeters"
                  type="number"
                  step="0.1"
                  min="1"
                  value={pitchLength}
                  onChange={(event) => setPitchLength(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pitch-width">Pitch width (m)</Label>
                <Input
                  id="pitch-width"
                  name="pitchWidthMeters"
                  type="number"
                  step="0.1"
                  min="1"
                  value={pitchWidth}
                  onChange={(event) => setPitchWidth(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Click at least 4 known pitch points on the frame</Label>
              <p className="text-xs text-muted-foreground">
                Each click marks a spot on the video frame. Then enter where
                that same spot is on the real pitch in meters (X along the
                length, Y across the width).
              </p>
              <div className="relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element -- calibration needs raw click coordinates against the actual rendered image, which next/image's automatic sizing complicates */}
                <img
                  src={thumbnailUrl}
                  alt="Video frame for pitch calibration"
                  className="w-full cursor-crosshair select-none"
                  onClick={handleImageClick}
                />
                {points.map((point, index) => (
                  <div
                    key={index}
                    className="pointer-events-none absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow"
                    style={{
                      left: `${point.fractionX * 100}%`,
                      top: `${point.fractionY * 100}%`,
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>

            {points.length > 0 && (
              <div className="space-y-2">
                {points.length === 4 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={fillPitchCornersInClickOrder}
                    >
                      Fill pitch corners (click order)
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Use when points 1–4 are bottom-left → bottom-right →
                      top-right → top-left.
                    </p>
                  </div>
                )}
                <ul className="space-y-2">
                {points.map((point, index) => (
                  <li
                    key={index}
                    className="space-y-2 rounded-lg border bg-muted/30 p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        On frame: {formatFramePosition(point.fractionX, point.fractionY)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Pitch X (m)"
                      value={point.pitchX}
                      onChange={(event) =>
                        updatePoint(index, "pitchX", event.target.value)
                      }
                      className="h-8"
                      aria-label={`Point ${index + 1} pitch X in meters`}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Pitch Y (m)"
                      value={point.pitchY}
                      onChange={(event) =>
                        updatePoint(index, "pitchY", event.target.value)
                      }
                      className="h-8"
                      aria-label={`Point ${index + 1} pitch Y in meters`}
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removePoint(index)}
                      aria-label={`Remove point ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                    </div>
                  </li>
                ))}
                </ul>
              </div>
            )}

            {(saveClientError || saveState?.error || saveState?.fieldErrors?.points) && (
              <p className="text-sm text-destructive">
                {saveClientError ??
                  saveState?.error ??
                  saveState?.fieldErrors?.points?.[0]}
              </p>
            )}

            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={savePending || !canSave}>
                {savePending ? "Saving…" : "Save calibration"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            A thumbnail isn&apos;t available for this video yet, so
            calibration can&apos;t be set up.
          </p>
        ))}

      {!expanded && calibration && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {HEATMAP_TARGETS.map((target) => (
              <Button
                key={target.value}
                type="button"
                size="sm"
                variant="outline"
                disabled={generatingTarget !== null}
                onClick={() => handleGenerate(target.value)}
              >
                <Sparkles className="size-4" />
                {generatingTarget === target.value
                  ? "Generating…"
                  : `Generate ${target.label.toLowerCase()} heatmap`}
              </Button>
            ))}
          </div>

          {generateError && (
            <p className="text-sm text-destructive">{generateError}</p>
          )}

          {heatmaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No heatmaps generated yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {HEATMAP_TARGETS.map((target) => {
                const heatmap = latestByTarget.get(target.value);
                if (!heatmap) return null;
                return (
                  <div key={target.value} className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {target.label} — {heatmap.sampleCount} tracked position
                      {heatmap.sampleCount === 1 ? "" : "s"} across{" "}
                      {heatmap.frameCount} sampled frames
                    </p>
                    <PitchHeatmap
                      grid={heatmap.grid}
                      gridCols={heatmap.gridCols}
                      gridRows={heatmap.gridRows}
                      pitchLengthMeters={calibration.pitchLengthMeters}
                      pitchWidthMeters={calibration.pitchWidthMeters}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
