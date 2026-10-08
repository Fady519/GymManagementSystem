"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { useSaveCategory } from "@/features/categories/queries";
import { applyServerErrors } from "@/lib/form-errors";
import type { CategoryResponse } from "@/types";

const FORM_ID = "category-form";

/** Same rule as SaveCategoryRequestValidator. */
const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(50, "Name can be at most 50 characters."),
});
type CategoryValues = z.infer<typeof categorySchema>;

type CategoryFormProps = {
  category: CategoryResponse | null;
  save: ReturnType<typeof useSaveCategory>;
  onSaved: () => void;
};

function CategoryForm({ category, save, onSaved }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "" },
  });

  const onSubmit = async (values: CategoryValues) => {
    try {
      const saved = await save.mutateAsync({ id: category?.id ?? null, name: values.name });
      toast.success(category ? "Category renamed" : "Category added", {
        description: category
          ? `It's now called ${saved.name} everywhere, including the website.`
          : `${saved.name} is ready. Assign trainers to it and schedule its classes.`,
      });
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, ["name"], { codes: { "Category.NameTaken": "name" } });
    }
  };

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />
      <FormField
        id="category-name"
        label="Category name"
        error={errors.name?.message}
        description="Visitors see it on the website's programs section, and trainers get it as their speciality."
      >
        <Input
          {...fieldProps("category-name", errors.name?.message, true)}
          placeholder="e.g. CrossFit"
          maxLength={50}
          autoFocus
          {...register("name")}
        />
      </FormField>
    </form>
  );
}

type CategoryFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryResponse | null;
};

/** The side panel for adding or renaming a category. */
export function CategoryFormSheet({ open, onOpenChange, category }: CategoryFormSheetProps) {
  const save = useSaveCategory();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? `Rename ${category.name}` : "New category"}
      description={
        category
          ? "The new name shows up everywhere this category is used."
          : "A type of class you offer, like Yoga or Boxing."
      }
      formId={FORM_ID}
      submitLabel={category ? "Save name" : "Add category"}
      submitting={save.isPending}
    >
      <CategoryForm category={category} save={save} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
