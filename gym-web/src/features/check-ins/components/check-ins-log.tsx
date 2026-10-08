"use client";

import { useCallback, useMemo } from "react";
import { ClipboardList, LogIn, ScanLine, SearchX, ShieldX, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { checkInParams, type CheckInFilters } from "@/features/check-ins/api";
import {
  CHECK_IN_RESULTS,
  CheckInResultBadge,
} from "@/features/check-ins/components/check-in-badges";
import { useCheckIns } from "@/features/check-ins/queries";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { addDays, cairoToday, isPlainDate, startOfMonth, startOfWeek } from "@/lib/cairo-time";
import type { CheckInResponse, CheckInResult } from "@/types";
import { Link } from "@/i18n/navigation";

const col = createColumns<CheckInResponse>();
const DEFAULT_PAGE_SIZE = 20;

/** The period picker values. Their words are in CheckIns.log.ranges.{value}.label / .text. */
const RANGES = ["today", "week", "month", "30d", "all", "custom"] as const;
type Range = (typeof RANGES)[number];

/** A period -> the gym-local days (both inclusive) the check-ins API filters with. */
function rangeToDays(range: Range, customFrom: string, customTo: string) {
  const today = cairoToday();
  switch (range) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: startOfWeek(today), to: today };
    case "month":
      return { from: startOfMonth(today), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "custom":
      return {
        from: isPlainDate(customFrom) ? customFrom : null,
        to: isPlainDate(customTo) ? customTo : null,
      };
    default:
      return { from: null, to: null };
  }
}

/** /dashboard/check-ins: every scan at the door (let in and turned away), filtered and exportable. */
export function CheckInsLog() {
  const t = useTranslations("CheckIns");
  const tResult = useTranslations("Enums.CheckInResult");
  const tReason = useTranslations("Enums.CheckInDenyReason");
  const f = useFormat();
  const params = useListParams();
  const rawRange = params.string("range", "today");
  const range: Range = (RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as Range)
    : "today";
  const customFrom = params.string("from");
  const customTo = params.string("to");
  const rawResult = params.string("result");
  const result = (CHECK_IN_RESULTS as readonly string[]).includes(rawResult)
    ? (rawResult as CheckInResult)
    : null;
  const memberId = params.number("memberId", 0) || null;
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const days = rangeToDays(range, customFrom, customTo);
  const badCustomRange =
    range === "custom" && days.from !== null && days.to !== null && days.to < days.from;
  const base: CheckInFilters = {
    from: days.from,
    to: badCustomRange ? null : days.to,
    memberId,
    result: null,
  };
  const filters: CheckInFilters = { ...base, result };

  const checkIns = useCheckIns({ ...filters, page, pageSize });
  // The totals ignore the result filter, so "let in" and "turned away" are always both visible.
  const allowed = useCheckIns({ ...base, result: "Allowed", page: 1, pageSize: 1 });
  const denied = useCheckIns({ ...base, result: "Denied", page: 1, pageSize: 1 });

  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(checkIns.data, page, setPage);

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("checkedInAt", {
          header: t("log.columns.time"),
          cell: ({ getValue }) => (
            <>
              {/* Phones: time on top, date underneath, to keep the table narrow. */}
              <span className="flex flex-col tabular-nums sm:hidden">
                <span className="font-medium">{f.time(getValue())}</span>
                <span className="text-xs text-muted-foreground">{f.date(getValue())}</span>
              </span>
              <span className="hidden whitespace-nowrap tabular-nums sm:inline">
                {f.dateTime(getValue())}
              </span>
            </>
          ),
        }),
        col.accessor("memberName", {
          header: t("log.columns.member"),
          cell: ({ row }) => (
            <div className="flex items-center gap-3 sm:min-w-40">
              <MemberAvatar
                name={row.original.memberName}
                photoUrl={null}
                className="hidden size-8 sm:flex"
              />
              <Link
                href={`/dashboard/members/${row.original.memberId}`}
                className="truncate font-medium hover:underline"
              >
                <bdi>{row.original.memberName}</bdi>
              </Link>
            </div>
          ),
        }),
        col.accessor("result", {
          header: t("log.columns.result"),
          cell: ({ getValue }) => <CheckInResultBadge result={getValue()} />,
        }),
        col.accessor("denyReason", {
          header: t("log.columns.reason"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => {
            const reason = getValue();
            return <span className="text-muted-foreground">{reason ? tReason(reason) : "—"}</span>;
          },
        }),
        col.accessor("checkedBy", {
          header: t("log.columns.scannedBy"),
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">
              <bdi>{getValue() ?? "—"}</bdi>
            </span>
          ),
        }),
      ]),
    [t, tReason, f],
  );

  const total = (allowed.data?.totalCount ?? 0) + (denied.data?.totalCount ?? 0);
  const totalsReady = allowed.data !== undefined && denied.data !== undefined;
  const totalsError = allowed.error ?? denied.error;
  const allowedShare =
    totalsReady && total > 0 ? Math.round((allowed.data.totalCount / total) * 100) : 0;
  const memberName = memberId ? checkIns.data?.items[0]?.memberName : undefined;

  const filtered = range !== "today" || Boolean(result || memberId);
  const reset = () =>
    params.set({ range: null, from: null, to: null, result: null, memberId: null });
  // Plain "YYYY-MM-DD" days: noon UTC is the same calendar day in Cairo, so f.date shows that day.
  const plainDate = (day: string) => f.date(`${day}T12:00:00Z`);
  const periodText =
    range === "custom" && days.from && days.to && !badCustomRange
      ? t("log.customPeriod", { from: plainDate(days.from), to: plainDate(days.to) })
      : t(`log.ranges.${range}.text`);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("log.title")}
        description={
          checkIns.data
            ? t("log.summary", {
                count: checkIns.data.totalCount,
                period: periodText,
                result: result ?? "none",
              })
            : t("log.intro")
        }
        actions={
          <>
            <ExportButton
              name="check-ins"
              itemLabel={t("log.itemLabel")}
              filters={checkInParams(filters)}
              disabled={badCustomRange || checkIns.data?.totalCount === 0}
            />
            <Button asChild>
              <Link href="/dashboard/check-in">
                <ScanLine /> {t("log.openDesk")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <Select
          value={range}
          onValueChange={(value) => params.set({ range: value === "today" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label={t("log.periodLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`log.ranges.${value}.label`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label={t("log.from")}
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => params.set({ from: event.target.value || null })}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">{t("log.toSeparator")}</span>
            <Input
              type="date"
              aria-label={t("log.to")}
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) => params.set({ to: event.target.value || null })}
              className="w-40"
            />
          </div>
        )}
        <Select
          value={result ?? "all"}
          onValueChange={(value) => params.set({ result: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label={t("log.resultLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("log.allResults")}</SelectItem>
            {CHECK_IN_RESULTS.map((value) => (
              <SelectItem key={value} value={value}>
                {tResult(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {memberId && (
          <span className="inline-flex h-9 items-center gap-2 rounded-md border bg-muted/50 ps-3 pe-1 text-sm">
            <span>
              {t.rich("log.member", {
                name: memberName ?? `#${memberId}`,
                b: (chunks) => <bdi className="font-medium">{chunks}</bdi>,
              })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={t("log.showAllMembers")}
              onClick={() => params.set({ memberId: null })}
            >
              <X />
            </Button>
          </span>
        )}
        {filtered && (
          <Button variant="ghost" onClick={reset}>
            {t("log.reset")}
          </Button>
        )}
      </div>
      {badCustomRange && <p className="text-sm text-destructive">{t("log.badRange")}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {totalsError ? (
          <div className="sm:col-span-3">
            <QueryError
              title={t("log.totalsError")}
              error={totalsError}
              onRetry={() => void Promise.all([allowed.refetch(), denied.refetch()])}
              retrying={allowed.isFetching || denied.isFetching}
            />
          </div>
        ) : !totalsReady ? (
          Array.from({ length: 3 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={ClipboardList}
              label={t("stats.total")}
              value={f.number(total)}
              hint={t("log.recorded", { period: periodText })}
            />
            <StatCard
              icon={LogIn}
              tone="success"
              label={t("stats.letIn")}
              value={f.number(allowed.data.totalCount)}
              hint={
                total > 0 ? t("log.share", { percent: f.percent(allowedShare) }) : t("log.noScans")
              }
            />
            <StatCard
              icon={ShieldX}
              tone="destructive"
              label={t("stats.turnedAway")}
              value={f.number(denied.data.totalCount)}
              hint={t("log.turnedAwayHint")}
            />
          </>
        )}
      </div>

      {checkIns.isError ? (
        <QueryError
          title={t("log.loadError")}
          error={checkIns.error}
          onRetry={() => void checkIns.refetch()}
          retrying={checkIns.isFetching}
        />
      ) : (
        <DataTable
          label={t("log.tableLabel")}
          columns={columns}
          data={checkIns.data?.items}
          getRowId={(c) => String(c.id)}
          isPending={checkIns.isPending}
          isFetching={checkIns.isFetching}
          skeletonRows={10}
          emptyState={
            filtered ? (
              <EmptyState
                icon={SearchX}
                title={t("log.noMatchTitle")}
                description={t("log.noMatch", { period: periodText })}
                action={
                  <Button variant="outline" onClick={reset}>
                    {t("log.resetFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ScanLine}
                title={t("log.emptyTitle")}
                description={t("log.empty")}
                action={
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/check-in">{t("log.openDesk")}</Link>
                  </Button>
                }
              />
            )
          }
          footer={
            checkIns.data && (
              <DataTablePagination
                page={checkIns.data.page}
                pageSize={checkIns.data.pageSize}
                totalCount={checkIns.data.totalCount}
                totalPages={checkIns.data.totalPages}
                itemLabel={t("log.itemLabel")}
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
