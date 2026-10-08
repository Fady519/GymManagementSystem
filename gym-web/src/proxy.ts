import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { AREA_HOME, areaOfPath, isArea } from "@/lib/roles";
import { SESSION_HINT_COOKIE } from "@/lib/session-hint";

// Picks the language: from the URL (/ar/...), otherwise from the visitor's saved choice or browser.
const intl = createIntlMiddleware(routing);

const PROTECTED = ["/dashboard", "/trainer", "/me", "/account"];

/** Splits "/ar/dashboard" into { prefix: "/ar", path: "/dashboard" } ("/dashboard" has no prefix). */
function splitLocale(pathname: string) {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return { prefix: `/${locale}`, path: pathname.slice(locale.length + 1) || "/" };
    }
  }
  return { prefix: "", path: pathname };
}

/**
 * Runs on the server before every page (see `matcher` below).
 *
 * 1. Protected pages get a fast first check that saves a round trip:
 *      - no session hint  -> /login?next=<the page they wanted>
 *      - wrong area       -> their own home page (e.g. a member opening /dashboard goes to /me)
 *    It only reads the hint cookie, which anyone can edit, so it is NOT the real protection.
 *    The real checks are: the API (JWT + roles on every endpoint) and the AppShell guard in the browser.
 * 2. Everything else is handed to next-intl, which serves the page in the right language.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { prefix, path } = splitLocale(pathname);

  if (PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const hint = request.cookies.get(SESSION_HINT_COOKIE)?.value;

    if (!isArea(hint)) {
      const loginUrl = new URL(`${prefix}/login`, request.url);
      loginUrl.searchParams.set("next", path + search);
      return NextResponse.redirect(loginUrl);
    }

    const pathArea = areaOfPath(path);
    if (pathArea && pathArea !== hint) {
      return NextResponse.redirect(new URL(`${prefix}${AREA_HOME[hint]}`, request.url));
    }
  }

  return intl(request);
}

export const config = {
  // Every page, but not the API, uploaded files, Next.js internals or files with an extension (icon.jpg...).
  matcher: ["/((?!api|uploads|_next|_vercel|.*\\..*).*)"],
};
