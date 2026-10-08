import type { useTranslations } from "next-intl";

/**
 * Translations for code that runs outside React components, like the Axios error handler and
 * toast helpers (toastError, toastInvite). Hooks only work inside components, so
 * <ErrorMessagesBridge /> (mounted once in app/providers.tsx) hands the translators over here.
 *
 * Until the bridge has rendered (or on the server) this returns null, and callers fall back to English.
 */
export type ErrorsText = ReturnType<typeof useTranslations<"Errors">>;
export type InviteText = ReturnType<typeof useTranslations<"Shared.invite">>;

type PlainTranslations = { errors: ErrorsText; invite: InviteText };

let current: PlainTranslations | null = null;

/** Called by ErrorMessagesBridge on every render, so a language switch is picked up at once. */
export function registerPlainTranslations(next: PlainTranslations) {
  current = next;
}

export function plainTranslations(): PlainTranslations | null {
  return current;
}
