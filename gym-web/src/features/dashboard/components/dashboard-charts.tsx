"use client";

import dynamic from "next/dynamic";
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
import { useTranslations } from "next-intl";
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
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

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

/** The button under the empty revenue / plan charts. */
function SellAction() {
  const t = useTranslations("Dashboard.actions");
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/dashboard/memberships">{t("memberships")}</Link>
    </Button>
  );
}

// ------------------------------------------------------------------------------------------
// Revenue
// ------------------------------------------------------------------------------------------

/** Net revenue change vs. the previous period of the same length, e.g. "+12%". */
function TrendBadge({
  current,
  previous,
  lastYear,
}: {
  current: number;
  previous: number;
  /** true: compared with the same dates last year (12-month view), false: the period right before. */
  lastYear: boolean;
}) {
  const t = useTranslations("Dashboard.revenue");
  const f = useFormat();
  if (previous <= 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {lastYear ? t("noCompareLastYear") : t("noComparePrevious")}
      </span>
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
        {/* dir="ltr" keeps the sign in front of the number in Arabic too: "+12%". */}
        <span dir="ltr">
          {up ? "+" : "-"}
          {f.number(Math.abs(change))}%
        </span>
      </Badge>
      {lastYear ? t("compareLastYear") : t("comparePrevious")}
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
  const t = useTranslations("Dashboard");
  const f = useFormat();
  const revenue = useRevenue(range);
  const previous = useRevenue(previousRange(range));
  const data = revenue.data;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("revenue.title")}</CardTitle>
            <CardDescription>{t("revenue.description", { range: rangeText })}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <LegendDot color="var(--chart-1)" label={t("charts.income")} />
            <LegendDot color="var(--destructive)" label={t("charts.refunds")} />
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2">
            <p className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={data.totalNet} format={f.money} />
            </p>
            {previous.data && (
              <TrendBadge
                current={data.totalNet}
                previous={previous.data.totalNet}
                lastYear={range.period === "Monthly"}
              />
            )}
          </div>
        )}
        {data && (
          <p className="text-xs text-muted-foreground">
            {t("revenue.breakdown", {
              income: f.money(data.totalIncome),
              refunds: f.money(data.totalRefunds),
            })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ChartBody
          query={revenue}
          errorTitle={t("revenue.loadError")}
          isEmpty={(d) => d.points.every((p) => p.income === 0 && p.refunds === 0)}
          empty={{
            icon: Wallet,
            title: t("revenue.emptyTitle"),
            description: t("revenue.empty"),
            action: <SellAction />,
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
  const t = useTranslations("Dashboard");
  const f = useFormat();
  const growth = useMembersGrowth(GROWTH_MONTHS);
  const points = growth.data ?? [];
  const latest = points.at(-1);
  const joined = points.reduce((sum, p) => sum + p.newMembers, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{t("growth.title")}</CardTitle>
            <CardDescription>{t("growth.description")}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <LegendDot color="var(--chart-3)" label={t("charts.newMembers")} />
            <LegendDot color="var(--chart-1)" label={t("charts.totalMembers")} />
          </div>
        </div>
        {latest && (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 pt-2">
            <p className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={latest.totalMembers} format={(n) => f.number(Math.round(n))} />
            </p>
            <span className="text-xs text-muted-foreground">
              {t.rich("growth.summary", {
                count: latest.totalMembers,
                joined: f.number(joined),
                b: (chunks) => (
                  <span dir="ltr" className="font-semibold text-success">
                    {chunks}
                  </span>
                ),
              })}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartBody
          query={growth}
          errorTitle={t("growth.loadError")}
          isEmpty={(d) => d.every((p) => p.newMembers === 0 && p.totalMembers === 0)}
          empty={{
            icon: UserPlus,
            title: t("growth.emptyTitle"),
            description: t("growth.empty"),
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/members/new">{t("actions.addMember")}</Link>
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
  const t = useTranslations("Dashboard.plans");
  const plans = usePlansDistribution();
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartBody
          query={plans}
          height={300}
          errorTitle={t("loadError")}
          isEmpty={(d) => d.length === 0}
          empty={{
            icon: PieIcon,
            title: t("emptyTitle"),
            description: t("empty"),
            action: <SellAction />,
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
  const t = useTranslations("Dashboard");
  const f = useFormat();
  const attendance = useAttendanceRate(range);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("attendance.title")}</CardTitle>
        <CardDescription>{t("attendance.description", { range: rangeText })}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartBody
          query={attendance}
          height={200}
          errorTitle={t("attendance.loadError")}
          isEmpty={(d) => d.bookings === 0}
          empty={{
            icon: CircleCheck,
            title: t("attendance.emptyTitle"),
            description: t("attendance.empty"),
          }}
        >
          {(d) => (
            <div className="space-y-5">
              <AttendanceGauge data={d} />
              {/* divide-x draws a physical left border: flip it in RTL so the lines stay between cells. */}
              <dl className="grid grid-cols-3 divide-x rounded-lg border text-center rtl:divide-x-reverse">
                {[
                  { key: "booked", label: t("charts.booked"), value: d.bookings },
                  { key: "attended", label: t("charts.attended"), value: d.attended },
                  { key: "noShows", label: t("charts.noShows"), value: d.noShows },
                ].map((item) => (
                  <div key={item.key} className="px-2 py-3">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{f.number(item.value)}</dd>
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
  const t = useTranslations("Dashboard");
  const categories = useTopCategories(range);
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t("categories.title")}</CardTitle>
            <CardDescription>{t("categories.description", { range: rangeText })}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <LegendDot color="var(--chart-2)" label={t("charts.booked")} />
            <LegendDot color="var(--chart-4)" label={t("charts.attended")} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartBody
          query={categories}
          height={200}
          errorTitle={t("categories.loadError")}
          isEmpty={(d) => d.length === 0}
          empty={{
            icon: BarChart3,
            title: t("categories.emptyTitle"),
            description: t("categories.empty"),
            action: (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/sessions">
                  <CalendarPlus /> {t("categories.openSchedule")}
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
  const t = useTranslations("Dashboard.renewals");
  const now = useNow();
  const expiring = useExpiringSoon();
  const actions = useMembershipActions();
  const list = expiring.data ?? [];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="size-4 text-amber-600 dark:text-amber-400" /> {t("title")}
            </CardTitle>
            <CardDescription>
              {expiring.data ? t("count", { count: list.length }) : t("checking")}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/memberships?state=Active">
              {t("allMemberships")} <ArrowRight className="rtl:rotate-180" />
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
            title={t("loadError")}
            error={expiring.error}
            onRetry={() => void expiring.refetch()}
            retrying={expiring.isFetching}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title={t("emptyTitle")}
            description={t("empty")}
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {list.slice(0, RENEWALS_SHOWN).map((m) => {
              // The days left need the clock: unknown (no badge) until the page is in the browser.
              const days = now ? daysUntil(m.endDate, now) : null;
              const urgent = days !== null && days <= 2;
              return (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <MemberAvatar name={m.memberName} photoUrl={null} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/members/${m.memberId}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      <bdi>{m.memberName}</bdi>
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      <bdi>{m.planName}</bdi>
                    </p>
                  </div>
                  {days !== null && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "hidden sm:inline-flex",
                        urgent
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {days <= 1 ? t("endsTomorrow") : t("endsIn", { count: days })}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => actions.run("renew", m)}>
                    <RefreshCcw /> {t("renew")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > RENEWALS_SHOWN && (
          <p className="pt-3 text-xs text-muted-foreground">
            {t("more", { count: list.length - RENEWALS_SHOWN })}
          </p>
        )}
        {actions.dialogs}
      </CardContent>
    </Card>
  );
}
