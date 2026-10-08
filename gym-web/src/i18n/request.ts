import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "@/i18n/routing";

/**
 * Runs on the server for every render: picks the language and loads its messages.
 * The language comes from the [locale] part of the URL (read with next/root-params),
 * which keeps pages eligible for static rendering (no cookies or headers are read here).
 */
export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const fromUrl = await rootParams.locale();
    if (!hasLocale(routing.locales, fromUrl)) notFound();
    locale = fromUrl;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // All times on the site are shown in the gym's time zone, whatever the visitor's device says.
    timeZone: "Africa/Cairo",
  };
});
