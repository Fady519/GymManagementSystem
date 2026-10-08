"use client";

import { Controller, useFormContext } from "react-hook-form";
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
import { BLOOD_TYPES, type HealthFields } from "@/lib/validation";

/** Height, weight, blood type and a note. Reads the form from react-hook-form's context. */
export function HealthFieldset() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<{ healthRecord: HealthFields }>();
  const e = errors.healthRecord;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField id="health-height" label="Height (cm)" error={e?.height?.message}>
          <Input
            {...fieldProps("health-height", e?.height?.message)}
            inputMode="decimal"
            placeholder="175"
            maxLength={6}
            {...register("healthRecord.height")}
          />
        </FormField>
        <FormField id="health-weight" label="Weight (kg)" error={e?.weight?.message}>
          <Input
            {...fieldProps("health-weight", e?.weight?.message)}
            inputMode="decimal"
            placeholder="72.5"
            maxLength={6}
            {...register("healthRecord.weight")}
          />
        </FormField>
        <FormField id="health-blood" label="Blood type" error={e?.bloodType?.message}>
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
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
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
        label="Notes for trainers"
        error={e?.note?.message}
        description="Injuries, conditions or anything a coach should know. Optional."
      >
        <Textarea
          {...fieldProps("health-note", e?.note?.message, true)}
          placeholder="e.g. Old knee injury: avoid deep squats."
          maxLength={500}
          rows={3}
          {...register("healthRecord.note")}
        />
      </FormField>
    </div>
  );
}
