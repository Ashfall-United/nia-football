const DISPLAY_DATE_LOCALE = "en-GB";

export function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString(DISPLAY_DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
