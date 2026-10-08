"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  CalendarPlus,
  CircleCheck,
  PieChart as PieIcon,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryError } from "@/components/shared/query-error";
import {
  useAttendanceRate,
  useMembersGrowth,
  usePlansDistribution,
  useRevenue,
  useTopCategories,
} from "@/features/dashboard/queries";
import { previousRange, type DayRange } from "@/features/dashboard/range";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useMembershipActions } from "@/features/memberships/components/membership-actions";
import { useExpiringSoon } from "@/features/memberships/queries";
import { daysUntil, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------------------------------
// Lazy charts: Recharts is downloaded after the page is on screen (next/dynamic, browser only).
// ------------------------------------------------------------------------------------------

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

const RevenueChart = dynamic(() => import("./charts").then((m) => m.RevenueChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const MembersGrowthChart = dynamic(() => import("./charts").then((m) => m.MembersGrowthChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const PlansDistributionChart = dynamic(
  () => import("./charts").then((m) => m.PlansDistributionChart),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> },
);
const AttendanceGauge = dynamic(() => import("./charts").then((m) => m.AttendanceGauge), {
  ssr: false,
  loading: () => <ChartSkeleton height={140} />,
});
const TopCategoriesChart = dynamic(() => import("./charts").then((m) => m.TopCategoriesChart), {
  ssr: false,
  loading: () => <ChartSkeleton height={200} />,
});

// ------------------------------------------------------------------------------------------
// Shared building blocks
// ------------------------------------------------------------------------------------------

/** A colored square + label, for chart legends. */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

type EmptyInfo = {
  icon: typeof Wallet;
  title: string;
  description: string;
  action?: React.ReactNode;
};

/**
 * The body of a chart card: skeleton while loading, an error with retry, a helpful empty
 * state, or the chart. While a new period loads, the old chart stays visible but faded.
 */
function ChartBody<T>({
  query,
  isEmpty,
  empty,
  height = 280,
  errorTitle,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty: (data: T) => boolean;
  empty: EmptyInfo;
  height?: number;
  errorTitle: string;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <ChartSkeleton height={height} />;
  if (query.isError) {
    return (
      <QueryError
        title={errorTitle}
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  if (isEmpty(query.data)) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
        className="py-10"
      />
    );
  }
  return (
    <div
      className={cn("transition-opacity", query.isPlaceholderData && "opacity-50")}
      aria-busy={query.isPlaceholderData}
    >
      {children(query.data)}
    </div>
  );
}

const sellAction = (
  <Button variant="outline" size="sm" asChild>
    <Link href="/dashboard/memberships">Go to memberships</Link>
  </Button>
);

// ------------------------------------------------------------------------------------------
// Revenue
// ------------------------------------------------------------------------------------------

/** Net revenue change vs. the previous period of the same length, e.g. "+12%". */
function TrendBadge({
  current,
  previous,
  label,
}: {
  current: number;
  previous: number;
  label: string;
}) {
  if (previous <= 0) {
    return (
      <span className="text-xs text-muted-foreground">No revenue in the {label} to compare</span>
    );
  }
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge
        variant="outline"
        className={cn(
          "gap-1",
          up
            ? "border-success/30 bg-success/10 text-success"
            : "border-destructive/30 bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="size-3" />
        {up ? "+" : ""}
        {change}%
      </Badge>
      vs. the {label}
    </span>
  );
}

export function RevenueCard({
  range,
  rangeText,
  className,
}: {
  range: DayRange;
  rangeText: string;
  className?: string;
}) {
  const revenue = useRevenue(range);
  const previous = useRevenue(previousRange(range));
  const data = revenue.data;
  const compareLabel = range.period === "Monthly" ? "same period last year" : "previous period";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Net income after refunds {rangeText}.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <LegendDot color="var(--chart-1)" label="Income" />
            <LegendDot color="var(--destructive)" label="Refunds" />
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2">
            <p className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={data.totalNet} format={formatMoney} />
            </p>
            {previous.data && (
              <TrendBadge
                current={data.totalNet}
                previous={previous.data.totalNet}
                label={compareLabel}
              />
            )}
          </div>
        )}
        {data && (
          <p className="text-xs text-muted-foreground">
            {formatMoney(data.totalIncome)} in · {formatMoney(data.totalRefunds)} refunded
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ChartBody
          query={revenue}
          errorTitle="We couldn't load the revenue"
          isEmpty={(d) => d.points.every((p) => p.income === 0 && p.refunds === 0)}
          empty={{
            icon: Wallet,
            title: "No payments in this period",
            description: "Revenue appears here as soon as a membership is sold or renewed.",
            action: sellAction,
          }}
        >
          {(d) => <RevenueChart data={d} />}
        </ChartBody>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------------------------
// Members growth
// ------------------------------------------------------------------------------------------

const GROWTH_MONTHS = 12;

export function MembersGrowthCard({ className }: { className?: string }) {
  const growth = useMembersGrowth(GROWTH_MONTHS);
  const points = growth.data ?? [];
  const latest = points.at(-1);
  const joined = points.reduce((sum, p) => sum + p.newMembers, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Member growth</CardTitle>
            <CardDescription>New sign-ups per month over the last 12 months.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <LegendDot color="var(--chart-3)" label="New members" />
            <LegendDot color="var(--chart-1)" label="Total members" />
          </div>
        </div>
        {latest && (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 pt-2">
            <p className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={latest.totalMembers} />
            </p>
            <span className="text-xs text-muted-foreground">
              members today · <span className="font-semibold text-success">+{joined}</span> joined
              in 12 months
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartBody
          query={growth}
          errorTitle="We couldn't load member growth"
          isEmpty={(d) => d.every((p) => p.newMembers === 0 && p.totalMembers === 0)}
          empty={{
            icon: UserPlus,
            title: "No members yet",
            description: "Add your first member and the growth chart starts here.",
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/members/new">Add member</Link>
              </Button>
            ),
          }}
        >
          {(d) => <MembersGrowthChart data={d} />}
        </ChartBody>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------------------------
// Plans distribution
// ------------------------------------------------------------------------------------------

export function PlansCard({ className }: { className?: string }) {
  const plans = usePlansDistribution();
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Plan mix</CardTitle>
        <CardDescription>Running memberships by plan, right now.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartBody
          query={plans}
          height={300}
          errorTitle="We couldn't load the plan mix"
          isEmpty={(d) => d.length === 0}
          empty={{
            icon: PieIcon,
            title: "No running memberships",
            description: "Once members are on a plan, you'll see which plans sell best.",
            action: sellAction,
          }}
        >
          {(d) => <PlansDistributionChart data={d} />}
        </ChartBody>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------------------------
// Attendance
// ------------------------------------------------------------------------------------------

export function AttendanceCard({
  range,
  rangeText,
  className,
}: {
  range: DayRange;
  rangeText: string;
  className?: string;
}) {
  const attendance = useAttendanceRate(range);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Class attendance</CardTitle>
        <CardDescription>Booked members who showed up {rangeText}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartBody
          query={attendance}
          height={200}
          errorTitle="We couldn't load attendance"
          isEmpty={(d) => d.bookings === 0}
          empty={{
            icon: CircleCheck,
            title: "No finished classes yet",
            description: "Attendance is measured once booked classes in this period have ended.",
          }}
        >
          {(d) => (
            <div className="space-y-5">
              <AttendanceGauge data={d} />
              <dl className="grid grid-cols-3 divide-x rounded-lg border text-center">
                {[
                  { label: "Booked", value: d.bookings },
                  { label: "Attended", value: d.attended },
                  { label: "No-shows", value: d.noShows },
                ].map((item) => (
                  <div key={item.label} className="px-2 py-3">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </ChartBody>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------------------------
// Top categories
// ------------------------------------------------------------------------------------------

export function TopCategoriesCard({
  range,
  rangeText,
  className,
}: {
  range: DayRange;
  rangeText: string;
  className?: string;
}) {
  const categories = useTopCategories(range);
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Popular classes</CardTitle>
            <CardDescription>Most booked categories {rangeText}.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <LegendDot color="var(--chart-2)" label="Booked" />
            <LegendDot color="var(--chart-4)" label="Attended" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartBody
          query={categories}
          height={200}
          errorTitle="We couldn't load the popular classes"
          isEmpty={(d) => d.length === 0}
          empty={{
            icon: BarChart3,
            title: "No bookings in this period",
            description: "Schedule classes and let members book them to see what's popular.",
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/sessions">
                  <CalendarPlus /> Open the schedule
                </Link>
              </Button>
            ),
          }}
        >
          {(d) => <TopCategoriesChart data={d} />}
        </ChartBody>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------------------------------
// Renewals due
// ------------------------------------------------------------------------------------------

const RENEWALS_SHOWN = 5;

/** Memberships ending within a week with no renewal yet, with a one-click Renew. */
export function RenewalsDueCard({ className }: { className?: string }) {
  const expiring = useExpiringSoon();
  const actions = useMembershipActions();
  const list = expiring.data ?? [];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="size-4 text-amber-600 dark:text-amber-400" /> Renewals due
            </CardTitle>
            <CardDescription>
              {expiring.data
                ? list.length > 0
                  ? `${list.length} ${list.length === 1 ? "membership ends" : "memberships end"} within 7 days with no renewal yet.`
                  : "Memberships ending within 7 days with no renewal yet."
                : "Checking who needs a renewal…"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/memberships?state=Active">
              All memberships <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {expiring.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : expiring.isError ? (
          <QueryError
            title="We couldn't load the renewals"
            error={expiring.error}
            onRetry={() => void expiring.refetch()}
            retrying={expiring.isFetching}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="You're all caught up"
            description="No membership ends in the next 7 days without a renewal."
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {list.slice(0, RENEWALS_SHOWN).map((m) => {
              const days = daysUntil(m.endDate);
              const urgent = days <= 2;
              return (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <MemberAvatar name={m.memberName} photoUrl={null} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/members/${m.memberId}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {m.memberName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{m.planName}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "hidden sm:inline-flex",
                      urgent
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {days <= 1 ? "Ends tomorrow" : `Ends in ${days} days`}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => actions.run("renew", m)}>
                    <RefreshCcw /> Renew
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > RENEWALS_SHOWN && (
          <p className="pt-3 text-xs text-muted-foreground">
            And {list.length - RENEWALS_SHOWN} more on the memberships page.
          </p>
        )}
        {actions.dialogs}
      </CardContent>
    </Card>
  );
}
