import { NextResponse, type NextRequest } from "next/server";
import { AREA_HOME, areaOfPath, isArea } from "@/lib/roles";
import { SESSION_HINT_COOKIE } from "@/lib/session-hint";

/**
 * Runs on the server before every protected page (see `matcher` below).
 * It is a fast first check that saves a round trip:
 *   - no session hint  -> /login?next=<the page they wanted>
 *   - wrong area       -> their own home page (e.g. a member opening /dashboard goes to /me)
 *
 * It only reads the hint cookie, which anyone can edit, so it is NOT the real protection.
 * The real checks are: the API (JWT + roles on every endpoint) and the AppShell guard in the browser.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hint = request.cookies.get(SESSION_HINT_COOKIE)?.value;

  if (!isArea(hint)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const pathArea = areaOfPath(pathname);
  if (pathArea && pathArea !== hint) {
    return NextResponse.redirect(new URL(AREA_HOME[hint], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/trainer/:path*", "/me/:path*", "/account/:path*"],
};
