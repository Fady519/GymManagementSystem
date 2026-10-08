"use client";

/**
 * The dashboard charts (Recharts). This file is only loaded through next/dynamic in
 * dashboard-charts.tsx, so the chart library (~100 KB) is downloaded after the page shows,
 * not with it. Colors come from the theme's CSS variables, so dark mode just works.
 */

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
import { formatPlainDay } from "@/lib/cairo-time";
import { formatMoney } from "@/lib/format";
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

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const monthShort = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});
const monthLong = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-01" -> "Oct 26" (axis) or "October 2026" (tooltip). */
function formatMonth(date: string, long = false): string {
  const [y, m] = date.split("-").map(Number);
  return (long ? monthLong : monthShort).format(new Date(Date.UTC(y, m - 1, 1)));
}

type TooltipRow = { label: string; value: string; color: string };

/** The little card shown when hovering a chart. Same look for every chart. */
function TooltipCard({ title, rows }: { title?: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {title && <p className="mb-1.5 font-semibold">{title}</p>}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-[3px]" style={{ background: row.color }} />
              {row.label}
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
  const monthly = data.period === "Monthly";
  const rows: RevenueRow[] = data.points.map((p) => ({
    ...p,
    label: monthly ? formatMonth(p.period) : formatPlainDay(p.period),
    title: monthly ? formatMonth(p.period, true) : formatPlainDay(p.period),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) => compact.format(v)}
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4" }}
          content={(props) => {
            const row = hovered<RevenueRow>(props);
            if (!row) return null;
            return (
              <TooltipCard
                title={row.title}
                rows={[
                  { label: "Income", value: formatMoney(row.income), color: "var(--chart-1)" },
                  {
                    label: "Refunds",
                    value: formatMoney(row.refunds),
                    color: "var(--destructive)",
                  },
                  { label: "Net", value: formatMoney(row.net), color: "var(--foreground)" },
                ]}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#fill-income)"
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="refunds"
          name="Refunds"
          stroke="var(--destructive)"
          strokeWidth={2}
          fill="url(#fill-refunds)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------------------------------------------
// Members growth
// ------------------------------------------------------------------------------------------

type GrowthRow = MembersGrowthPoint & { label: string; title: string };

/** New members per month (bars) and the total at the end of each month (line). */
export function MembersGrowthChart({ data }: { data: MembersGrowthPoint[] }) {
  const rows: GrowthRow[] = data.map((p) => ({
    ...p,
    label: formatMonth(p.month),
    title: formatMonth(p.month, true),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis
          yAxisId="new"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="total"
          orientation="right"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={(props) => {
            const row = hovered<GrowthRow>(props);
            if (!row) return null;
            return (
              <TooltipCard
                title={row.title}
                rows={[
                  { label: "New members", value: String(row.newMembers), color: "var(--chart-3)" },
                  {
                    label: "Total members",
                    value: String(row.totalMembers),
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
          name="New members"
          fill="var(--chart-3)"
          radius={[6, 6, 0, 0]}
          maxBarSize={36}
        />
        <Line
          yAxisId="total"
          type="monotone"
          dataKey="totalMembers"
          name="Total members"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--chart-1)" }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------------------------------------------
// Plans distribution
// ------------------------------------------------------------------------------------------

/** Running memberships per plan, as a donut with the total in the middle and a legend. */
export function PlansDistributionChart({ data }: { data: PlanDistributionItem[] }) {
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
                    rows={[
                      {
                        label: item.planName,
                        value: `${item.activeMemberships} (${item.percent}%)`,
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
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">active</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((item, index) => (
          <li key={item.planId} className="flex items-center gap-3 text-sm">
            <span
              className="size-3 shrink-0 rounded-[4px]"
              style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate">{item.planName}</span>
            <span className="text-muted-foreground tabular-nums">{item.activeMemberships}</span>
            <span className="w-12 text-end font-semibold tabular-nums">{item.percent}%</span>
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
  const rate = Math.round(data.ratePercent);
  const color =
    rate >= 75 ? "var(--success)" : rate >= 50 ? "var(--warning)" : "var(--destructive)";

  return (
    <div className="relative mx-auto h-[140px] w-[240px]">
      <RadialBarChart
        width={240}
        height={140}
        data={[{ value: rate }]}
        cx={120}
        cy={128}
        innerRadius={92}
        outerRadius={116}
        startAngle={180}
        endAngle={0}
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
        <span className="text-4xl font-bold tabular-nums">{rate}%</span>
        <span className="text-xs text-muted-foreground">showed up</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Top categories
// ------------------------------------------------------------------------------------------

/** The most booked class categories: bookings vs. members who actually came. */
export function TopCategoriesChart({ data }: { data: TopCategoryItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="categoryName"
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
                title={item.categoryName}
                rows={[
                  { label: "Booked", value: String(item.bookings), color: "var(--chart-2)" },
                  { label: "Attended", value: String(item.attended), color: "var(--chart-4)" },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="bookings"
          name="Booked"
          fill="var(--chart-2)"
          radius={[0, 6, 6, 0]}
          barSize={12}
        />
        <Bar
          dataKey="attended"
          name="Attended"
          fill="var(--chart-4)"
          radius={[0, 6, 6, 0]}
          barSize={12}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
