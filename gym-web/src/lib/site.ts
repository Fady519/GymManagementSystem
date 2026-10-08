/**
 * The public address of the website, without a trailing slash.
 * Used for absolute links that leave the site: canonical URLs, the sitemap and link previews.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
