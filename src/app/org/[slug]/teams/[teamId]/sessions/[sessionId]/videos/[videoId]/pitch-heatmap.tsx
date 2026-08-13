function maxOf(grid: number[][]): number {
  let max = 0;
  for (const row of grid) {
    for (const value of row) {
      if (value > max) max = value;
    }
  }
  return max;
}

// Renders a saved heatmap grid as filled cells over a plain pitch outline
// (touchlines, halfway line, center circle). Cell opacity is proportional
// to that cell's real detection count relative to the busiest cell in the
// grid — there's no invented data here, just a visualization of the
// counts the ML service returned.
export function PitchHeatmap({
  grid,
  gridCols,
  gridRows,
  pitchLengthMeters,
  pitchWidthMeters,
}: {
  grid: number[][];
  gridCols: number;
  gridRows: number;
  pitchLengthMeters: number;
  pitchWidthMeters: number;
}) {
  const maxCount = maxOf(grid);
  const viewWidth = 1050;
  const viewHeight = Math.max(
    1,
    Math.round((pitchWidthMeters / pitchLengthMeters) * viewWidth),
  );
  const cellWidth = viewWidth / gridCols;
  const cellHeight = viewHeight / gridRows;

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label="Pitch heatmap"
      className="w-full rounded-lg border"
    >
      <rect width={viewWidth} height={viewHeight} fill="#0f5132" />

      {grid.map((row, rowIndex) =>
        row.map((count, colIndex) => {
          if (count <= 0) return null;
          const intensity = maxCount > 0 ? count / maxCount : 0;
          return (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellWidth}
              y={rowIndex * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill="#ef4444"
              fillOpacity={0.12 + intensity * 0.68}
            />
          );
        }),
      )}

      <rect
        x={1}
        y={1}
        width={viewWidth - 2}
        height={viewHeight - 2}
        fill="none"
        stroke="white"
        strokeOpacity={0.55}
        strokeWidth={3}
      />
      <line
        x1={viewWidth / 2}
        y1={0}
        x2={viewWidth / 2}
        y2={viewHeight}
        stroke="white"
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      <circle
        cx={viewWidth / 2}
        cy={viewHeight / 2}
        r={viewHeight * 0.16}
        fill="none"
        stroke="white"
        strokeOpacity={0.55}
        strokeWidth={2}
      />
    </svg>
  );
}
