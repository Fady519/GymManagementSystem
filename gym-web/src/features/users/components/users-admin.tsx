"use client";

import { useCallback, useMemo } from "react";
import { Mail, Plus, SearchX, ShieldAlert, UserCheck, UserX, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { RowActions, type RowAction } from "@/components/data-table/row-actions";
import { SearchInput } from "@/components/data-table/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useAuth } from "@/features/auth/hooks";
import { USER_ROLES, type UserRole } from "@/features/users/api";
import { AdminFormSheet } from "@/features/users/components/admin-form-sheet";
import { useResendUserInvite, useSetUserStatus, useUsers } from "@/features/users/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { initialsOf } from "@/lib/format";
import { toastError, toastInvite } from "@/lib/notify";
import { isolate } from "@/lib/bidi";
import { roleKey } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserResponse } from "@/types";

const col = createColumns<UserResponse>();
const DEFAULT_PAGE_SIZE = 10;

/** For rich messages: <bdi>text</bdi> keeps typed text in its own direction inside a translated sentence. */
const bdi = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

type AccountState = "disabled" | "invitePending" | "locked" | "active";

/** One label per account, the most important first: a disabled account can't log in whatever else is true. */
function stateOf(user: UserResponse): AccountState {
  if (!user.isActive) return "disabled";
  if (user.invitePending) return "invitePending";
  if (user.isLockedOut) return "locked";
  return "active";
}

const STATE_STYLE: Record<AccountState, string> = {
  active: "border-success/30 bg-success/10 text-success",
  invitePending: "border-warning/30 bg-warning/10 text-amber-700 dark:text-warning",
  locked: "border-warning/30 bg-warning/10 text-amber-700 dark:text-warning",
  disabled: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** True for a role value from the URL that the API accepts. */
function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

/**
 * The Super admin's accounts page: every login in the system (admins, trainers, members),
 * where they can add a new Admin, resend an invite, or disable / enable an account.
 * Search, role filter and page live in the URL, so a refresh or a shared link keeps them.
 */
export function UsersAdmin() {
  const t = useTranslations("Users");
  const tRoles = useTranslations("Roles");
  const f = useFormat();
  const { user: me } = useAuth();
  const isSuperAdmin = me ? roleKey(me.roles) === "superAdmin" : false;

  const params = useListParams();
  const search = params.string("search");
  const roleParam = params.string("role");
  const role = isUserRole(roleParam) ? roleParam : null;
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const users = useUsers({ search, role, page, pageSize }, isSuperAdmin);
  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(users.data, page, setPage);

  const resend = useResendUserInvite();
  const setStatus = useSetUserStatus();
  const form = useDialogState<null>();
  const confirmDisable = useDialogState<UserResponse>();
  const { show: showDisable } = confirmDisable;
  const { mutate: resendInvite } = resend;
  const { mutate: changeStatus } = setStatus;

  const onResend = useCallback(
    (user: UserResponse) =>
      resendInvite(user.id, {
        onSuccess: (result) => toastInvite(user.fullName, user.email, result.inviteSent),
        onError: (error) => toastError(t("invite.failed", { name: isolate(user.fullName) }), error),
      }),
    [resendInvite, t],
  );

  const onEnable = useCallback(
    (user: UserResponse) =>
      changeStatus(
        { id: user.id, isActive: true },
        {
          onSuccess: () => toast.success(t("status.enabled", { name: isolate(user.fullName) })),
          onError: (error) =>
            toastError(t("status.failed", { name: isolate(user.fullName) }), error),
        },
      ),
    [changeStatus, t],
  );

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("fullName", {
          header: t("columns.account"),
          cell: ({ row }) => (
            <div className="flex min-w-52 items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initialsOf(row.original.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <bdi>{row.original.fullName}</bdi>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <bdi dir="ltr">{row.original.email}</bdi>
                </p>
              </div>
            </div>
          ),
        }),
        col.accessor("roles", {
          header: t("columns.role"),
          cell: ({ getValue }) => (
            <Badge variant="secondary">{tRoles(roleKey(getValue()))}</Badge>
          ),
        }),
        col.display({
          id: "state",
          header: t("columns.status"),
          cell: ({ row }) => {
            const state = stateOf(row.original);
            return (
              <Badge variant="outline" className={cn(STATE_STYLE[state])}>
                {t(`state.${state}`)}
              </Badge>
            );
          },
        }),
        col.accessor("createdAt", {
          header: t("columns.created"),
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{f.date(getValue())}</span>
          ),
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">{t("columns.actions")}</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => {
            const user = row.original;
            // A Super admin can't be disabled (the API refuses), and that's the only thing
            // the menu could offer for them, so their row has no menu at all.
            if (user.roles.includes("SuperAdmin")) return null;
            const actions: RowAction[] = [];
            if (user.isActive && user.invitePending)
              actions.push({
                label: t("actions.resendInvite"),
                icon: Mail,
                onSelect: () => onResend(user),
              });
            actions.push(
              user.isActive
                ? {
                    label: t("actions.disable"),
                    icon: UserX,
                    destructive: true,
                    onSelect: () => showDisable(user),
                  }
                : { label: t("actions.enable"), icon: UserCheck, onSelect: () => onEnable(user) },
            );
            return (
              <RowActions
                label={t("actions.label", { name: isolate(user.fullName) })}
                actions={actions}
              />
            );
          },
        }),
      ]),
    [t, tRoles, f, onResend, onEnable, showDisable],
  );

  // An Admin who types /dashboard/users by hand: explain instead of showing an API error.
  if (me && !isSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("forbidden.title")}
        description={t("forbidden.description")}
      />
    );
  }

  const data = users.data;
  const filtered = Boolean(search || role);
  const toDisable = confirmDisable.item;
  const clearFilters = () => params.set({ search: null, role: null });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          data
            ? filtered
              ? t("descriptionFiltered", { count: data.totalCount })
              : t("descriptionCount", { count: data.totalCount })
            : t("description")
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> {t("addAdmin")}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => params.set({ search: value })}
          placeholder={t("search")}
          className="sm:max-w-sm sm:flex-1"
        />
        <Select
          value={role ?? "all"}
          onValueChange={(value) => params.set({ role: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label={t("filterRole")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRoles")}</SelectItem>
            {USER_ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {tRoles(roleKey([value]))}
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

      {users.isError ? (
        <QueryError
          title={t("loadError")}
          error={users.error}
          onRetry={() => void users.refetch()}
          retrying={users.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
          columns={columns}
          data={data?.items}
          getRowId={(u) => String(u.id)}
          isPending={users.isPending}
          isFetching={users.isFetching}
          skeletonRows={pageSize > 10 ? 10 : pageSize}
          emptyState={
            filtered ? (
              <EmptyState
                icon={SearchX}
                title={t("empty.filteredTitle")}
                description={
                  search
                    ? t.rich("empty.search", { query: search, bdi })
                    : t("empty.role")
                }
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    {t("clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={Users} title={t("empty.title")} description={t("empty.description")} />
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

      <AdminFormSheet open={form.open} onOpenChange={form.setOpen} />

      <ConfirmDialog
        open={confirmDisable.open}
        onOpenChange={confirmDisable.setOpen}
        title={t("disable.title", { name: isolate(toDisable?.fullName ?? "") })}
        description={t("disable.description")}
        confirmLabel={t("actions.disable")}
        destructive
        pending={setStatus.isPending}
        onConfirm={() => {
          if (!toDisable) return;
          changeStatus(
            { id: toDisable.id, isActive: false },
            {
              onSuccess: () =>
                toast.success(t("status.disabled", { name: isolate(toDisable.fullName) })),
              onError: (error) =>
                toastError(t("status.failed", { name: isolate(toDisable.fullName) }), error),
              onSettled: () => confirmDisable.setOpen(false),
            },
          );
        }}
      />
    </div>
  );
}
