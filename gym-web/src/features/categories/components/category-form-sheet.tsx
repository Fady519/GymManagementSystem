"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { FormSheet } from "@/components/shared/form-sheet";
import { useSaveCategory } from "@/features/categories/queries";
import { applyServerErrors } from "@/lib/form-errors";
import { isolate } from "@/lib/bidi";
import type { CategoryResponse } from "@/types";

const FORM_ID = "category-form";
// Same limits as SaveCategoryRequestValidator.
const NAME_MIN = 2;
const NAME_MAX = 50;

/** The category rule, with messages in the current language (pass the "Categories.errors" translator). */
function categorySchema(t: ReturnType<typeof useTranslations<"Categories.errors">>) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN, t("nameMin", { min: NAME_MIN }))
      .max(NAME_MAX, t("nameMax", { max: NAME_MAX })),
  });
}
type CategoryValues = z.infer<ReturnType<typeof categorySchema>>;

type CategoryFormProps = {
  category: CategoryResponse | null;
  save: ReturnType<typeof useSaveCategory>;
  onSaved: () => void;
};

function CategoryForm({ category, save, onSaved }: CategoryFormProps) {
  const t = useTranslations("Categories.form");
  const tErrors = useTranslations("Categories.errors");
  const schema = useMemo(() => categorySchema(tErrors), [tErrors]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? "" },
  });

  const onSubmit = async (values: CategoryValues) => {
    try {
      const saved = await save.mutateAsync({ id: category?.id ?? null, name: values.name });
      toast.success(category ? t("renamed") : t("added"), {
        description: category
          ? t("renamedDescription", { name: isolate(saved.name) })
          : t("addedDescription", { name: isolate(saved.name) }),
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
        label={t("name")}
        error={errors.name?.message}
        description={t("nameHint")}
      >
        <Input
          {...fieldProps("category-name", errors.name?.message, true)}
          placeholder={t("namePlaceholder")}
          maxLength={NAME_MAX}
          autoFocus
          // Text side follows what is typed (Arabic or English); an empty box keeps the page side.
          className="[unicode-bidi:plaintext]"
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
  const t = useTranslations("Categories.form");
  const save = useSaveCategory();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t("titleEdit", { name: isolate(category.name) }) : t("titleNew")}
      description={category ? t("descriptionEdit") : t("descriptionNew")}
      formId={FORM_ID}
      submitLabel={category ? t("submitEdit") : t("submitNew")}
      submitting={save.isPending}
    >
      <CategoryForm category={category} save={save} onSaved={() => onOpenChange(false)} />
    </FormSheet>
  );
}
