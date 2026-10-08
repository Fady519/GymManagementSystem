"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AREA_TITLE } from "@/components/layout/nav-config";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/features/auth/hooks";
import { useHydrated } from "@/hooks/use-hydrated";
import { AREA_HOME, areaOfPath } from "@/lib/roles";

/**
 * Decides if the current user may see this page, and if not, where they should go instead.
 * Returns null when the page can be shown (or while we are still checking the session).
 */
function useRedirectTarget(): string | null {
  const { status, user, area, endReason } = useAuth();
  const pathname = usePathname();

  if (status === "unknown") return null;

  if (status === "anonymous" || !user || !area) {
    if (endReason === "logout") return "/login";
    const next = encodeURIComponent(pathname);
    return endReason === "expired" ? `/login?next=${next}&expired=1` : `/login?next=${next}`;
  }

  // A member on /dashboard, an admin on /me, etc.
  const pathArea = areaOfPath(pathname);
  if (pathArea && pathArea !== area) return AREA_HOME[area];

  // Accounts with a temporary password must choose their own before anything else.
  if (user.mustChangePassword && pathname !== "/account") return "/account";

  return null;
}

/**
 * The frame around every logged-in page: sidebar on desktop, slide-out menu on phones,
 * and a top bar with the theme switch and the account menu.
 *
 * It is also the real client-side guard (proxy.ts only does a quick check on a readable cookie):
 * nothing inside renders until we know who the user is and that they may open this page.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user, area } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const target = useRedirectTarget();
  const hydrated = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  // Until hydration is done, render exactly what the server rendered (see useHydrated).
  if (!hydrated || status === "unknown") return <LoadingScreen />;
  if (status !== "authenticated" || !user || !area || target) {
    return <LoadingScreen label="Redirecting…" />;
  }

  return (
    <div className="min-h-svh flex-1 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-e bg-sidebar p-4 lg:flex">
        <div className="px-2 pt-1">
          <Logo />
        </div>
        <SidebarNav area={area} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon-lg"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          <p className="truncate text-sm font-semibold text-muted-foreground">{AREA_TITLE[area]}</p>
          <div className="ms-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        {/* key={pathname}: each page starts fresh, with a small fade-in. */}
        <main
          key={pathname}
          className="flex-1 animate-in px-4 py-6 duration-300 fade-in-0 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-6 bg-sidebar p-4">
          <SheetHeader className="p-0 pt-1">
            <SheetTitle asChild>
              <div>
                <Logo />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
          </SheetHeader>
          <SidebarNav area={area} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
