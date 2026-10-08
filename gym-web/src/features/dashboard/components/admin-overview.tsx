"use client";

import {
  Activity,
  CalendarClock,
  CalendarPlus,
  Dumbbell,
  Hourglass,
  QrCode,
  RefreshCw,
  Snowflake,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { useAuth } from "@/features/auth/hooks";
import { useAnalyticsSummary } from "@/features/dashboard/queries";
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

function SummaryView({ data }: { data: AnalyticsSummaryResponse }) {
  const activeShare =
    data.totalMembers > 0 ? Math.round((data.activeMembers / data.totalMembers) * 100) : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Active members"
          value={data.activeMembers}
          hint={`${data.totalMembers} members in total`}
        />
        <StatCard
          icon={Wallet}
          label="Revenue this month"
          value={formatMoney(data.revenueThisMonth)}
          hint={`${formatMoney(data.revenueToday)} today`}
          tone="success"
        />
        <StatCard
          icon={QrCode}
          label="Check-ins today"
          value={data.checkInsToday}
          hint="Members through the door"
        />
        <StatCard
          icon={CalendarClock}
          label="Upcoming classes"
          value={data.upcomingSessions}
          hint={
            data.ongoingSessions > 0
              ? `${data.ongoingSessions} in progress right now`
              : "None in progress right now"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              <Progress
                value={activeShare}
                aria-label="Share of members with an active membership"
              />
            </div>
            <ul className="divide-y">
              <BreakdownRow
                icon={UserPlus}
                label="New members this month"
                value={data.newMembersThisMonth}
              />
              <BreakdownRow
                icon={Snowflake}
                label="Frozen memberships"
                value={data.frozenMembers}
              />
              <BreakdownRow
                icon={Hourglass}
                label="Expiring soon, not renewed yet"
                value={data.expiringSoon}
                highlight={data.expiringSoon > 0}
              />
            </ul>
          </CardContent>
        </Card>

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
              <BreakdownRow
                icon={Activity}
                label="Classes in progress"
                value={data.ongoingSessions}
              />
              <BreakdownRow
                icon={CalendarPlus}
                label="Classes coming up"
                value={data.upcomingSessions}
              />
              <BreakdownRow
                icon={Dumbbell}
                label="Trainers on the team"
                value={data.totalTrainers}
              />
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** The admin home page: live gym numbers from /api/analytics/summary. Charts come in F4. */
export function AdminOverview() {
  const { user } = useAuth();
  const summary = useAnalyticsSummary();

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
          <Button
            variant="outline"
            onClick={() => void summary.refetch()}
            disabled={summary.isFetching}
          >
            <RefreshCw className={summary.isFetching ? "animate-spin" : undefined} />
            Refresh
          </Button>
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
        <SummaryView data={summary.data} />
      )}
    </div>
  );
}
