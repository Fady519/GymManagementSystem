"use client";

import { useCallback, useMemo } from "react";
import { Dumbbell, Mail, Pencil, Plus, SearchX, Trash2, UserPlus } from "lucide-react";
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
import { RowActions } from "@/components/data-table/row-actions";
import { SearchInput } from "@/components/data-table/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useCategories } from "@/features/categories/queries";
import { TrainerFormSheet } from "@/features/trainers/components/trainer-form-sheet";
import { useDeleteTrainer, useSendTrainerInvite, useTrainers } from "@/features/trainers/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useFormat } from "@/hooks/use-format";
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { initialsOf } from "@/lib/format";
import { isAlreadyActivated, toastError, toastInvite } from "@/lib/notify";
import { isolate } from "@/lib/bidi";
import type { TrainerResponse } from "@/types";

const col = createColumns<TrainerResponse>();
const DEFAULT_PAGE_SIZE = 10;

/** For rich messages: <bdi>name</bdi> keeps a stored name's own direction inside a translated sentence. */
const bdi = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

/** The admin trainers page: searched, filtered and paged by the API, with the state in the URL. */
export function TrainersAdmin() {
  const t = useTranslations("Trainers");
  const tInvite = useTranslations("Trainers.invite");
  const f = useFormat();
  const params = useListParams();
  const search = params.string("search");
  const categoryId = params.number("categoryId", 0) || null;
  const page = params.number("page", 1);
  const pageSize = pageSizeFrom(params, DEFAULT_PAGE_SIZE);

  const trainers = useTrainers({ search, categoryId, page, pageSize });
  const { set: setParams } = params;
  const setPage = useCallback((next: number) => setParams({ page: next }), [setParams]);
  useClampPage(trainers.data, page, setPage);
  const categories = useCategories();
  const deleteTrainer = useDeleteTrainer();
  const invite = useSendTrainerInvite();
  const form = useDialogState<TrainerResponse>();
  const confirmDelete = useDialogState<TrainerResponse>();
  const { show: showForm } = form;
  const { show: showDelete } = confirmDelete;
  const { mutate: sendInvite } = invite;

  const onInvite = useCallback(
    (trainer: TrainerResponse) =>
      sendInvite(trainer.id, {
        onSuccess: (result) =>
          toastInvite(result.trainer.name, result.trainer.email, result.inviteSent),
        onError: (error) =>
          isAlreadyActivated(error)
            ? toast.info(tInvite("alreadyActive", { name: isolate(trainer.name) }), {
                description: tInvite("alreadyActiveDescription"),
              })
            : toastError(tInvite("failed", { name: isolate(trainer.name) }), error),
      }),
    [sendInvite, tInvite],
  );

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: t("columns.trainer"),
          cell: ({ row }) => (
            <div className="flex min-w-52 items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initialsOf(row.original.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <bdi>{row.original.name}</bdi>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <bdi dir="ltr">{row.original.email}</bdi>
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
        col.accessor("categoryName", {
          header: t("columns.speciality"),
          cell: ({ getValue }) => (
            <Badge variant="secondary">
              <bdi>{getValue()}</bdi>
            </Badge>
          ),
        }),
        col.accessor("hasAccount", {
          header: t("columns.login"),
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) =>
            getValue() ? (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                {t("hasLogin")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {t("noLogin")}
              </Badge>
            ),
        }),
        col.accessor("createdAt", {
          header: t("columns.joined"),
          meta: { className: "hidden xl:table-cell" },
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
              label={t("actions.label", { name: isolate(row.original.name) })}
              actions={[
                { label: t("actions.edit"), icon: Pencil, onSelect: () => showForm(row.original) },
                {
                  label: row.original.hasAccount ? t("actions.resendInvite") : t("actions.invite"),
                  icon: row.original.hasAccount ? Mail : UserPlus,
                  onSelect: () => onInvite(row.original),
                },
                {
                  label: t("actions.remove"),
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(row.original),
                },
              ]}
            />
          ),
        }),
      ]),
    [t, f, showForm, showDelete, onInvite],
  );

  const data = trainers.data;
  const filtered = Boolean(search || categoryId);
  const categoryName = categories.data?.find((c) => c.id === categoryId)?.name;
  const toDelete = confirmDelete.item;

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
            <Plus /> {t("add")}
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
          value={categoryId ? String(categoryId) : "all"}
          onValueChange={(value) => params.set({ categoryId: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label={t("filterSpeciality")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allSpecialities")}</SelectItem>
            {categories.data?.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                <bdi>{category.name}</bdi> ({f.number(category.trainersCount)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={() => params.set({ search: null, categoryId: null })}>
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {trainers.isError ? (
        <QueryError
          title={t("loadError")}
          error={trainers.error}
          onRetry={() => void trainers.refetch()}
          retrying={trainers.isFetching}
        />
      ) : (
        <DataTable
          label={t("title")}
          columns={columns}
          data={data?.items}
          getRowId={(t) => String(t.id)}
          isPending={trainers.isPending}
          isFetching={trainers.isFetching}
          skeletonRows={pageSize > 10 ? 10 : pageSize}
          onRowClick={(t) => form.show(t)}
          emptyState={
            filtered ? (
              <EmptyState
                icon={SearchX}
                title={t("empty.filteredTitle")}
                description={
                  search
                    ? categoryName
                      ? t.rich("empty.searchInCategory", {
                          query: search,
                          category: categoryName,
                          bdi,
                        })
                      : t.rich("empty.search", { query: search, bdi })
                    : categoryName
                      ? t.rich("empty.category", { category: categoryName, bdi })
                      : t("empty.categoryUnknown")
                }
                action={
                  <Button
                    variant="outline"
                    onClick={() => params.set({ search: null, categoryId: null })}
                  >
                    {t("clearFilters")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Dumbbell}
                title={t("empty.title")}
                description={t("empty.description")}
                action={
                  <Button onClick={() => form.show(null)}>
                    <Plus /> {t("empty.action")}
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

      <TrainerFormSheet open={form.open} onOpenChange={form.setOpen} trainer={form.item} />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={t("remove.title", { name: isolate(toDelete?.name ?? "") })}
        description={t("remove.description")}
        confirmLabel={t("actions.remove")}
        destructive
        pending={deleteTrainer.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteTrainer.mutate(toDelete.id, {
            onSuccess: () => toast.success(t("remove.done", { name: isolate(toDelete.name) })),
            onError: (error) =>
              toastError(t("remove.failed", { name: isolate(toDelete.name) }), error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
