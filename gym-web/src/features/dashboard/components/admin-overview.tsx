"use client";

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
import { useTranslations } from "next-intl";
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
import { useFormat } from "@/hooks/use-format";
import { useListParams } from "@/hooks/use-list-params";
import { useNow } from "@/hooks/use-now";
import { firstName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsSummaryResponse } from "@/types";
import { Link } from "@/i18n/navigation";

/**
 * Wraps a name in Unicode "isolate" marks: the plain-text version of <bdi>. The page title is a
 * string, so this keeps an English name from jumbling the Arabic sentence around it (and vice versa).
 */
const isolate = (text: string) => `\u2068${text}\u2069`;

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
  const t = useTranslations("Dashboard.kpi");
  const f = useFormat();
  // The count-up passes in-between values (12.4, 12.8...), so round before formatting.
  const count = (n: number) => f.number(Math.round(n));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Users}
        label={t("activeMembers")}
        value={<AnimatedNumber value={data.activeMembers} format={count} />}
        hint={t("totalMembers", { count: data.totalMembers })}
      />
      <StatCard
        icon={Wallet}
        label={t("revenueMonth")}
        value={<AnimatedNumber value={data.revenueThisMonth} format={f.money} />}
        hint={t("revenueToday", { amount: f.money(data.revenueToday) })}
        tone="success"
      />
      <StatCard
        icon={QrCode}
        label={t("checkInsToday")}
        value={<AnimatedNumber value={data.checkInsToday} format={count} />}
        hint={t("checkInsHint")}
      />
      <StatCard
        icon={CalendarClock}
        label={t("upcomingClasses")}
        value={<AnimatedNumber value={data.upcomingSessions} format={count} />}
        hint={t("ongoing", { count: data.ongoingSessions })}
      />
    </div>
  );
}

function MembershipHealthCard({ data }: { data: AnalyticsSummaryResponse }) {
  const t = useTranslations("Dashboard.health");
  const f = useFormat();
  const activeShare =
    data.totalMembers > 0 ? Math.round((data.activeMembers / data.totalMembers) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t("activeShare")}</span>
            <span className="text-2xl font-bold tabular-nums">{f.percent(activeShare)}</span>
          </div>
          <Progress value={activeShare} aria-label={t("progressLabel")} />
        </div>
        <ul className="divide-y">
          <BreakdownRow
            icon={UserPlus}
            label={t("newThisMonth")}
            value={f.number(data.newMembersThisMonth)}
          />
          <BreakdownRow icon={Snowflake} label={t("frozen")} value={f.number(data.frozenMembers)} />
          <BreakdownRow
            icon={Hourglass}
            label={t("expiringSoon")}
            value={f.number(data.expiringSoon)}
            highlight={data.expiringSoon > 0}
          />
        </ul>
      </CardContent>
    </Card>
  );
}

function TodayCard({ data }: { data: AnalyticsSummaryResponse }) {
  const t = useTranslations("Dashboard.today");
  const f = useFormat();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          <BreakdownRow icon={Wallet} label={t("revenue")} value={f.money(data.revenueToday)} />
          <BreakdownRow icon={QrCode} label={t("checkIns")} value={f.number(data.checkInsToday)} />
          <BreakdownRow
            icon={Activity}
            label={t("inProgress")}
            value={f.number(data.ongoingSessions)}
          />
          <BreakdownRow
            icon={CalendarPlus}
            label={t("comingUp")}
            value={f.number(data.upcomingSessions)}
          />
          <BreakdownRow
            icon={Dumbbell}
            label={t("trainers")}
            value={f.number(data.totalTrainers)}
          />
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
  const t = useTranslations("Dashboard");
  const f = useFormat();
  const now = useNow();
  const { user } = useAuth();
  const summary = useAnalyticsSummary();
  const queryClient = useQueryClient();
  const refreshing = useIsFetching({ queryKey: dashboardKeys.all }) > 0;

  const params = useListParams();
  const rawRange = params.string("range", DEFAULT_RANGE);
  const rangeKey = isDashboardRange(rawRange) ? rawRange : DEFAULT_RANGE;
  const range = resolveRange(rangeKey);
  const rangeText = t(`ranges.${rangeKey}.text`);

  // The greeting needs the clock, which is only known in the browser (useNow is null before that).
  const name = firstName(user?.fullName ?? "");
  const hello = now ? f.greeting(now) : t("welcome");

  const refreshAll = () =>
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: membershipKeys.expiring() }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={name ? t("greeting", { greeting: hello, name: isolate(name) }) : hello}
        description={
          summary.data ? t("updated", { time: f.time(summary.data.generatedAt) }) : t("intro")
        }
        actions={
          <>
            <Select
              value={rangeKey}
              onValueChange={(value) =>
                params.set({ range: value === DEFAULT_RANGE ? null : value })
              }
            >
              <SelectTrigger className="w-40" aria-label={t("actions.period")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {DASHBOARD_RANGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`ranges.${value}.label`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link href="/dashboard/check-in">
                <ScanLine /> {t("actions.checkInDesk")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/members/new">
                <UserPlus /> {t("actions.addMember")}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshAll}
              disabled={refreshing}
              aria-label={t("actions.refresh")}
              title={t("actions.refresh")}
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
          title={t("loadError")}
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
