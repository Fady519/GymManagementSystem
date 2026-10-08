"use client";

import { useMemo } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HeartPulse, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { bmiOf, type BmiCategory } from "@/features/member-profile/bmi";
import { ProfileSection, SaveBar } from "@/features/member-profile/components/profile-section";
import { useSaveMyHealthRecord } from "@/features/member-profile/queries";
import {
  healthSchema,
  NOTE_MAX,
  toHealthRequest,
  type HealthValues,
} from "@/features/member-profile/schemas";
import { showFormError } from "@/features/member-profile/server-errors";
import { useFormat } from "@/hooks/use-format";
import { BLOOD_TYPES, healthToFields } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { HealthRecordDto } from "@/types";

const FIELDS = ["height", "weight", "bloodType", "note"] as const;

const BMI_TONE: Record<BmiCategory, string> = {
  under: "border-warning/40 bg-warning/15 text-amber-700 dark:text-warning",
  normal: "border-success/30 bg-success/10 text-success",
  over: "border-warning/40 bg-warning/15 text-amber-700 dark:text-warning",
  obese: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Height, weight, blood type and a note for trainers (PUT /api/me/health-record). */
export function HealthForm({ healthRecord }: { healthRecord: HealthRecordDto | null }) {
  const t = useTranslations("MemberProfile.health");
  const tErrors = useTranslations("MemberProfile.errors");
  const save = useSaveMyHealthRecord();
  const schema = useMemo(() => healthSchema(tErrors), [tErrors]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<HealthValues>({
    resolver: zodResolver(schema),
    defaultValues: healthToFields(healthRecord),
  });

  const onSubmit = async (values: HealthValues) => {
    try {
      const saved = await save.mutateAsync(toHealthRequest(values));
      reset(healthToFields(saved));
      toast.success(t("saved"));
    } catch (error) {
      showFormError(error, setError, FIELDS, tErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <ProfileSection
        icon={<HeartPulse />}
        title={t("title")}
        description={t("hint")}
        footer={<SaveBar dirty={isDirty} pending={save.isPending} onDiscard={() => reset()} />}
      >
        <FormError message={errors.root?.server?.message} />
        {!healthRecord && (
          <p className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm text-primary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("empty")}
          </p>
        )}

        {/* items-start: an error under one box must not push the other boxes down. */}
        <div className="grid items-start gap-5 sm:grid-cols-3">
          <FormField id="me-height" label={t("height")} error={errors.height?.message}>
            <Input
              {...fieldProps("me-height", errors.height?.message)}
              inputMode="decimal"
              placeholder="175"
              maxLength={6}
              {...register("height")}
            />
          </FormField>
          <FormField id="me-weight" label={t("weight")} error={errors.weight?.message}>
            <Input
              {...fieldProps("me-weight", errors.weight?.message)}
              inputMode="decimal"
              placeholder="72.5"
              maxLength={6}
              {...register("weight")}
            />
          </FormField>
          <FormField id="me-blood" label={t("bloodType")} error={errors.bloodType?.message}>
            <Controller
              control={control}
              name="bloodType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    {...fieldProps("me-blood", errors.bloodType?.message)}
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t("bloodTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {/* dir="ltr": in Arabic, "A+" would otherwise show as "+A". */}
                        <span dir="ltr">{type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        <BmiHint control={control} />

        <FormField
          id="me-note"
          label={t("note")}
          error={errors.note?.message}
          description={t("noteHint")}
        >
          <Textarea
            {...fieldProps("me-note", errors.note?.message, true)}
            placeholder={t("notePlaceholder")}
            maxLength={NOTE_MAX}
            rows={3}
            {...register("note")}
          />
        </FormField>
      </ProfileSection>
    </form>
  );
}

/**
 * The live BMI from what's typed right now. It's its own component so typing in the boxes
 * re-renders only this hint, not the whole form.
 */
function BmiHint({ control }: { control: Control<HealthValues> }) {
  const t = useTranslations("MemberProfile.health");
  const f = useFormat();
  const [height, weight] = useWatch({ control, name: ["height", "weight"] });
  const bmi = bmiOf(height, weight);

  return (
    <div
      className="rounded-lg border border-dashed p-3 text-sm"
      // Screen readers announce the new value when it changes.
      aria-live="polite"
    >
      {bmi ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold tabular-nums">
            {t("bmi", { value: f.number(bmi.value) })}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              BMI_TONE[bmi.category],
            )}
          >
            {t(`bmiCategories.${bmi.category}`)}
          </span>
          <span className="basis-full text-xs text-muted-foreground">{t("bmiHint")}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">{t("bmiEmpty")}</span>
      )}
    </div>
  );
}
