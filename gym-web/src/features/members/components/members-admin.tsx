"use client";

import { useCallback, useMemo } from "react";
import { Eye, SearchX, Trash2, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, createColumns, type SortState } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions } from "@/components/data-table/row-actions";
import { SearchInput } from "@/components/data-table/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { MEMBER_STATES, MemberStateBadge } from "@/features/members/components/member-state-badge";
import { isolate } from "@/lib/bidi";
import { useDeleteMember, useMembers } from "@/features/members/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { toastError } from "@/lib/notify";
import { GENDERS } from "@/lib/validation";
import type { Gender, MemberListItem, MemberMembershipState, MemberSortBy } from "@/types";
import { Link, useRouter } from "@/i18n/navigation";

const col = createColumns<MemberListItem>();
const DEFAULT_PAGE_SIZE = 10;

/** Reads a value from the URL only if it's one of the allowed ones. */
function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** The admin members page: searched, filtered, sorted and paged by the API, with the state in the URL. */
export function MembersAdmin() {
  const t = useTranslations("Members.list");
  const tEnums = useTranslations("Enums");
  const f = useFormat();
  const router = useRouter();
  const params = useListParams();
  const search = params.string("search");
  const gender = oneOf<Gender>(params.string("gender"), GENDERS);
  const state = oneOf<MemberMembershipState>(params.string("state"), MEMBER_STATES);
  const sortBy = oneOf<MemberSortBy>(params.string("sortBy"), ["Name", "CreatedAt"]) ?? "CreatedAt";
  // Default: newest first. Name defaults to A→Z.
  const dir = params.string("dir");
  const descending = dir ? dir === "desc" : sortBy === "CreatedAt";
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const members = useMembers({ search, gender, state, sortBy, descending, page, pageSize });
  const deleteMember = useDeleteMember();
  const confirmDelete = useDialogState<MemberListItem>();
  const { show: showDelete } = confirmDelete;

  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(members.data, page, setPage);

  const sort: SortState = { key: sortBy, desc: descending };
  const onSortChange = (key: string) => {
    const nextDesc = key === sortBy ? !descending : key === "CreatedAt";
    const isDefault = key === "CreatedAt" && nextDesc;
    params.set({
      sortBy: isDefault ? null : key,
      dir: isDefault ? null : nextDesc ? "desc" : "asc",
    });
  };

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: t("columns.member"),
          meta: { sortKey: "Name" },
          cell: ({ row }) => (
            <div className="flex min-w-52 items-center gap-3">
              <MemberAvatar name={row.original.name} photoUrl={row.original.photoUrl} />
              <div className="min-w-0">
                {/* <bdi>: the name keeps its own direction, whatever the UI language. */}
                <Link
                  href={`/dashboard/members/${row.original.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  <bdi>{row.original.name}</bdi>
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  <span dir="ltr">{row.original.email}</span>
                </p>
              </div>
            </div>
          ),
        }),
        col.accessor("phone", {
          header: t("columns.phone"),
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => (
            <span dir="ltr" className="tabular-nums">
              {getValue()}
            </span>
          ),
        }),
        col.accessor("gender", {
          header: t("columns.gender"),
          meta: { className: "hidden xl:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{tEnums(`Gender.${getValue()}`)}</span>
          ),
        }),
        col.accessor("membershipState", {
          header: t("columns.membership"),
          cell: ({ getValue }) => <MemberStateBadge state={getValue()} />,
        }),
        col.accessor("createdAt", {
          header: t("columns.joined"),
          meta: { sortKey: "CreatedAt", className: "hidden sm:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{f.date(getValue())}</span>
          ),
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">{t("columns.actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={t("rowActions", { name: isolate(row.original.name) })}
              actions={[
                {
                  label: t("openProfile"),
                  icon: Eye,
                  onSelect: () => router.push(`/dashboard/members/${row.original.id}`),
                },
                {
                  label: t("delete"),
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(row.original),
                },
              ]}
            />
          ),
        }),
      ]),
    [router, showDelete, t, tEnums, f],
  );

  const data = members.data;
  const filtered = Boolean(search || gender || state);
  const clearFilters = () => params.set({ search: null, gender: null, state: null });
  const toDelete = confirmDelete.item;

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
              name="members"
              itemLabel={t("itemLabel")}
              filters={{ search, gender, membershipState: state, sortBy, descending }}
              disabled={data?.totalCount === 0}
            />
            <Button asChild>
              <Link href="/dashboard/members/new">
                <UserPlus /> {t("add")}
              </Link>
            </Button>
          </>
        }
      />

      <Tabs
        value={state ?? "all"}
        onValueChange={(value) => params.set({ state: value === "all" ? null : value })}
      >
        <TabsList className="h-auto! flex-wrap">
          <TabsTrigger value="all">{t("all")}</TabsTrigger>
          {MEMBER_STATES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {tEnums(`MemberMembershipState.${s}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => params.set({ search: value })}
          placeholder={t("searchPlaceholder")}
          className="sm:max-w-sm sm:flex-1"
        />
        <Select
          value={gender ?? "all"}
          onValueChange={(value) => params.set({ gender: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label={t("genderFilter")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allGenders")}</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {tEnums(`Gender.${g}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {members.isError ? (
        <QueryError
          title={t("loadError")}
          error={members.error}
          onRetry={() => void members.refetch()}
          retrying={members.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
          columns={columns}
          data={data?.items}
          getRowId={(m) => String(m.id)}
          isPending={members.isPending}
          isFetching={members.isFetching}
          skeletonRows={pageSize > 10 ? 10 : pageSize}
          sort={sort}
          onSortChange={onSortChange}
          onRowClick={(m) => router.push(`/dashboard/members/${m.id}`)}
          emptyState={
            filtered ? (
              <EmptyState
                icon={SearchX}
                title={t("noMatchTitle")}
                description={
                  search ? t("noMatchSearch", { search: isolate(search) }) : t("noMatchFilters")
                }
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    {t("clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Users}
                title={t("emptyTitle")}
                description={t("emptyBody")}
                action={
                  <Button asChild>
                    <Link href="/dashboard/members/new">
                      <UserPlus /> {t("emptyAction")}
                    </Link>
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

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={toDelete ? t("deleteTitle", { name: isolate(toDelete.name) }) : t("delete")}
        description={t("deleteBody")}
        confirmLabel={t("delete")}
        destructive
        pending={deleteMember.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          const name = isolate(toDelete.name);
          deleteMember.mutate(toDelete.id, {
            onSuccess: () => toast.success(t("deleted", { name })),
            onError: (error) => toastError(t("deleteError", { name }), error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
