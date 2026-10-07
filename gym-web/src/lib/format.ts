/** The gym is in Cairo: every date/time shown to users uses this zone (the API stores UTC). */
export const GYM_TIME_ZONE = "Africa/Cairo";

/** Formats money in Egyptian pounds, e.g. 1200 -> "EGP 1,200". */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a UTC date from the API as a Cairo date, e.g. "7 Oct 2026". */
export function formatDate(utc: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: GYM_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(utc));
}

/** Formats a UTC date/time from the API as Cairo time, e.g. "7 Oct 2026, 18:00". */
export function formatDateTime(utc: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: GYM_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(utc));
}
