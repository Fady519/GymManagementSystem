"use client";

import Link from "next/link";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarClock,
  CalendarPlus,
  Dumbbell,
  Hourglass,
  QrCode,
  RefreshCw,
  ScanLine,
  Snowflake,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { useAuth } from "@/features/auth/hooks";
import {
  AttendanceCard,
  MembersGrowthCard,
  PlansCard,
  RenewalsDueCard,
  RevenueCard,
  TopCategoriesCard,
} from "@/features/dashboard/components/dashboard-charts";
import { dashboardKeys, useAnalyticsSummary } from "@/features/dashboard/queries";
import {
  DASHBOARD_RANGES,
  DEFAULT_RANGE,
  isDashboardRange,
  resolveRange,
} from "@/features/dashboard/range";
import { membershipKeys } from "@/features/memberships/queries";
import { useListParams } from "@/hooks/use-list-params";
import { firstName, formatMoney, formatTime, greeting } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsSummaryResponse } from "@/types";

/** One line in the breakdown cards: icon, label and number. */
function BreakdownRow({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Users;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-3 text-sm">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          highlight && "text-amber-600 dark:text-warning",
        )}
      >
        {value}
      </span>
    </li>
  );
}

/** The four headline numbers. They count up on load and glide when the data refreshes. */
function KpiCards({ data }: { data: AnalyticsSummaryResponse }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Users}
        label="Active members"
        value={<AnimatedNumber value={data.activeMembers} />}
        hint={`${data.totalMembers} members in total`}
      />
      <StatCard
        icon={Wallet}
        label="Revenue this month"
        value={<AnimatedNumber value={data.revenueThisMonth} format={formatMoney} />}
        hint={`${formatMoney(data.revenueToday)} today`}
        tone="success"
      />
      <StatCard
        icon={QrCode}
        label="Check-ins today"
        value={<AnimatedNumber value={data.checkInsToday} />}
        hint="Members through the door"
      />
      <StatCard
        icon={CalendarClock}
        label="Upcoming classes"
        value={<AnimatedNumber value={data.upcomingSessions} />}
        hint={
          data.ongoingSessions > 0
            ? `${data.ongoingSessions} in progress right now`
            : "None in progress right now"
        }
      />
    </div>
  );
}

function MembershipHealthCard({ data }: { data: AnalyticsSummaryResponse }) {
  const activeShare =
    data.totalMembers > 0 ? Math.round((data.activeMembers / data.totalMembers) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership health</CardTitle>
        <CardDescription>How many of your members can train today.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Active share</span>
            <span className="text-2xl font-bold tabular-nums">{activeShare}%</span>
          </div>
          <Progress value={activeShare} aria-label="Share of members with an active membership" />
        </div>
        <ul className="divide-y">
          <BreakdownRow
            icon={UserPlus}
            label="New members this month"
            value={data.newMembersThisMonth}
          />
          <BreakdownRow icon={Snowflake} label="Frozen memberships" value={data.frozenMembers} />
          <BreakdownRow
            icon={Hourglass}
            label="Expiring soon, not renewed yet"
            value={data.expiringSoon}
            highlight={data.expiringSoon > 0}
          />
        </ul>
      </CardContent>
    </Card>
  );
}

function TodayCard({ data }: { data: AnalyticsSummaryResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today at the gym</CardTitle>
        <CardDescription>Live activity across the floor and the schedule.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          <BreakdownRow
            icon={Wallet}
            label="Revenue today"
            value={formatMoney(data.revenueToday)}
          />
          <BreakdownRow icon={QrCode} label="Check-ins" value={data.checkInsToday} />
          <BreakdownRow icon={Activity} label="Classes in progress" value={data.ongoingSessions} />
          <BreakdownRow
            icon={CalendarPlus}
            label="Classes coming up"
            value={data.upcomingSessions}
          />
          <BreakdownRow icon={Dumbbell} label="Trainers on the team" value={data.totalTrainers} />
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * The admin home page: live numbers from /api/analytics/summary, charts for the chosen period
 * (kept in the URL as ?range=), and the renewals that need a call this week.
 */
export function AdminOverview() {
  const { user } = useAuth();
  const summary = useAnalyticsSummary();
  const queryClient = useQueryClient();
  const refreshing = useIsFetching({ queryKey: dashboardKeys.all }) > 0;

  const params = useListParams();
  const rawRange = params.string("range", DEFAULT_RANGE);
  const rangeKey = isDashboardRange(rawRange) ? rawRange : DEFAULT_RANGE;
  const range = resolveRange(rangeKey);
  const rangeText = DASHBOARD_RANGES.find((r) => r.value === rangeKey)!.text;

  const refreshAll = () =>
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: membershipKeys.expiring() }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName(user?.fullName ?? "")}`}
        description={
          summary.data
            ? `Here's how the gym is doing. Updated at ${formatTime(summary.data.generatedAt)}, refreshes every minute.`
            : "Here's how the gym is doing."
        }
        actions={
          <>
            <Select
              value={rangeKey}
              onValueChange={(value) =>
                params.set({ range: value === DEFAULT_RANGE ? null : value })
              }
            >
              <SelectTrigger className="w-40" aria-label="Chart period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {DASHBOARD_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link href="/dashboard/check-in">
                <ScanLine /> Check-in desk
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/members/new">
                <UserPlus /> Add member
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshAll}
              disabled={refreshing}
              aria-label="Refresh the dashboard"
              title="Refresh the dashboard"
            >
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            </Button>
          </>
        }
      />

      {summary.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : summary.isError ? (
        <QueryError
          title="We couldn't load the dashboard"
          error={summary.error}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <KpiCards data={summary.data} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueCard range={range} rangeText={rangeText} className="lg:col-span-2" />
        {summary.data ? <MembershipHealthCard data={summary.data} /> : <StatCardSkeleton />}

        <MembersGrowthCard className="lg:col-span-2" />
        <PlansCard />

        <AttendanceCard range={range} rangeText={rangeText} />
        <TopCategoriesCard range={range} rangeText={rangeText} />
        {summary.data ? <TodayCard data={summary.data} /> : <StatCardSkeleton />}

        <RenewalsDueCard className="lg:col-span-3" />
      </div>
    </div>
  );
}
