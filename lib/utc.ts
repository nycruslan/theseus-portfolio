// Times as /crew shows them (.crew/sprint/31/contract.md, "Times"): always UTC, whatever zone the
// server or the visitor is in, so every reader sees the same clock. Read from the UTC getters, not
// Intl, so the words never depend on the server's locale data.

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

const twoDigits = (value: number) => String(value).padStart(2, "0");

/** "4 Oct", "24 Oct": the UTC day without a leading zero, the English three-letter month. */
export function utcDay(time: Date): string {
  return `${time.getUTCDate()} ${MONTHS[time.getUTCMonth()]}`;
}

/** "03:56": the UTC time, 24-hour and zero-padded. */
export function utcTime(time: Date): string {
  return `${twoDigits(time.getUTCHours())}:${twoDigits(time.getUTCMinutes())}`;
}
