import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * /sitemap.xml: the public pages search engines should index, each with its Arabic version.
 * Members' and staff pages are private, so they are not listed (and robots.ts blocks them).
 */
const PUBLIC_PATHS = ["", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
    changeFrequency: path === "" ? "daily" : "yearly",
    priority: path === "" ? 1 : 0.5,
    alternates: {
      languages: {
        en: `${SITE_URL}${path || "/"}`,
        ar: `${SITE_URL}/ar${path}`,
      },
    },
  }));
}
