/**
 * Helpers for mixing user-typed text (names, emails) into translated plain-text strings, e.g. toasts.
 *
 * In JSX we wrap such values in <bdi>. Plain strings can't hold tags, so we use the Unicode
 * "isolate" characters instead: they are invisible and do the same job. Without them an English
 * name inside an Arabic sentence (or the reverse) can make the punctuation jump to the wrong side.
 */

/** Lets the browser pick the direction of `text` by itself (like <bdi>). */
export function isolate(text: string): string {
  return `\u2068${text}\u2069`;
}

/** Always left-to-right, for emails, phone numbers and codes (like dir="ltr"). */
export function isolateLtr(text: string): string {
  return `\u2066${text}\u2069`;
}
