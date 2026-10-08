import { addDays, cairoToday, startOfMonth } from "@/lib/cairo-time";
import type { RevenuePeriod } from "@/types";

/**
 * The period picker on top of the dashboard charts. The value is kept in the URL (?range=90d),
 * so a reload or a shared link shows the same view.
 */
export const DASHBOARD_RANGES = [
  { value: "7d", label: "Last 7 days", text: "in the last 7 days" },
  { value: "30d", label: "Last 30 days", text: "in the last 30 days" },
  { value: "90d", label: "Last 90 days", text: "in the last 90 days" },
  { value: "12m", label: "Last 12 months", text: "in the last 12 months" },
] as const;

export type DashboardRange = (typeof DASHBOARD_RANGES)[number]["value"];

export const DEFAULT_RANGE: DashboardRange = "30d";

/** Gym-local days (inclusive) the analytics endpoints expect, plus how to group the revenue. */
export type DayRange = { from: string; to: string; period: RevenuePeriod };

/** "2026-10-01" - 11 months -> "2025-11-01" (works on first-of-month dates). */
function addMonths(firstOfMonth: string, months: number): string {
  const [y, m] = firstOfMonth.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * A picker value -> the exact days to ask the API for. Short ranges are grouped per day,
 * the 12-month range per month (12 bars read better than 365).
 */
export function resolveRange(range: DashboardRange, today: string = cairoToday()): DayRange {
  switch (range) {
    case "7d":
      return { from: addDays(today, -6), to: today, period: "Daily" };
    case "90d":
      return { from: addDays(today, -89), to: today, period: "Daily" };
    case "12m":
      return { from: addMonths(startOfMonth(today), -11), to: today, period: "Monthly" };
    default:
      return { from: addDays(today, -29), to: today, period: "Daily" };
  }
}

export function isDashboardRange(value: string): value is DashboardRange {
  return DASHBOARD_RANGES.some((r) => r.value === value);
}

/** Days between two plain dates, both included: ("2026-10-01", "2026-10-30") -> 30. */
function daysInclusive(from: string, to: string): number {
  return (
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  );
}

/** "2026-10-08" -> "2025-10-08" (29 Feb becomes 28 Feb). */
function oneYearEarlier(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = m === 2 && d === 29 ? 28 : d;
  return `${y - 1}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The period to compare against for the "+12%" badge:
 * - daily ranges: the same number of days right before (last 30 days vs. the 30 before);
 * - the 12-month range: the same dates one year earlier.
 */
export function previousRange(range: DayRange): DayRange {
  if (range.period === "Monthly") {
    return { from: oneYearEarlier(range.from), to: oneYearEarlier(range.to), period: "Monthly" };
  }
  const days = daysInclusive(range.from, range.to);
  return { from: addDays(range.from, -days), to: addDays(range.from, -1), period: "Daily" };
}
