"use client";

import { useCallback, useMemo } from "react";
import { Dumbbell, Mail, Pencil, Plus, SearchX, Trash2, UserPlus } from "lucide-react";
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
import { pageSizeFrom, useClampPage, useListParams } from "@/hooks/use-list-params";
import { formatDate, initialsOf } from "@/lib/format";
import { isAlreadyActivated, toastError, toastInvite } from "@/lib/notify";
import type { TrainerResponse } from "@/types";

const col = createColumns<TrainerResponse>();
const DEFAULT_PAGE_SIZE = 10;

/** The admin trainers page: searched, filtered and paged by the API, with the state in the URL. */
export function TrainersAdmin() {
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
            ? toast.info(`${trainer.name} already set a password`, {
                description:
                  "Their login is active. If they forgot it, they can use “Forgot password”.",
              })
            : toastError(`Couldn't send the invite to ${trainer.name}`, error),
      }),
    [sendInvite],
  );

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: "Trainer",
          cell: ({ row }) => (
            <div className="flex min-w-52 items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initialsOf(row.original.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{row.original.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
              </div>
            </div>
          ),
        }),
        col.accessor("phone", {
          header: "Phone",
          meta: { className: "hidden md:table-cell" },
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
        }),
        col.accessor("categoryName", {
          header: "Speciality",
          cell: ({ getValue }) => <Badge variant="secondary">{getValue()}</Badge>,
        }),
        col.accessor("hasAccount", {
          header: "Login",
          meta: { className: "hidden lg:table-cell" },
          cell: ({ getValue }) =>
            getValue() ? (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                Has login
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No login
              </Badge>
            ),
        }),
        col.accessor("createdAt", {
          header: "Joined",
          meta: { className: "hidden xl:table-cell" },
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{formatDate(getValue())}</span>
          ),
        }),
        col.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          meta: { className: "w-12 text-end" },
          cell: ({ row }) => (
            <RowActions
              label={`Actions for ${row.original.name}`}
              actions={[
                { label: "Edit details", icon: Pencil, onSelect: () => showForm(row.original) },
                {
                  label: row.original.hasAccount ? "Resend invite" : "Send login invite",
                  icon: row.original.hasAccount ? Mail : UserPlus,
                  onSelect: () => onInvite(row.original),
                },
                {
                  label: "Remove trainer",
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(row.original),
                },
              ]}
            />
          ),
        }),
      ]),
    [showForm, showDelete, onInvite],
  );

  const data = trainers.data;
  const filtered = Boolean(search || categoryId);
  const categoryName = categories.data?.find((c) => c.id === categoryId)?.name;
  const toDelete = confirmDelete.item;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainers"
        description={
          data
            ? filtered
              ? `${data.totalCount} ${data.totalCount === 1 ? "trainer matches" : "trainers match"} your filters.`
              : `${data.totalCount} coaches on the team.`
            : "Your coaching team and their specialities."
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> Add trainer
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => params.set({ search: value })}
          placeholder="Search by name, email or phone"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select
          value={categoryId ? String(categoryId) : "all"}
          onValueChange={(value) => params.set({ categoryId: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter by speciality">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialities</SelectItem>
            {categories.data?.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name} ({category.trainersCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={() => params.set({ search: null, categoryId: null })}>
            Clear filters
          </Button>
        )}
      </div>

      {trainers.isError ? (
        <QueryError
          title="We couldn't load the trainers"
          error={trainers.error}
          onRetry={() => void trainers.refetch()}
          retrying={trainers.isFetching}
        />
      ) : (
        <DataTable
          label="Trainers"
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
                title="No trainers match"
                description={
                  search
                    ? `Nobody${categoryName ? ` in ${categoryName}` : ""} matches “${search}”. Check the spelling or search by phone number.`
                    : `No trainer has ${categoryName ?? "this category"} as their speciality yet.`
                }
                action={
                  <Button
                    variant="outline"
                    onClick={() => params.set({ search: null, categoryId: null })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Dumbbell}
                title="No trainers yet"
                description="Add your coaches so you can schedule classes with them. Each one gets their own login."
                action={
                  <Button onClick={() => form.show(null)}>
                    <Plus /> Add the first trainer
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
                itemLabel="trainers"
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
        title={`Remove ${toDelete?.name ?? "trainer"}?`}
        description="They leave the team list and their login is turned off. Past classes keep their history. If they still have upcoming classes, reassign or cancel those first."
        confirmLabel="Remove trainer"
        destructive
        pending={deleteTrainer.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteTrainer.mutate(toDelete.id, {
            onSuccess: () => toast.success(`${toDelete.name} was removed from the team`),
            onError: (error) => toastError(`Couldn't remove ${toDelete.name}`, error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
