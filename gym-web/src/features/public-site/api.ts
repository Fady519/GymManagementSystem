import { cacheLife, cacheTag } from "next/cache";
import type {
  CategoryResponse,
  GymSettingsResponse,
  PlanResponse,
  PublicStatsResponse,
  PublicTrainerResponse,
  SessionResponse,
  SessionResponsePagedResult,
} from "@/types";

/**
 * Data for the public website, fetched ON THE SERVER straight from the API (no login needed).
 *
 * "use cache" + cacheLife("minutes") is the Next.js 16 way of doing ISR: the home page is built
 * once, served instantly from the cache, and quietly rebuilt in the background about once a minute.
 * So when the admin changes a price or the opening hours, the website follows within a minute,
 * without hitting the API on every visit.
 *
 * Each function returns null when the API can't be reached, and the section shows a friendly
 * message instead of breaking the whole page.
 */
const API_URL = process.env.API_URL ?? "https://localhost:7080";

async function getPublic<T>(path: string): Promise<T | null> {
  "use cache";
  cacheTag("public-site");

  try {
    const response = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
    if (response.ok) {
      cacheLife("minutes");
      return (await response.json()) as T;
    }
  } catch {
    // The API is down or unreachable: fall through and return null.
  }

  // Don't keep a failure as long as real data: the next visit after ~10 seconds rebuilds this
  // in the background, so a short API restart can't leave "section unavailable" on the page.
  // (expire stays at 5 minutes so the page can still be pre-rendered as static HTML.)
  cacheLife({ stale: 10, revalidate: 10, expire: 300 });
  return null;
}

/** Contact details and opening hours (GET /api/public/gym). */
export function getGymSettings() {
  return getPublic<GymSettingsResponse>("/api/public/gym");
}

/** Headline numbers for the hero (GET /api/public/stats). */
export function getPublicStats() {
  return getPublic<PublicStatsResponse>("/api/public/stats");
}

/** Coaches without any private data (GET /api/public/trainers). */
export function getPublicTrainers() {
  return getPublic<PublicTrainerResponse[]>("/api/public/trainers");
}

/** Plans on sale, cheapest first (GET /api/plans?isActive=true). */
export function getActivePlans() {
  return getPublic<PlanResponse[]>("/api/plans?isActive=true");
}

/** Training programs with their coach count (GET /api/categories). */
export function getPrograms() {
  return getPublic<CategoryResponse[]>("/api/categories");
}

/** The next classes on the schedule, soonest first (GET /api/sessions?state=Upcoming). */
export async function getUpcomingClasses(limit: number): Promise<SessionResponse[] | null> {
  const page = await getPublic<SessionResponsePagedResult>(
    `/api/sessions?state=Upcoming&page=1&pageSize=${limit}`,
  );
  return page?.items ?? null;
}

/**
 * The year for the footer's copyright line in the cached HTML. Reading the clock is allowed
 * inside "use cache"; the browser then swaps in its own year (see CurrentYear).
 */
export async function getCopyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
