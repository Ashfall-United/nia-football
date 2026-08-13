/** Display seconds as m:ss (e.g. 125 → "2:05"). */
export function formatVideoTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

/**
 * Parse analyst-friendly time input into seconds.
 * Accepts "2:05", "02:05", "125", or "1:02:05".
 */
export function parseVideoTimestampInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => part.trim());
    if (parts.some((part) => part === "" || !/^\d+$/.test(part))) {
      return null;
    }

    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1]);
      if (seconds >= 60) return null;
      return minutes * 60 + seconds;
    }

    if (parts.length === 3) {
      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      const seconds = Number(parts[2]);
      if (minutes >= 60 || seconds >= 60) return null;
      return hours * 3600 + minutes * 60 + seconds;
    }

    return null;
  }

  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}
