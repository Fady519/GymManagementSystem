import { defineRouting } from "next-intl/routing";

/**
 * The site speaks English and Arabic.
 * English is the default and keeps the plain URLs (/dashboard), Arabic gets a prefix (/ar/dashboard).
 * That way every page has its own address per language, so search engines can index both.
 *
 * Which language a visitor gets:
 * 1. First visit: the browser's language (Accept-Language), e.g. an Arabic browser opening / goes to /ar.
 * 2. After that: the saved choice in the NEXT_LOCALE cookie, set when they use the language switcher.
 *    The cookie is kept for a year (by default it would disappear when the browser closes).
 *
 * Only the interface changes language. Data typed by users (names, plan and class titles, addresses)
 * is stored once and shown exactly as it was entered.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type AppLocale = (typeof routing.locales)[number];

/** Arabic is written right to left. */
export function directionOf(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
