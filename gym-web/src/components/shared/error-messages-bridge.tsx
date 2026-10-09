"use client";

import { useTranslations } from "next-intl";
import { registerPlainTranslations } from "@/lib/plain-translations";

/**
 * Gives the API error handler and the toast helpers (plain functions, no hooks) the messages of
 * the current language. Mounted in the (app) and (auth) layouts,
 * the parts of the site that call the API; renders nothing.
 */
export function ErrorMessagesBridge() {
  const errors = useTranslations("Errors");
  const invite = useTranslations("Shared.invite");

  // Registered while rendering (not in an effect) so even the very first request that fails is
  // translated. It only stores two functions, so running it again on every render is harmless.
  // Skipped on the server: one module variable there would be shared by every visitor.
  if (typeof window !== "undefined") registerPlainTranslations({ errors, invite });

  return null;
}
