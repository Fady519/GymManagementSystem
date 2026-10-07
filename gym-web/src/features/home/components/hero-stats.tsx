"use client";

import { CalendarDays, Dumbbell, Users, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/features/categories/queries";
import { usePlans } from "@/features/plans/queries";
import { useUpcomingSessions } from "@/features/sessions/queries";
import { formatMoney, monthlyPrice } from "@/lib/format";

/**
 * Live numbers under the hero, all computed from the API:
 * the lowest monthly price, programs, coaches and upcoming classes.
 * Each stat loads on its own; if one request fails, that stat is simply hidden.
 */
export function HeroStats() {
  const plans = usePlans(true);
  const categories = useCategories();
  const sessions = useUpcomingSessions();

  const fromPrice =
    plans.data && plans.data.length > 0
      ? Math.min(...plans.data.map((p) => monthlyPrice(p.price, p.durationDays)))
      : null;
  const coaches = categories.data?.reduce((sum, c) => sum + c.trainersCount, 0);

  const stats = [
    {
      icon: Wallet,
      label: "per month",
      value: fromPrice !== null ? `From ${formatMoney(fromPrice)}` : null,
      pending: plans.isPending,
    },
    {
      icon: Dumbbell,
      label: "training programs",
      value: categories.data ? String(categories.data.length) : null,
      pending: categories.isPending,
    },
    {
      icon: Users,
      label: "expert coaches",
      value: coaches !== undefined ? String(coaches) : null,
      pending: categories.isPending,
    },
    {
      icon: CalendarDays,
      label: "upcoming classes",
      value: sessions.data ? String(sessions.data.totalCount) : null,
      pending: sessions.isPending,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, pending }) => {
        if (pending) return <Skeleton key={label} className="h-20 rounded-xl" />;
        if (value === null) return null;
        return (
          <div key={label} className="rounded-xl border bg-card/60 p-4 backdrop-blur">
            <Icon className="mb-2 size-5 text-primary" />
            <dt className="sr-only">{label}</dt>
            <dd>
              <span className="block text-xl font-bold tracking-tight">{value}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
