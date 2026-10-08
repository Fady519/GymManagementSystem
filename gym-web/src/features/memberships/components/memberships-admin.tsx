"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { AlarmClock, IdCard, Plus, RefreshCcw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions } from "@/components/data-table/row-actions";
import { SearchInput } from "@/components/data-table/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useMembershipActions } from "@/features/memberships/components/membership-actions";
import { SellMembershipSheet } from "@/features/memberships/components/sell-membership-sheet";
import { useExpiringSoon, useMemberships } from "@/features/memberships/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { daysUntil, formatDate, formatDays, formatDuration, formatMoney } from "@/lib/format";
import type { MembershipResponse, MembershipState } from "@/types";

const col = createColumns<MembershipResponse>();
const DEFAULT_PAGE_SIZE = 10;
const STATES: MembershipState[] = ["Active", "Frozen", "Upcoming", "Expired", "Cancelled"];

/** Running memberships that end soon with no renewal yet: the reception's call list. */
function ExpiringSoon({ onRenew }: { onRenew: (m: MembershipResponse) => void }) {
  const expiring = useExpiringSoon();
  if (expiring.isError || (expiring.data && expiring.data.length === 0)) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlarmClock className="size-4 text-amber-600 dark:text-amber-400" /> Ending soon
        </CardTitle>
        <CardDescription>
          {expiring.data
            ? `${expiring.data.length} ${expiring.data.length === 1 ? "membership ends" : "memberships end"} this week with no renewal yet. A quick call keeps them training.`
            : "Checking who needs a renewal…"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {expiring.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {expiring.data.slice(0, 6).map((m) => {
              const days = daysUntil(m.endDate);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/members/${m.memberId}`}
                      className="block truncate text-sm font-semibold hover:underline"
                    >
                      {m.memberName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.planName} · {days <= 1 ? "ends tomorrow" : `ends in ${days} days`}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => onRenew(m)}>
                    <RefreshCcw /> Renew
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {expiring.data && expiring.data.length > 6 && (
          <p className="mt-3 text-xs text-muted-foreground">And {expiring.data.length - 6} more.</p>
        )}
      </CardContent>
    </Card>
  );
}

/** /dashboard/memberships: every membership by state, with sell / renew / freeze / cancel. */
export function MembershipsAdmin() {
  const params = useListParams();
  const rawState = params.string("state");
  const state = (STATES as string[]).includes(rawState) ? (rawState as MembershipState) : null;
  const search = params.string("search");
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const memberships = useMemberships({ state, search, page, pageSize });
  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(memberships.data, page, setPage);

  const sell = useDialogState<null>();
  const actions = useMembershipActions();
  const { rowActions, showDetails, run } = actions;

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("memberName", {
          header: "Member",
          cell: ({ row }) => (
            <div className="flex min-w-44 items-center gap-3">
              <MemberAvatar name={row.original.memberName} photoUrl={null} />
              <span className="truncate font-medium">{row.original.memberName}</span>
            </div>
          ),
        }),
        col.accessor("planName", {
          header: "Plan",
          meta: { className: "hidden sm:table-cell" },
          cell: ({ row }) => (
            <div>
              <p className="font-medium">{row.original.planName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(row.original.durationDays)}
              </p>
            </div>
          ),
        }),
        col.accessor("endDate", {
          header: "Period",
          meta: { className: "hidden md:table-cell" },
          cell: ({ row }) => (
            <div className="whitespace-nowrap">
              <p>
                {formatDate(row.original.startDate)} → {formatDate(row.original.endDate)}
              </p>
              {row.original.state === "Active" && (
                <p className="text-xs text-muted-foreground">
                  {formatDays(daysUntil(row.original.endDate))} left
                </p>
              )}
            </div>
          ),
        }),
        col.accessor("pricePaid", {
          header: "Paid",
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue())}</span>,
        }),
        col.accessor("state", {
          header: "Status",
          cell: ({ row }) => (
            <div className="flex flex-col items-start gap-1">
              <MembershipStateBadge state={row.original.state} />
              {row.original.frozenUntil && (
                <span className="text-xs text-muted-foreground">
                  until {formatDate(row.original.frozenUntil)}
                </span>
              )}
            </div>
          ),
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={`Actions for ${row.original.memberName}'s membership`}
              actions={rowActions(row.original)}
            />
          ),
        }),
      ]),
    [rowActions],
  );

  const data = memberships.data;
  const filtered = Boolean(search || state);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memberships"
        description={
          data
            ? filtered
              ? `${data.totalCount} ${data.totalCount === 1 ? "membership matches" : "memberships match"}.`
              : `${data.totalCount} memberships sold so far.`
            : "Sell, renew, freeze and cancel memberships."
        }
        actions={
          <Button onClick={() => sell.show(null)}>
            <Plus /> New membership
          </Button>
        }
      />

      <ExpiringSoon onRenew={(m) => run("renew", m)} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={state ?? "all"}
          onValueChange={(value) => params.set({ state: value === "all" ? null : value })}
        >
          <TabsList className="h-auto! flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            {STATES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchInput
          value={search}
          onChange={(value) => params.set({ search: value })}
          placeholder="Search by member name or phone"
          className="lg:max-w-xs lg:flex-1"
        />
      </div>

      {memberships.isError ? (
        <QueryError
          title="We couldn't load the memberships"
          error={memberships.error}
          onRetry={() => void memberships.refetch()}
          retrying={memberships.isFetching}
        />
      ) : (
        <DataTable
          label="Memberships"
          columns={columns}
          data={data?.items}
          getRowId={(m) => String(m.id)}
          isPending={memberships.isPending}
          isFetching={memberships.isFetching}
          skeletonRows={pageSize > 10 ? 10 : pageSize}
          onRowClick={showDetails}
          emptyState={
            filtered ? (
              <EmptyState
                icon={SearchX}
                title="No memberships match"
                description={
                  search
                    ? `No ${state ? state.toLowerCase() + " " : ""}membership belongs to a member matching “${search}”.`
                    : `There are no ${state?.toLowerCase()} memberships right now.`
                }
                action={
                  <Button
                    variant="outline"
                    onClick={() => params.set({ search: null, state: null })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={IdCard}
                title="No memberships yet"
                description="Sell the first plan to a member. Their payment is recorded and they can book classes right away."
                action={
                  <Button onClick={() => sell.show(null)}>
                    <Plus /> New membership
                  </Button>
                }
              />
            )
          }
          footer={
            data && (
              <DataTablePagination
                page={data.page}
                pageSize={data.pageSize}
                totalCount={data.totalCount}
                totalPages={data.totalPages}
                itemLabel="memberships"
                onPageChange={setPage}
                onPageSizeChange={(size) =>
                  params.set({ pageSize: size === DEFAULT_PAGE_SIZE ? null : size })
                }
              />
            )
          }
        />
      )}

      <SellMembershipSheet open={sell.open} onOpenChange={sell.setOpen} />
      {actions.dialogs}
    </div>
  );
}
