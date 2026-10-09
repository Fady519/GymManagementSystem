import type { AbstractIntlMessages } from "next-intl";

/**
 * Message namespaces every page needs in the browser: the header, footer, theme and language
 * switchers, the user menu and the public home page.
 *
 * Why not send everything? The messages travel inside each HTML page, and the full Arabic file is
 * ~140 KB. The public home page only needs a small part of it, so it loads and becomes usable faster.
 * The logged-in area and the auth pages add the rest in their own layouts.
 */
export const ROOT_CLIENT_NAMESPACES = [
  "Metadata",
  "LocaleSwitcher",
  "Common",
  "Nav",
  "Areas",
  "Roles",
  "UserMenu",
  "Theme",
  "AuthNav",
  "Format",
  "Home",
  "NotFound",
  "ErrorPage",
] as const;

/** Keeps only the given top-level namespaces of the messages object. */
export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  return Object.fromEntries(
    namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]),
  ) as AbstractIntlMessages;
}
