"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { NOTE_MAX } from "@/features/members/schemas";
import { BLOOD_TYPES, type HealthFields } from "@/lib/validation";

/** Height, weight, blood type and a note. Reads the form from react-hook-form's context. */
export function HealthFieldset() {
  const t = useTranslations("Members.health");
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<{ healthRecord: HealthFields }>();
  const e = errors.healthRecord;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField id="health-height" label={t("height")} error={e?.height?.message}>
          <Input
            {...fieldProps("health-height", e?.height?.message)}
            inputMode="decimal"
            placeholder="175"
            maxLength={6}
            {...register("healthRecord.height")}
          />
        </FormField>
        <FormField id="health-weight" label={t("weight")} error={e?.weight?.message}>
          <Input
            {...fieldProps("health-weight", e?.weight?.message)}
            inputMode="decimal"
            placeholder="72.5"
            maxLength={6}
            {...register("healthRecord.weight")}
          />
        </FormField>
        <FormField id="health-blood" label={t("bloodType")} error={e?.bloodType?.message}>
          <Controller
            control={control}
            name="healthRecord.bloodType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  {...fieldProps("health-blood", e?.bloodType?.message)}
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
      <FormField
        id="health-note"
        label={t("note")}
        error={e?.note?.message}
        description={t("noteHint")}
      >
        <Textarea
          {...fieldProps("health-note", e?.note?.message, true)}
          placeholder={t("notePlaceholder")}
          maxLength={NOTE_MAX}
          rows={3}
          dir="auto"
          {...register("healthRecord.note")}
        />
      </FormField>
    </div>
  );
}
