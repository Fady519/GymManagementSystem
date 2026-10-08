import { isArea, type Area } from "@/lib/roles";

/**
 * A small, readable cookie that says "this browser has a session, and it belongs to area X".
 *
 * Why we need it: the real refresh cookie (gym_refresh) is httpOnly and only sent to /api/auth,
 * so neither our JavaScript nor proxy.ts can see it. This hint lets:
 *   - proxy.ts redirect logged-out visitors to /login before any page code loads;
 *   - the app skip the refresh call entirely for visitors who never logged in.
 *
 * It is NOT security: anyone can edit a cookie. The API checks the JWT on every request,
 * so a fake hint only shows an empty shell that can't load any data.
 */
export const SESSION_HINT_COOKIE = "pf_session";

const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7; // same lifetime as the refresh token

export function setSessionHint(area: Area) {
  document.cookie = `${SESSION_HINT_COOKIE}=${area}; Path=/; Max-Age=${SEVEN_DAYS_IN_SECONDS}; SameSite=Lax`;
}

export function clearSessionHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** The area stored in the hint, or null when there is no (valid) hint. Browser only. */
export function readSessionHint(): Area | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_HINT_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return isArea(value) ? value : null;
}
