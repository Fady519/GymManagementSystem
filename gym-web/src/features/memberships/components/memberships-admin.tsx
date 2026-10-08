"use client";

import { useCallback, useMemo } from "react";
import { AlarmClock, IdCard, Plus, RefreshCcw, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions } from "@/components/data-table/row-actions";
import { SearchInput } from "@/components/data-table/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { MembershipStateBadge } from "@/features/member-portal/components/membership-state-badge";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { isolate } from "@/lib/bidi";
import { useMembershipActions } from "@/features/memberships/components/membership-actions";
import { SellMembershipSheet } from "@/features/memberships/components/sell-membership-sheet";
import { useExpiringSoon, useMemberships } from "@/features/memberships/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { useNow } from "@/hooks/use-now";
import { daysUntil } from "@/lib/format";
import type { MembershipResponse, MembershipState } from "@/types";
import { Link } from "@/i18n/navigation";

const col = createColumns<MembershipResponse>();
const DEFAULT_PAGE_SIZE = 10;
const STATES: MembershipState[] = ["Active", "Frozen", "Upcoming", "Expired", "Cancelled"];

/** Running memberships that end soon with no renewal yet: the reception's call list. */
function ExpiringSoon({ onRenew }: { onRenew: (m: MembershipResponse) => void }) {
  const t = useTranslations("Memberships.expiring");
  const tActions = useTranslations("Memberships.actions");
  const expiring = useExpiringSoon();
  // The clock is read after the page loads (null before), never during rendering.
  const now = useNow();
  if (expiring.isError || (expiring.data && expiring.data.length === 0)) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlarmClock className="size-4 text-amber-600 dark:text-amber-400" /> {t("title")}
        </CardTitle>
        <CardDescription>
          {expiring.data ? t("description", { count: expiring.data.length }) : t("checking")}
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
              const days = now ? daysUntil(m.endDate, now) : null;
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
                      <bdi>{m.memberName}</bdi>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <bdi>{m.planName}</bdi>
                      {days !== null && ` · ${t("endsIn", { count: Math.max(days, 1) })}`}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => onRenew(m)}>
                    <RefreshCcw /> {tActions("renew")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {expiring.data && expiring.data.length > 6 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("more", { count: expiring.data.length - 6 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** /dashboard/memberships: every membership by state, with sell / renew / freeze / cancel. */
export function MembershipsAdmin() {
  const t = useTranslations("Memberships.list");
  const tCols = useTranslations("Members.columns");
  const tEnums = useTranslations("Enums.MembershipState");
  const f = useFormat();
  const now = useNow();
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
          header: tCols("member"),
          cell: ({ row }) => (
            <div className="flex min-w-44 items-center gap-3">
              <MemberAvatar name={row.original.memberName} photoUrl={null} />
              <span className="truncate font-medium">
                <bdi>{row.original.memberName}</bdi>
              </span>
            </div>
          ),
        }),
        col.accessor("planName", {
          header: tCols("plan"),
          meta: { className: "hidden sm:table-cell" },
          cell: ({ row }) => (
            <div>
              <p className="font-medium">
                <bdi>{row.original.planName}</bdi>
              </p>
              <p className="text-xs text-muted-foreground">
                {f.duration(row.original.durationDays)}
              </p>
            </div>
          ),
        }),
        col.accessor("endDate", {
          header: tCols("period"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ row }) => (
            <div className="whitespace-nowrap">
              <p>
                {tCols("dateRange", {
                  start: f.date(row.original.startDate),
                  end: f.date(row.original.endDate),
                })}
              </p>
              {row.original.state === "Active" && now && (
                <p className="text-xs text-muted-foreground">
                  {t("left", { days: f.days(daysUntil(row.original.endDate, now)) })}
                </p>
              )}
            </div>
          ),
        }),
        col.accessor("pricePaid", {
          header: tCols("paid"),
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => <span className="tabular-nums">{f.money(getValue())}</span>,
        }),
        col.accessor("state", {
          header: tCols("status"),
          cell: ({ row }) => (
            <div className="flex flex-col items-start gap-1">
              <MembershipStateBadge state={row.original.state} />
              {row.original.frozenUntil && (
                <span className="text-xs text-muted-foreground">
                  {tCols("frozenUntil", { date: f.date(row.original.frozenUntil) })}
                </span>
              )}
            </div>
          ),
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">{tCols("actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={t("rowActions", { name: isolate(row.original.memberName) })}
              actions={rowActions(row.original)}
            />
          ),
        }),
      ]),
    [rowActions, t, tCols, f, now],
  );

  const data = memberships.data;
  const filtered = Boolean(search || state);

  // "No frozen membership belongs to a member matching «Ali»." The state word is translated.
  const noMatchText = () => {
    const stateWord = state ? tEnums(state) : null;
    if (search) {
      const term = isolate(search);
      return stateWord
        ? t("noMatchSearchState", { search: term, state: stateWord })
        : t("noMatchSearch", { search: term });
    }
    return t("noMatchState", { state: stateWord ?? "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          data
            ? filtered
              ? t("countFiltered", { count: data.totalCount })
              : t("countAll", { count: data.totalCount })
            : t("description")
        }
        actions={
          <>
            <ExportButton
              name="memberships"
              itemLabel={t("itemLabel")}
              filters={{ state, search }}
              disabled={data?.totalCount === 0}
            />
            <Button onClick={() => sell.show(null)}>
              <Plus /> {t("new")}
            </Button>
          </>
        }
      />

      <ExpiringSoon onRenew={(m) => run("renew", m)} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={state ?? "all"}
          onValueChange={(value) => params.set({ state: value === "all" ? null : value })}
        >
          <TabsList className="h-auto! flex-wrap">
            <TabsTrigger value="all">{t("all")}</TabsTrigger>
            {STATES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {tEnums(value)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchInput
          value={search}
          onChange={(value) => params.set({ search: value })}
          placeholder={t("searchPlaceholder")}
          className="lg:max-w-xs lg:flex-1"
        />
      </div>

      {memberships.isError ? (
        <QueryError
          title={t("loadError")}
          error={memberships.error}
          onRetry={() => void memberships.refetch()}
          retrying={memberships.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
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
                title={t("noMatchTitle")}
                description={noMatchText()}
                action={
                  <Button
                    variant="outline"
                    onClick={() => params.set({ search: null, state: null })}
                  >
                    {t("clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={IdCard}
                title={t("emptyTitle")}
                description={t("emptyBody")}
                action={
                  <Button onClick={() => sell.show(null)}>
                    <Plus /> {t("new")}
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

      <SellMembershipSheet open={sell.open} onOpenChange={sell.setOpen} />
      {actions.dialogs}
    </div>
  );
}
