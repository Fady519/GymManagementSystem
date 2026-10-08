import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** /robots.txt: index the public website, skip the private areas (in both languages). */
export default function robots(): MetadataRoute.Robots {
  const privateAreas = ["/dashboard", "/trainer", "/me", "/account"];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...privateAreas, ...privateAreas.map((path) => `/ar${path}`)],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
