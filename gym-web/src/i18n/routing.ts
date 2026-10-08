import { defineRouting } from "next-intl/routing";

/**
 * The site speaks English and Arabic.
 * English is the default and keeps the plain URLs (/dashboard), Arabic gets a prefix (/ar/dashboard).
 * That way every page has its own address per language, so search engines can index both.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

/** Arabic is written right to left. */
export function directionOf(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
