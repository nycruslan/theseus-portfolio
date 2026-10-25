// The Log's dates in words (.crew/sprint/32/contract.md, "What the page shows"), all in UTC, the
// merge record's clock. Written out rather than by Intl: an ICU update changes a locale's short
// months ("Sept" in en-GB), and the page must say what the checks expect on every build.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** The UTC day an instant falls on, "2026-10-24": a day group's key and its `dateTime`. */
export function utcDay(instant: string): string {
  return new Date(instant).toISOString().slice(0, 10);
}

/** "24 Oct", with the year ("24 Oct 2025") only when it isn't `year`, the newest record's. */
export function dayWords(instant: string, year: number): string {
  const date = new Date(instant);
  const day = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return date.getUTCFullYear() === year
    ? day
    : `${day} ${date.getUTCFullYear()}`;
}

/** A day group's day: "Sat 24 Oct", the year as in `dayWords`. */
export function weekdayWords(instant: string, year: number): string {
  return `${WEEKDAYS[new Date(instant).getUTCDay()]} ${dayWords(instant, year)}`;
}

/** The record's Date, "24 Oct 2026, 03:36 UTC" (the year always), as its day and its time. */
export function instantWords(instant: string): { day: string; time: string } {
  const date = new Date(instant);
  return {
    day: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`,
  };
}

/** The year of an instant, in UTC. */
export function utcYear(instant: string): number {
  return new Date(instant).getUTCFullYear();
}
