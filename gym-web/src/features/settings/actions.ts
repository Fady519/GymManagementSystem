"use server";

import { updateTag } from "next/cache";

const API_URL = process.env.API_URL ?? "https://localhost:7080";

/**
 * Server Action: refreshes the cached public website right away (instead of waiting up to a minute).
 *
 * Anyone can call a Server Action, so it first proves the caller is an admin: it asks the API for
 * the admin-only settings with the caller's access token. Only a 200 answer refreshes the cache.
 * Returns true when the website was refreshed.
 */
export async function refreshPublicSite(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/settings/gym`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return false;

    // Every public fetcher is tagged "public-site" (features/public-site/api.ts).
    updateTag("public-site");
    return true;
  } catch {
    return false;
  }
}
