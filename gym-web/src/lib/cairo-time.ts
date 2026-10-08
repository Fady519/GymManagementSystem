import { GYM_TIME_ZONE } from "@/lib/format";

/**
 * Cairo time <-> UTC.
 *
 * The API only accepts and returns UTC ("2026-10-10T16:00:00Z"). People at the gym think in
 * Cairo time ("Saturday 19:00"). Egypt uses summer time (UTC+3) part of the year and UTC+2 the
 * rest, so we never add a fixed number of hours: we ask the browser's time-zone database
 * (Intl) what the offset is on that exact date.
 *
 * Plain dates are strings "YYYY-MM-DD" (what <input type="date"> gives) and times are
 * "HH:mm" (what <input type="time"> gives).
 */

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: GYM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type CairoParts = { year: number; month: number; day: number; hour: number; minute: number };

/** The Cairo calendar date and clock time of a moment. */
export function cairoParts(utc: string | Date): CairoParts {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(new Date(utc))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    // Some browsers write midnight as "24".
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** How many minutes Cairo is ahead of UTC at that moment (120 in winter, 180 in summer). */
function cairoOffsetMinutes(utcMs: number): number {
  const p = cairoParts(new Date(utcMs));
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asIfUtc - utcMs) / 60_000);
}

/** "2026-10-10" + "19:00" in Cairo -> the UTC ISO string the API expects ("...Z"). */
export function cairoToUtc(date: string, time = "00:00"): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  // First guess with the offset of that wall time, then correct once in case the guess
  // landed on the other side of a summer-time change.
  let utc = wallAsUtc - cairoOffsetMinutes(wallAsUtc) * 60_000;
  utc = wallAsUtc - cairoOffsetMinutes(utc) * 60_000;
  return new Date(utc).toISOString();
}

/** A UTC moment -> the Cairo values for the form inputs: { date: "2026-10-10", time: "19:00" }. */
export function utcToCairoInputs(utc: string | Date): { date: string; time: string } {
  const p = cairoParts(utc);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

/** Today's date in Cairo, "YYYY-MM-DD". */
export function cairoToday(now: Date = new Date()): string {
  return utcToCairoInputs(now).date;
}

/** Minutes since Cairo midnight, e.g. 19:30 -> 1170 (used to place classes on the calendar). */
export function cairoMinuteOfDay(utc: string | Date): number {
  const p = cairoParts(utc);
  return p.hour * 60 + p.minute;
}

/** "2026-10-10" + 3 days -> "2026-10-13". Plain calendar math, no time zones involved. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** 0 = Sunday ... 6 = Saturday, for a plain date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True for a real "YYYY-MM-DD" date (used to check values read from the URL). */
export function isPlainDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDays(value, 0) === value;
}

/** In Egypt the working week starts on Saturday, so the calendar does too. */
export const WEEK_START_DAY = 6;

/** The Saturday on or before a date. */
export function startOfWeek(date: string): string {
  const back = (weekdayOf(date) - WEEK_START_DAY + 7) % 7;
  return addDays(date, -back);
}

/** First day of the month of a date: "2026-10-17" -> "2026-10-01". */
export function startOfMonth(date: string): string {
  return `${date.slice(0, 8)}01`;
}

const plainFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });

const weekdayShort = plainFormatter({ weekday: "short" });
const dayMonth = plainFormatter({ day: "numeric", month: "short" });
const dayMonthYear = plainFormatter({ day: "numeric", month: "short", year: "numeric" });

const toUtcDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** "2026-10-10" -> "Sat" */
export function formatWeekday(date: string): string {
  return weekdayShort.format(toUtcDate(date));
}

/** "2026-10-10" -> "10 Oct" */
export function formatPlainDay(date: string): string {
  return dayMonth.format(toUtcDate(date));
}

/** "2026-10-10" -> "10 Oct 2026" */
export function formatPlainDate(date: string): string {
  return dayMonthYear.format(toUtcDate(date));
}

/** A week label: "10 – 16 Oct 2026", or "28 Sep – 4 Oct 2026" across months. */
export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth ? String(Number(weekStart.slice(8))) : formatPlainDay(weekStart);
  return `${first} – ${formatPlainDate(end)}`;
}
