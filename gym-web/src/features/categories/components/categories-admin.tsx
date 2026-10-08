"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, createColumns } from "@/components/data-table/data-table";
import { RowActions } from "@/components/data-table/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { CategoryFormSheet } from "@/features/categories/components/category-form-sheet";
import { useCategories, useDeleteCategory } from "@/features/categories/queries";
import { useDialogState } from "@/hooks/use-dialog-state";
import { formatDate } from "@/lib/format";
import { toastError } from "@/lib/notify";
import type { CategoryResponse } from "@/types";

const col = createColumns<CategoryResponse>();

function trainersLabel(count: number) {
  return count === 1 ? "1 trainer" : `${count} trainers`;
}

/** The admin categories page: the types of classes the gym offers (Yoga, Boxing...). */
export function CategoriesAdmin() {
  const categories = useCategories();
  const deleteCategory = useDeleteCategory();
  const form = useDialogState<CategoryResponse>();
  const confirmDelete = useDialogState<CategoryResponse>();
  const { show: showForm } = form;
  const { show: showDelete } = confirmDelete;

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: "Category",
          cell: ({ getValue }) => (
            <span className="flex items-center gap-3 font-medium">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Tags className="size-4" />
              </span>
              {getValue()}
            </span>
          ),
        }),
        col.accessor("trainersCount", {
          header: "Trainers",
          cell: ({ row }) =>
            row.original.trainersCount > 0 ? (
              // Opens the trainers list already filtered to this category.
              <Link
                href={`/dashboard/trainers?categoryId=${row.original.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {trainersLabel(row.original.trainersCount)}
              </Link>
            ) : (
              <span className="text-muted-foreground">No trainers yet</span>
            ),
        }),
        col.accessor("createdAt", {
          header: "Added",
          meta: { className: "hidden sm:table-cell" },
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
                { label: "Rename", icon: Pencil, onSelect: () => showForm(row.original) },
                {
                  label: "Delete category",
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => showDelete(row.original),
                },
              ]}
            />
          ),
        }),
      ]),
    [showForm, showDelete],
  );

  const data = categories.data;
  const totalTrainers = data?.reduce((sum, c) => sum + c.trainersCount, 0) ?? 0;
  const toDelete = confirmDelete.item;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class categories"
        description={
          data && data.length > 0
            ? `${data.length} categories with ${trainersLabel(totalTrainers)} assigned. Each one is a program on the website and a trainer speciality.`
            : "The types of classes you offer, like Yoga or Boxing."
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus /> New category
          </Button>
        }
      />

      {categories.isError ? (
        <QueryError
          title="We couldn't load the categories"
          error={categories.error}
          onRetry={() => void categories.refetch()}
          retrying={categories.isFetching}
        />
      ) : (
        <DataTable
          label="Class categories"
          columns={columns}
          data={data}
          getRowId={(c) => String(c.id)}
          isPending={categories.isPending}
          isFetching={categories.isFetching}
          skeletonRows={5}
          onRowClick={(c) => form.show(c)}
          emptyState={
            <EmptyState
              icon={Tags}
              title="No categories yet"
              description="Add the types of classes you run. Trainers need one as their speciality, and classes are scheduled under them."
              action={
                <Button onClick={() => form.show(null)}>
                  <Plus /> Add the first category
                </Button>
              }
            />
          }
        />
      )}

      <CategoryFormSheet open={form.open} onOpenChange={form.setOpen} category={form.item} />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={confirmDelete.setOpen}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        description={
          toDelete && toDelete.trainersCount > 0
            ? `${trainersLabel(toDelete.trainersCount)} still have ${toDelete.name} as their speciality. Move them to another category first, then delete it.`
            : "It disappears from the website and can't be used for new classes. Past classes keep their history."
        }
        confirmLabel="Delete category"
        destructive
        pending={deleteCategory.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteCategory.mutate(toDelete.id, {
            onSuccess: () => toast.success(`${toDelete.name} was deleted`),
            onError: (error) => toastError(`Couldn't delete ${toDelete.name}`, error),
            onSettled: () => confirmDelete.setOpen(false),
          });
        }}
      />
    </div>
  );
}
