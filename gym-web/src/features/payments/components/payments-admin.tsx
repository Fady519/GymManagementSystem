"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Hash, Receipt, SearchX, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import type { PaymentFilters } from "@/features/payments/api";
import {
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_STYLE,
} from "@/features/payments/payment-meta";
import { usePaymentSummary, usePayments } from "@/features/payments/queries";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import {
  addDays,
  cairoToUtc,
  cairoToday,
  formatPlainDate,
  isPlainDate,
  startOfMonth,
  startOfWeek,
} from "@/lib/cairo-time";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentResponse, PaymentType } from "@/types";

const col = createColumns<PaymentResponse>();
const DEFAULT_PAGE_SIZE = 20;

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom dates" },
] as const;
type Range = (typeof RANGES)[number]["value"];

/** A date range in Cairo days -> the UTC [from, to) the API filters with. `to` is exclusive. */
function rangeToDays(
  range: Range,
  customFrom: string,
  customTo: string,
): { from: string | null; to: string | null } {
  const today = cairoToday();
  switch (range) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "week":
      return { from: startOfWeek(today), to: addDays(startOfWeek(today), 7) };
    case "month": {
      const first = startOfMonth(today);
      return { from: first, to: startOfMonth(addDays(first, 31)) };
    }
    case "30d":
      return { from: addDays(today, -29), to: addDays(today, 1) };
    case "custom":
      return {
        from: isPlainDate(customFrom) ? customFrom : null,
        // The "to" box is the last day to include, so the API gets the day after it.
        to: isPlainDate(customTo) ? addDays(customTo, 1) : null,
      };
    default:
      return { from: null, to: null };
  }
}

const RANGE_TEXT: Record<Range, string> = {
  today: "today",
  week: "this week",
  month: "this month",
  "30d": "in the last 30 days",
  all: "since the gym opened",
  custom: "in the chosen dates",
};

/** /dashboard/payments: every purchase, renewal and refund, with totals that follow the filters. */
export function PaymentsAdmin() {
  const params = useListParams();
  const rawRange = params.string("range", "month");
  const range: Range = RANGES.some((r) => r.value === rawRange) ? (rawRange as Range) : "month";
  const customFrom = params.string("from");
  const customTo = params.string("to");
  const rawMethod = params.string("method");
  const method = PAYMENT_METHODS.some((m) => m.value === rawMethod)
    ? (rawMethod as PaymentMethod)
    : null;
  const rawType = params.string("type");
  const type = PAYMENT_TYPES.some((t) => t.value === rawType) ? (rawType as PaymentType) : null;
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const days = rangeToDays(range, customFrom, customTo);
  const badCustomRange =
    range === "custom" && days.from !== null && days.to !== null && days.to <= days.from;
  const filters: PaymentFilters = {
    from: days.from ? cairoToUtc(days.from) : null,
    to: days.to && !badCustomRange ? cairoToUtc(days.to) : null,
    method,
    type,
  };

  const summary = usePaymentSummary(filters);
  const payments = usePayments({ ...filters, page, pageSize });
  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(payments.data, page, setPage);

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("paidAt", {
          header: "Date",
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap">{formatDateTime(getValue())}</span>
          ),
        }),
        col.accessor("memberName", {
          header: "Member",
          cell: ({ row }) => (
            <Link
              href={`/dashboard/members/${row.original.memberId}?tab=payments`}
              className="font-medium hover:underline"
            >
              {row.original.memberName}
            </Link>
          ),
        }),
        col.accessor("planName", { header: "Plan", meta: { className: "hidden md:table-cell" } }),
        col.accessor("type", {
          header: "Type",
          meta: { className: "hidden sm:table-cell" },
          cell: ({ getValue }) => (
            <Badge variant="outline" className={PAYMENT_TYPE_STYLE[getValue()]}>
              {getValue()}
            </Badge>
          ),
        }),
        col.accessor("method", { header: "Method", meta: { className: "hidden sm:table-cell" } }),
        col.accessor("amount", {
          header: "Amount",
          meta: { className: "text-end" },
          cell: ({ row }) => {
            const refund = row.original.type === "Refund";
            return (
              <span className={cn("font-semibold tabular-nums", refund && "text-destructive")}>
                {refund ? "−" : ""}
                {formatMoney(row.original.amount)}
              </span>
            );
          },
        }),
        col.accessor("receivedBy", {
          header: "Received by",
          meta: { className: "hidden xl:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue() ?? "—"}</span>
          ),
        }),
      ]),
    [],
  );

  const totals = summary.data;
  const filtered = range !== "month" || Boolean(method || type);
  const reset = () => params.set({ range: null, from: null, to: null, method: null, type: null });
  const periodText =
    range === "custom" && days.from && days.to && !badCustomRange
      ? `from ${formatPlainDate(days.from)} to ${formatPlainDate(addDays(days.to, -1))}`
      : RANGE_TEXT[range];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={
          totals
            ? `${totals.paymentCount} ${totals.paymentCount === 1 ? "payment" : "payments"} ${periodText}.`
            : "Every purchase, renewal and refund, with who received it."
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <Select
          value={range}
          onValueChange={(value) => params.set({ range: value === "month" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From"
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => params.set({ from: event.target.value || null })}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              aria-label="To"
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) => params.set({ to: event.target.value || null })}
              className="w-40"
            />
          </div>
        )}
        <Select
          value={method ?? "all"}
          onValueChange={(value) => params.set({ method: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-40" aria-label="Payment method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type ?? "all"}
          onValueChange={(value) => params.set({ type: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Payment type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PAYMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        )}
      </div>
      {badCustomRange && (
        <p className="text-sm text-destructive">The end date must be on or after the start date.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isPending ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : summary.isError ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <QueryError
              title="We couldn't load the totals"
              error={summary.error}
              onRetry={() => void summary.refetch()}
              retrying={summary.isFetching}
            />
          </div>
        ) : (
          <>
            <StatCard
              icon={ArrowDownLeft}
              tone="success"
              label="Money in"
              value={formatMoney(totals!.totalIncome)}
              hint="New memberships and renewals"
            />
            <StatCard
              icon={ArrowUpRight}
              tone="destructive"
              label="Refunded"
              value={formatMoney(totals!.totalRefunds)}
              hint="Paid back on cancellations"
            />
            <StatCard
              icon={Wallet}
              tone="primary"
              label="Net revenue"
              value={formatMoney(totals!.totalNet)}
              hint="Money in minus refunds"
            />
            <StatCard
              icon={Hash}
              tone="warning"
              label="Payments"
              value={totals!.paymentCount}
              hint={`Recorded ${periodText}`}
            />
          </>
        )}
      </div>

      {payments.isError ? (
        <QueryError
          title="We couldn't load the payments"
          error={payments.error}
          onRetry={() => void payments.refetch()}
          retrying={payments.isFetching}
        />
      ) : (
        <DataTable
          label="Payments"
          columns={columns}
          data={payments.data?.items}
          getRowId={(p) => String(p.id)}
          isPending={payments.isPending}
          isFetching={payments.isFetching}
          skeletonRows={10}
          emptyState={
            filtered ? (
              <EmptyState
                icon={SearchX}
                title="No payments match"
                description={`Nothing was recorded ${periodText} with these filters. Try a longer period.`}
                action={
                  <Button variant="outline" onClick={reset}>
                    Reset filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title="No payments this month yet"
                description="Payments appear here as soon as a membership is sold, renewed or refunded."
                action={
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/memberships">Go to memberships</Link>
                  </Button>
                }
              />
            )
          }
          footer={
            payments.data && (
              <DataTablePagination
                page={payments.data.page}
                pageSize={payments.data.pageSize}
                totalCount={payments.data.totalCount}
                totalPages={payments.data.totalPages}
                itemLabel="payments"
                onPageChange={setPage}
                onPageSizeChange={(size) =>
                  params.set({ pageSize: size === DEFAULT_PAGE_SIZE ? null : size })
                }
              />
            )
          }
        />
      )}
    </div>
  );
}
