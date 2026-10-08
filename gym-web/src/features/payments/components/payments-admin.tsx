"use client";

import { useCallback, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Hash, Receipt, SearchX, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { ExportButton } from "@/components/shared/export-button";
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
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import {
  addDays,
  cairoToUtc,
  cairoToday,
  isPlainDate,
  startOfMonth,
  startOfWeek,
} from "@/lib/cairo-time";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PaymentResponse, PaymentType } from "@/types";
import { Link } from "@/i18n/navigation";

const col = createColumns<PaymentResponse>();
const DEFAULT_PAGE_SIZE = 20;

/** The period choices; their labels are under Payments.ranges.<value>. */
const RANGES = ["today", "week", "month", "30d", "all", "custom"] as const;
type Range = (typeof RANGES)[number];

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

/** /dashboard/payments: every purchase, renewal and refund, with totals that follow the filters. */
export function PaymentsAdmin() {
  const t = useTranslations("Payments");
  const tCols = useTranslations("Members.columns");
  const tEnums = useTranslations("Enums");
  const f = useFormat();
  const params = useListParams();
  const rawRange = params.string("range", "month");
  const range: Range = (RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as Range)
    : "month";
  const customFrom = params.string("from");
  const customTo = params.string("to");
  const rawMethod = params.string("method");
  const method = PAYMENT_METHODS.some((m) => m.value === rawMethod)
    ? (rawMethod as PaymentMethod)
    : null;
  const rawType = params.string("type");
  const type = PAYMENT_TYPES.some((p) => p.value === rawType) ? (rawType as PaymentType) : null;
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
          header: tCols("date"),
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap">{f.dateTime(getValue())}</span>
          ),
        }),
        col.accessor("memberName", {
          header: tCols("member"),
          cell: ({ row }) => (
            <Link
              href={`/dashboard/members/${row.original.memberId}?tab=payments`}
              className="font-medium hover:underline"
            >
              <bdi>{row.original.memberName}</bdi>
            </Link>
          ),
        }),
        col.accessor("planName", {
          header: tCols("plan"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => <bdi>{getValue()}</bdi>,
        }),
        col.accessor("type", {
          header: tCols("type"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ getValue }) => (
            <Badge variant="outline" className={PAYMENT_TYPE_STYLE[getValue()]}>
              {tEnums(`PaymentType.${getValue()}`)}
            </Badge>
          ),
        }),
        col.accessor("method", {
          header: tCols("method"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ getValue }) => tEnums(`PaymentMethod.${getValue()}`),
        }),
        col.accessor("amount", {
          header: tCols("amount"),
          meta: { className: "text-end" },
          cell: ({ row }) => {
            const refund = row.original.type === "Refund";
            return (
              <span className={cn("font-semibold tabular-nums", refund && "text-destructive")}>
                {refund ? "−" : ""}
                {f.money(row.original.amount)}
              </span>
            );
          },
        }),
        col.accessor("receivedBy", {
          header: tCols("receivedBy"),
          meta: { className: "hidden xl:table-cell" },
          cell: ({ getValue }) => <bdi className="text-muted-foreground">{getValue() ?? "—"}</bdi>,
        }),
      ]),
    [tCols, tEnums, f],
  );

  const totals = summary.data;
  const filtered = range !== "month" || Boolean(method || type);
  const reset = () => params.set({ range: null, from: null, to: null, method: null, type: null });
  // "this month", "from 1 May 2026 to 7 May 2026"... used inside the sentences below.
  const periodText =
    range === "custom" && days.from && days.to && !badCustomRange
      ? t("period.between", {
          from: f.date(cairoToUtc(days.from)),
          to: f.date(cairoToUtc(addDays(days.to, -1))),
        })
      : t(`period.${range}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          totals ? t("count", { count: totals.paymentCount, period: periodText }) : t("description")
        }
        actions={
          <ExportButton
            name="payments"
            itemLabel={t("itemLabel")}
            filters={filters}
            disabled={badCustomRange || totals?.paymentCount === 0}
          />
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <Select
          value={range}
          onValueChange={(value) => params.set({ range: value === "month" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label={t("filters.period")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`ranges.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={t("filters.from")}
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => params.set({ from: event.target.value || null })}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">{t("filters.to")}</span>
            <Input
              type="date"
              aria-label={t("filters.toLabel")}
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
          <SelectTrigger className="w-full lg:w-40" aria-label={t("filters.method")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allMethods")}</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {tEnums(`PaymentMethod.${m.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type ?? "all"}
          onValueChange={(value) => params.set({ type: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label={t("filters.type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
            {PAYMENT_TYPES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {tEnums(`PaymentType.${p.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={reset}>
            {t("filters.reset")}
          </Button>
        )}
      </div>
      {badCustomRange && <p className="text-sm text-destructive">{t("filters.badRange")}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isPending ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : summary.isError ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <QueryError
              title={t("totalsError")}
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
              label={t("stats.in")}
              value={f.money(totals!.totalIncome)}
              hint={t("stats.inHint")}
            />
            <StatCard
              icon={ArrowUpRight}
              tone="destructive"
              label={t("stats.refunded")}
              value={f.money(totals!.totalRefunds)}
              hint={t("stats.refundedHint")}
            />
            <StatCard
              icon={Wallet}
              tone="primary"
              label={t("stats.net")}
              value={f.money(totals!.totalNet)}
              hint={t("stats.netHint")}
            />
            <StatCard
              icon={Hash}
              tone="warning"
              label={t("stats.count")}
              value={f.number(totals!.paymentCount)}
              hint={t("stats.countHint", { period: periodText })}
            />
          </>
        )}
      </div>

      {payments.isError ? (
        <QueryError
          title={t("loadError")}
          error={payments.error}
          onRetry={() => void payments.refetch()}
          retrying={payments.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
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
                title={t("noMatchTitle")}
                description={t("noMatchBody", { period: periodText })}
                action={
                  <Button variant="outline" onClick={reset}>
                    {t("filters.resetAll")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title={t("emptyTitle")}
                description={t("emptyBody")}
                action={
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/memberships">{t("emptyAction")}</Link>
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
                itemLabel={t("itemLabel")}
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
