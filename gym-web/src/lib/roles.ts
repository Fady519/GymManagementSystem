/**
 * The app has three areas, one per kind of user. Each area lives under its own URL prefix,
 * so one look at the path tells us who the page is for.
 *   admin   -> /dashboard/...  (SuperAdmin and Admin)
 *   trainer -> /trainer/...
 *   member  -> /me/...
 * /account is shared by everyone.
 *
 * This file has no browser or React code, so proxy.ts can import it too.
 */
export type Area = "admin" | "trainer" | "member";

/** The first page each area opens on after login. */
export const AREA_HOME: Record<Area, string> = {
  admin: "/dashboard",
  trainer: "/trainer",
  member: "/me",
};

const AREA_PREFIX: Record<Area, string> = AREA_HOME;

export function isArea(value: unknown): value is Area {
  return value === "admin" || value === "trainer" || value === "member";
}

/** Picks the area from the roles in the token. Admin wins if a user somehow has several roles. */
export function areaOf(roles: readonly string[]): Area {
  if (roles.includes("SuperAdmin") || roles.includes("Admin")) return "admin";
  if (roles.includes("Trainer")) return "trainer";
  return "member";
}

/** A role name for people, e.g. ["SuperAdmin"] -> "Super admin". */
export function roleLabel(roles: readonly string[]): string {
  if (roles.includes("SuperAdmin")) return "Super admin";
  if (roles.includes("Admin")) return "Admin";
  if (roles.includes("Trainer")) return "Trainer";
  return "Member";
}

/** Which area a path belongs to, or null for shared/public paths like /account or /. */
export function areaOfPath(pathname: string): Area | null {
  for (const area of Object.keys(AREA_PREFIX) as Area[]) {
    const prefix = AREA_PREFIX[area];
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return area;
  }
  return null;
}

/**
 * Where to send a user after login. We only follow `next` if it is a path inside our own site
 * (starts with one "/") that the user is allowed to open. Anything else goes to their home page.
 * This stops "open redirect" tricks like /login?next=https://evil.com.
 */
export function landingPath(area: Area, next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    const nextArea = areaOfPath(next.split("?")[0]);
    if (nextArea === area || (nextArea === null && next.startsWith("/account"))) return next;
  }
  return AREA_HOME[area];
}
