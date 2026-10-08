import {
  BadgePercent,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Dumbbell,
  History,
  Home,
  IdCard,
  LayoutDashboard,
  QrCode,
  Receipt,
  ScanLine,
  Settings2,
  Tags,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "next-intl";
import type { Area } from "@/lib/roles";

/** A key of the "Nav" messages, e.g. "members" (the sidebar shows it in the current language). */
export type NavLabel = keyof Messages["Nav"];

/** `activeUnder`: extra path prefixes that also highlight this link (pages that belong to it). */
export type NavItem = { href: string; label: NavLabel; icon: LucideIcon; activeUnder?: string[] };

/**
 * The sidebar links for each area. Only pages that exist are listed:
 * each phase adds its pages here (members, plans, bookings...) when they are built.
 */
export const AREA_NAV: Record<Area, NavItem[]> = {
  admin: [
    { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { href: "/dashboard/check-in", label: "checkInDesk", icon: ScanLine },
    { href: "/dashboard/members", label: "members", icon: Users },
    { href: "/dashboard/sessions", label: "classes", icon: CalendarDays },
    { href: "/dashboard/memberships", label: "memberships", icon: IdCard },
    { href: "/dashboard/payments", label: "payments", icon: Receipt },
    { href: "/dashboard/check-ins", label: "attendanceLog", icon: ClipboardList },
    { href: "/dashboard/trainers", label: "trainers", icon: Dumbbell },
    { href: "/dashboard/plans", label: "plans", icon: BadgePercent },
    { href: "/dashboard/categories", label: "categories", icon: Tags },
    { href: "/dashboard/settings", label: "gymSettings", icon: Settings2 },
  ],
  trainer: [
    // A class roster (/trainer/classes/5) is opened from "My schedule", so that link stays highlighted.
    {
      href: "/trainer",
      label: "mySchedule",
      icon: CalendarDays,
      activeUnder: ["/trainer/classes"],
    },
    { href: "/trainer/history", label: "classHistory", icon: History },
  ],
  member: [
    { href: "/me", label: "overview", icon: Home },
    { href: "/me/qr", label: "myQr", icon: QrCode },
    { href: "/me/classes", label: "bookClass", icon: CalendarPlus },
    { href: "/me/bookings", label: "myBookings", icon: CalendarCheck2 },
    { href: "/me/payments", label: "myPayments", icon: Receipt },
    { href: "/me/profile", label: "profile", icon: UserRound },
  ],
};

/** Shared by every area, shown at the bottom of the sidebar. */
export const ACCOUNT_NAV: NavItem = { href: "/account", label: "account", icon: UserCog };

/** A link is active on its own page and on pages under it, except area home links (exact match only). */
export function isNavActive(pathname: string, item: NavItem, isHome: boolean): boolean {
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (item.activeUnder?.some(under)) return true;
  return isHome ? pathname === item.href : under(item.href);
}
