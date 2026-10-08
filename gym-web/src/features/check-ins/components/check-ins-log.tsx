"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { ClipboardList, LogIn, ScanLine, SearchX, ShieldX, X } from "lucide-react";
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
  DENY_REASON_LABEL,
} from "@/features/check-ins/components/check-in-badges";
import { useCheckIns } from "@/features/check-ins/queries";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import {
  addDays,
  cairoToday,
  formatPlainDate,
  isPlainDate,
  startOfMonth,
  startOfWeek,
} from "@/lib/cairo-time";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import type { CheckInResponse, CheckInResult } from "@/types";

const col = createColumns<CheckInResponse>();
const DEFAULT_PAGE_SIZE = 20;

const RANGES = [
  { value: "today", label: "Today", text: "today" },
  { value: "week", label: "This week", text: "this week" },
  { value: "month", label: "This month", text: "this month" },
  { value: "30d", label: "Last 30 days", text: "in the last 30 days" },
  { value: "all", label: "All time", text: "since the gym opened" },
  { value: "custom", label: "Custom dates", text: "in the chosen dates" },
] as const;
type Range = (typeof RANGES)[number]["value"];

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
  const params = useListParams();
  const rawRange = params.string("range", "today");
  const range: Range = RANGES.some((r) => r.value === rawRange) ? (rawRange as Range) : "today";
  const customFrom = params.string("from");
  const customTo = params.string("to");
  const rawResult = params.string("result");
  const result = CHECK_IN_RESULTS.some((r) => r.value === rawResult)
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
          header: "Time",
          cell: ({ getValue }) => (
            <>
              {/* Phones: time on top, date underneath, to keep the table narrow. */}
              <span className="flex flex-col tabular-nums sm:hidden">
                <span className="font-medium">{formatTime(getValue())}</span>
                <span className="text-xs text-muted-foreground">{formatDate(getValue())}</span>
              </span>
              <span className="hidden whitespace-nowrap tabular-nums sm:inline">
                {formatDateTime(getValue())}
              </span>
            </>
          ),
        }),
        col.accessor("memberName", {
          header: "Member",
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
                {row.original.memberName}
              </Link>
            </div>
          ),
        }),
        col.accessor("result", {
          header: "Result",
          cell: ({ getValue }) => <CheckInResultBadge result={getValue()} />,
        }),
        col.accessor("denyReason", {
          header: "Reason",
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => {
            const reason = getValue();
            return (
              <span className="text-muted-foreground">
                {reason ? DENY_REASON_LABEL[reason] : "—"}
              </span>
            );
          },
        }),
        col.accessor("checkedBy", {
          header: "Scanned by",
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue() ?? "—"}</span>
          ),
        }),
      ]),
    [],
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
  const periodText =
    range === "custom" && days.from && days.to && !badCustomRange
      ? `from ${formatPlainDate(days.from)} to ${formatPlainDate(days.to)}`
      : RANGES.find((r) => r.value === range)!.text;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance log"
        description={
          checkIns.data
            ? `${checkIns.data.totalCount} ${checkIns.data.totalCount === 1 ? "scan" : "scans"} ${periodText}${result ? `, ${CHECK_IN_RESULTS.find((r) => r.value === result)!.label.toLowerCase()} only` : ""}.`
            : "Every scan at the door, including members who were turned away."
        }
        actions={
          <>
            <ExportButton
              name="check-ins"
              itemLabel="check-ins"
              filters={checkInParams(filters)}
              disabled={badCustomRange || checkIns.data?.totalCount === 0}
            />
            <Button asChild>
              <Link href="/dashboard/check-in">
                <ScanLine /> Open check-in desk
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
          value={result ?? "all"}
          onValueChange={(value) => params.set({ result: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Result">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            {CHECK_IN_RESULTS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {memberId && (
          <span className="inline-flex h-9 items-center gap-2 rounded-md border bg-muted/50 ps-3 pe-1 text-sm">
            Member: <span className="font-medium">{memberName ?? `#${memberId}`}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Show all members"
              onClick={() => params.set({ memberId: null })}
            >
              <X />
            </Button>
          </span>
        )}
        {filtered && (
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        )}
      </div>
      {badCustomRange && (
        <p className="text-sm text-destructive">The end date must be on or after the start date.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {totalsError ? (
          <div className="sm:col-span-3">
            <QueryError
              title="We couldn't load the totals"
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
              label="Total scans"
              value={total}
              hint={`Recorded ${periodText}`}
            />
            <StatCard
              icon={LogIn}
              tone="success"
              label="Let in"
              value={allowed.data.totalCount}
              hint={total > 0 ? `${allowedShare}% of all scans` : "No scans in this period"}
            />
            <StatCard
              icon={ShieldX}
              tone="destructive"
              label="Turned away"
              value={denied.data.totalCount}
              hint="Refused at the door, with the reason logged"
            />
          </>
        )}
      </div>

      {checkIns.isError ? (
        <QueryError
          title="We couldn't load the check-ins"
          error={checkIns.error}
          onRetry={() => void checkIns.refetch()}
          retrying={checkIns.isFetching}
        />
      ) : (
        <DataTable
          label="Check-ins"
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
                title="No check-ins match"
                description={`Nobody was scanned ${periodText} with these filters. Try a longer period.`}
                action={
                  <Button variant="outline" onClick={reset}>
                    Reset filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ScanLine}
                title="No check-ins yet today"
                description="Scans from the check-in desk appear here the moment they happen."
                action={
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/check-in">Open check-in desk</Link>
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
                itemLabel="check-ins"
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
