import {
  BadgePercent,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Home,
  IdCard,
  LayoutDashboard,
  Receipt,
  ScanLine,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Area } from "@/lib/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * The sidebar links for each area. Only pages that exist are listed:
 * each phase adds its pages here (members, plans, bookings...) when they are built.
 */
export const AREA_NAV: Record<Area, NavItem[]> = {
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/check-in", label: "Check-in desk", icon: ScanLine },
    { href: "/dashboard/members", label: "Members", icon: Users },
    { href: "/dashboard/sessions", label: "Classes", icon: CalendarDays },
    { href: "/dashboard/memberships", label: "Memberships", icon: IdCard },
    { href: "/dashboard/payments", label: "Payments", icon: Receipt },
    { href: "/dashboard/check-ins", label: "Attendance log", icon: ClipboardList },
    { href: "/dashboard/trainers", label: "Trainers", icon: Dumbbell },
    { href: "/dashboard/plans", label: "Plans", icon: BadgePercent },
    { href: "/dashboard/categories", label: "Categories", icon: Tags },
  ],
  trainer: [{ href: "/trainer", label: "My schedule", icon: CalendarDays }],
  member: [{ href: "/me", label: "Overview", icon: Home }],
};

/** Shared by every area, shown at the bottom of the sidebar. */
export const ACCOUNT_NAV: NavItem = { href: "/account", label: "Account settings", icon: UserCog };

/** The title shown in the top bar of each area. */
export const AREA_TITLE: Record<Area, string> = {
  admin: "Gym management",
  trainer: "Trainer portal",
  member: "Member area",
};

/** A link is active on its own page and on pages under it, except area home links (exact match only). */
export function isNavActive(pathname: string, href: string, isHome: boolean): boolean {
  return isHome ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
