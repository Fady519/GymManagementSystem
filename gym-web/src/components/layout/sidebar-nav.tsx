"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_NAV, AREA_NAV, isNavActive, type NavItem } from "@/components/layout/nav-config";
import { AREA_HOME, type Area } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * The list of links in the sidebar (desktop) and in the slide-out menu (phones).
 * `onNavigate` lets the phone menu close itself when a link is clicked.
 */
export function SidebarNav({ area, onNavigate }: { area: Area; onNavigate?: () => void }) {
  const pathname = usePathname();

  const renderLink = (item: NavItem) => {
    const active = isNavActive(pathname, item.href, item.href === AREA_HOME[area]);
    const Icon = item.icon;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4" />
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
      <ul className="grid gap-1">{AREA_NAV[area].map(renderLink)}</ul>
      <ul className="mt-auto grid gap-1">{renderLink(ACCOUNT_NAV)}</ul>
    </nav>
  );
}
