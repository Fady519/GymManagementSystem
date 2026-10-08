"use client";

/**
 * The dashboard charts (Recharts). This file is only loaded through next/dynamic in
 * dashboard-charts.tsx, so the chart library (~100 KB) is downloaded after the page shows,
 * not with it. Colors come from the theme's CSS variables, so dark mode just works.
 *
 * Right-to-left (Arabic): the SVG itself is drawn in an LTR box (Recharts positions its tick
 * labels assuming LTR), and we mirror the layout ourselves: time runs right-to-left (`reversed`
 * X axis), the value axis sits on the right, and horizontal bars grow to the left.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormat } from "@/hooks/use-format";
import { intlLocale } from "@/lib/format";
import type {
  AttendanceRateResponse,
  MembersGrowthPoint,
  PlanDistributionItem,
  RevenueResponse,
  TopCategoryItem,
} from "@/types";

/** Five theme colors for series and pie slices. */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
const GRID_STROKE = "var(--border)";

/**
 * Formatters for the charts in the current language, plus `rtl`.
 * Days and numbers come from useFormat; the month labels and the short "1.2K" axis numbers
 * aren't in useFormat, so they're built here with the same Intl locale.
 */
function useChartFormat() {
  const f = useFormat();
  return useMemo(() => {
    const locale = intlLocale(f.locale);
    const compact = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    const monthShort = new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
    const monthLong = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    /** "2026-10-01" -> a Date at noon UTC: the same calendar day in Cairo, whatever the season. */
    const plain = (date: string) => {
      const [y, m, d] = date.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d || 1, 12));
    };

    return {
      ...f,
      rtl: f.locale === "ar",
      compact: (value: number) => compact.format(value),
      /** "2026-10-01" -> "Oct 26" (axis) or "October 2026" (tooltip). */
      month: (date: string, long = false) => (long ? monthLong : monthShort).format(plain(date)),
      /** "2026-10-10" -> "10 Oct" / "10 أكتوبر". */
      plainDay: (date: string) => f.dayMonth(plain(date)),
    };
  }, [f]);
}

type TooltipRow = { label: string; value: string; color: string };

/** The little card shown when hovering a chart. Same look for every chart. */
function TooltipCard({ title, rows, rtl }: { title?: string; rows: TooltipRow[]; rtl: boolean }) {
  return (
    // The chart box is LTR (see the top of the file), so set the reading direction again here.
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-start text-xs text-popover-foreground shadow-lg"
    >
      {title && <p className="mb-1.5 font-semibold">{title}</p>}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-[3px]" style={{ background: row.color }} />
              <bdi>{row.label}</bdi>
            </span>
            <span className="font-semibold tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Recharts passes the hovered point's original data object in payload[0].payload. */
type HoverProps<T> = { active?: boolean; payload?: ReadonlyArray<{ payload?: T }> };

function hovered<T>({ active, payload }: HoverProps<T>): T | null {
  return active && payload && payload.length > 0 ? (payload[0].payload ?? null) : null;
}

// ------------------------------------------------------------------------------------------
// Revenue
// ------------------------------------------------------------------------------------------

type RevenueRow = RevenueResponse["points"][number] & { label: string; title: string };

/** Income and refunds per day/month, as soft filled areas. */
export function RevenueChart({ data }: { data: RevenueResponse }) {
  const t = useTranslations("Dashboard.charts");
  const f = useChartFormat();
  const monthly = data.period === "Monthly";
  const rows: RevenueRow[] = data.points.map((p) => ({
    ...p,
    label: monthly ? f.month(p.period) : f.plainDay(p.period),
    title: monthly ? f.month(p.period, true) : f.plainDay(p.period),
  }));

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={rows}
          margin={{ top: 8, right: f.rtl ? 0 : 8, left: f.rtl ? 8 : 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="fill-refunds" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            reversed={f.rtl}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            orientation={f.rtl ? "right" : "left"}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={f.rtl ? 60 : 48}
            tickFormatter={(v: number) => f.compact(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4" }}
            content={(props) => {
              const row = hovered<RevenueRow>(props);
              if (!row) return null;
              return (
                <TooltipCard
                  rtl={f.rtl}
                  title={row.title}
                  rows={[
                    { label: t("income"), value: f.money(row.income), color: "var(--chart-1)" },
                    {
                      label: t("refunds"),
                      value: f.money(row.refunds),
                      color: "var(--destructive)",
                    },
                    { label: t("net"), value: f.money(row.net), color: "var(--foreground)" },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="income"
            name={t("income")}
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#fill-income)"
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="refunds"
            name={t("refunds")}
            stroke="var(--destructive)"
            strokeWidth={2}
            fill="url(#fill-refunds)"
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Members growth
// ------------------------------------------------------------------------------------------

type GrowthRow = MembersGrowthPoint & { label: string; title: string };

/** New members per month (bars) and the total at the end of each month (line). */
export function MembersGrowthChart({ data }: { data: MembersGrowthPoint[] }) {
  const t = useTranslations("Dashboard.charts");
  const f = useChartFormat();
  const rows: GrowthRow[] = data.map((p) => ({
    ...p,
    label: f.month(p.month),
    title: f.month(p.month, true),
  }));

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            reversed={f.rtl}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          {/* New members on the start side, the running total on the end side. */}
          <YAxis
            yAxisId="new"
            orientation={f.rtl ? "right" : "left"}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tickFormatter={(v: number) => f.number(v)}
          />
          <YAxis
            yAxisId="total"
            orientation={f.rtl ? "left" : "right"}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(v: number) => f.number(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={(props) => {
              const row = hovered<GrowthRow>(props);
              if (!row) return null;
              return (
                <TooltipCard
                  rtl={f.rtl}
                  title={row.title}
                  rows={[
                    {
                      label: t("newMembers"),
                      value: f.number(row.newMembers),
                      color: "var(--chart-3)",
                    },
                    {
                      label: t("totalMembers"),
                      value: f.number(row.totalMembers),
                      color: "var(--chart-1)",
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            yAxisId="new"
            dataKey="newMembers"
            name={t("newMembers")}
            fill="var(--chart-3)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Line
            yAxisId="total"
            type="monotone"
            dataKey="totalMembers"
            name={t("totalMembers")}
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--chart-1)" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Plans distribution
// ------------------------------------------------------------------------------------------

/** Running memberships per plan, as a donut with the total in the middle and a legend. */
export function PlansDistributionChart({ data }: { data: PlanDistributionItem[] }) {
  const t = useTranslations("Dashboard.charts");
  const f = useChartFormat();
  const total = data.reduce((sum, item) => sum + item.activeMemberships, 0);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={(props) => {
                const item = hovered<PlanDistributionItem>(props);
                if (!item) return null;
                const index = data.findIndex((d) => d.planId === item.planId);
                return (
                  <TooltipCard
                    rtl={f.rtl}
                    rows={[
                      {
                        // Plan names are shown exactly as saved (never translated).
                        label: item.planName,
                        value: `${f.number(item.activeMemberships)} (${f.percent(item.percent)})`,
                        color: CHART_COLORS[index % CHART_COLORS.length],
                      },
                    ]}
                  />
                );
              }}
            />
            <Pie
              data={data}
              dataKey="activeMemberships"
              nameKey="planName"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 3 : 0}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((item, index) => (
                <Cell key={item.planId} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{f.number(total)}</span>
          <span className="text-xs text-muted-foreground">{t("active")}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((item, index) => (
          <li key={item.planId} className="flex items-center gap-3 text-sm">
            <span
              className="size-3 shrink-0 rounded-[4px]"
              style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <bdi className="min-w-0 flex-1 truncate">{item.planName}</bdi>
            <span className="text-muted-foreground tabular-nums">
              {f.number(item.activeMemberships)}
            </span>
            <span className="w-12 text-end font-semibold tabular-nums">
              {f.percent(item.percent)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Attendance rate
// ------------------------------------------------------------------------------------------

/** A half-circle gauge: how many booked members actually came. */
export function AttendanceGauge({ data }: { data: AttendanceRateResponse }) {
  const t = useTranslations("Dashboard.charts");
  const f = useChartFormat();
  const rate = Math.round(data.ratePercent);
  const color =
    rate >= 75 ? "var(--success)" : rate >= 50 ? "var(--warning)" : "var(--destructive)";

  return (
    <div className="relative mx-auto h-[140px] w-[240px]">
      {/* The arc fills from the start side: left to right, or right to left in Arabic. */}
      <RadialBarChart
        width={240}
        height={140}
        data={[{ value: rate }]}
        cx={120}
        cy={128}
        innerRadius={92}
        outerRadius={116}
        startAngle={f.rtl ? 0 : 180}
        endAngle={f.rtl ? 180 : 0}
        barSize={18}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <RadialBar
          dataKey="value"
          cornerRadius={9}
          fill={color}
          background={{ fill: "var(--muted)" }}
        />
      </RadialBarChart>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums">{f.percent(rate)}</span>
        <span className="text-xs text-muted-foreground">{t("showedUp")}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Top categories
// ------------------------------------------------------------------------------------------

/** The most booked class categories: bookings vs. members who actually came. */
export function TopCategoriesChart({ data }: { data: TopCategoryItem[] }) {
  const t = useTranslations("Dashboard.charts");
  const f = useChartFormat();
  // Rounded corners on the end of each bar: the right in LTR, the left in RTL.
  const barRadius: [number, number, number, number] = f.rtl ? [6, 0, 0, 6] : [0, 6, 6, 0];

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 52)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: f.rtl ? 0 : 12, left: f.rtl ? 12 : 0, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis type="number" hide allowDecimals={false} reversed={f.rtl} />
          {/* Category names are shown exactly as saved (never translated). */}
          <YAxis
            type="category"
            dataKey="categoryName"
            orientation={f.rtl ? "right" : "left"}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={96}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={(props) => {
              const item = hovered<TopCategoryItem>(props);
              if (!item) return null;
              return (
                <TooltipCard
                  rtl={f.rtl}
                  title={item.categoryName}
                  rows={[
                    { label: t("booked"), value: f.number(item.bookings), color: "var(--chart-2)" },
                    {
                      label: t("attended"),
                      value: f.number(item.attended),
                      color: "var(--chart-4)",
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="bookings"
            name={t("booked")}
            fill="var(--chart-2)"
            radius={barRadius}
            barSize={12}
          />
          <Bar
            dataKey="attended"
            name={t("attended")}
            fill="var(--chart-4)"
            radius={barRadius}
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
