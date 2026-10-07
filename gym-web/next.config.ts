import type { NextConfig } from "next";

// Where the ASP.NET Core API runs. Only the Next.js server uses it (for the rewrites below),
// so the browser always talks to one origin and no CORS setup is needed.
const apiUrl = process.env.API_URL ?? "https://localhost:7080";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser calls /api/... on the Next.js origin and Next.js forwards it to the API.
  // Same origin = the refresh-token cookie is first-party and works without CORS.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/uploads/:path*", destination: `${apiUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
