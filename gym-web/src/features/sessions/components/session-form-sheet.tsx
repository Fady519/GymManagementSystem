"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
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
import { FormSheet } from "@/components/shared/form-sheet";
import { useCategories } from "@/features/categories/queries";
import { useSaveSession } from "@/features/sessions/queries";
import {
  DESCRIPTION_MAX,
  SESSION_RULES,
  formatMinutes,
  minutesBetween,
  sessionSchema,
  type SessionValues,
} from "@/features/sessions/schemas";
import { useTrainers } from "@/features/trainers/queries";
import { useFormat } from "@/hooks/use-format";
import { cairoToUtc, cairoToday, utcToCairoInputs } from "@/lib/cairo-time";
import { applyServerErrors } from "@/lib/form-errors";
import { isolate } from "@/lib/bidi";
import type { SessionResponse } from "@/types";

const FORM_ID = "session-form";
const FIELDS = [
  "categoryId",
  "trainerId",
  "description",
  "date",
  "startTime",
  "endTime",
  "capacity",
] as const;

const CODE_TO_FIELD = {
  "Session.TrainerBusy": "startTime",
  "Session.TrainerCategoryMismatch": "trainerId",
  "Session.TrainerNotFound": "trainerId",
  "Session.CategoryNotFound": "categoryId",
  "Session.CapacityBelowBookings": "capacity",
} as const;

/** Values to start a new class with, e.g. from a click on an empty calendar slot. */
export type SessionPreset = { date: string; startTime: string };

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function defaultsFor(session: SessionResponse | null, preset: SessionPreset | null): SessionValues {
  if (session) {
    const start = utcToCairoInputs(session.startDate);
    return {
      categoryId: String(session.categoryId),
      trainerId: String(session.trainerId),
      description: session.description,
      date: start.date,
      startTime: start.time,
      endTime: utcToCairoInputs(session.endDate).time,
      capacity: String(session.capacity),
    };
  }
  const startTime = preset?.startTime ?? "18:00";
  return {
    categoryId: "",
    trainerId: "",
    description: "",
    date: preset?.date ?? cairoToday(),
    startTime,
    endTime: addMinutes(startTime, 60),
    capacity: "15",
  };
}

type SessionFormProps = {
  session: SessionResponse | null;
  preset: SessionPreset | null;
  save: ReturnType<typeof useSaveSession>;
  onSaved: () => void;
};

function SessionForm({ session, preset, save, onSaved }: SessionFormProps) {
  const t = useTranslations("Sessions.form");
  const tErrors = useTranslations("Sessions.errors");
  const tValidation = useTranslations("Validation");
  const tLength = useTranslations("Sessions.length");
  const f = useFormat();
  // The rules with messages in the current language.
  const schema = useMemo(() => sessionSchema(tErrors, tValidation), [tErrors, tValidation]);
  const categories = useCategories();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<SessionValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(session, preset),
  });

  const [categoryId, startTime, endTime] = useWatch({
    control,
    name: ["categoryId", "startTime", "endTime"],
  });

  // Only coaches whose speciality is the chosen class type can teach it (the API checks it too).
  const trainers = useTrainers({
    search: "",
    categoryId: categoryId ? Number(categoryId) : null,
    page: 1,
    pageSize: 100,
  });

  // When the class type changes, a coach of the old type is no longer a valid choice.
  useEffect(() => {
    const chosen = getValues("trainerId");
    if (!chosen || !trainers.data || trainers.isPlaceholderData) return;
    if (!trainers.data.items.some((t) => String(t.id) === chosen)) setValue("trainerId", "");
  }, [trainers.data, trainers.isPlaceholderData, getValues, setValue]);

  const minutes = startTime && endTime ? minutesBetween(startTime, endTime) : 0;
  const durationHint =
    minutes > 0
      ? t("lengthHint", { length: formatMinutes(minutes, tLength) })
      : t("lengthRange", { min: SESSION_RULES.minMinutes, max: SESSION_RULES.maxMinutes / 60 });

  const onSubmit = async (values: SessionValues) => {
    try {
      const saved = await save.mutateAsync({
        id: session?.id ?? null,
        body: {
          categoryId: Number(values.categoryId),
          trainerId: Number(values.trainerId),
          description: values.description,
          capacity: Number(values.capacity),
          startDate: cairoToUtc(values.date, values.startTime),
          endDate: cairoToUtc(values.date, values.endTime),
        },
      });
      toast.success(session ? t("updated") : t("scheduled"), {
        description: t("savedDescription", {
          category: isolate(saved.categoryName),
          trainer: isolate(saved.trainerName),
          time: f.classTime(saved.startDate),
        }),
      });
      onSaved();
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, {
        codes: CODE_TO_FIELD,
        aliases: { startDate: "startTime", endDate: "endTime" },
      });
    }
  };

  const noTrainers = Boolean(categoryId) && trainers.data?.items.length === 0;

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormError message={errors.root?.server?.message} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="session-category" label={t("category")} error={errors.categoryId?.message}>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  {...fieldProps("session-category", errors.categoryId?.message)}
                  className="w-full"
                  onBlur={field.onBlur}
                  disabled={categories.isPending}
                >
                  <SelectValue
                    placeholder={categories.isPending ? t("loading") : t("categoryPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      <bdi>{category.name}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          id="session-trainer"
          label={t("trainer")}
          error={errors.trainerId?.message}
          description={noTrainers ? t("trainerNone") : undefined}
        >
          <Controller
            control={control}
            name="trainerId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  {...fieldProps("session-trainer", errors.trainerId?.message, noTrainers)}
                  className="w-full"
                  onBlur={field.onBlur}
                  disabled={!categoryId || trainers.isPending || noTrainers}
                >
                  <SelectValue
                    placeholder={!categoryId ? t("trainerPickType") : t("trainerPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {trainers.data?.items.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>
                      <bdi>{trainer.name}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <FormField
        id="session-description"
        label={t("description")}
        error={errors.description?.message}
        description={t("descriptionHint")}
      >
        <Textarea
          {...fieldProps("session-description", errors.description?.message, true)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={DESCRIPTION_MAX}
          rows={2}
          // Text side follows what is typed (Arabic or English); an empty box keeps the page side.
          className="[unicode-bidi:plaintext]"
          {...register("description")}
        />
      </FormField>

      <FormField id="session-date" label={t("date")} error={errors.date?.message}>
        <Input
          {...fieldProps("session-date", errors.date?.message)}
          type="date"
          dir="ltr"
          min={cairoToday()}
          {...register("date")}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-5">
        <FormField id="session-start" label={t("start")} error={errors.startTime?.message}>
          <Input
            {...fieldProps("session-start", errors.startTime?.message)}
            type="time"
            dir="ltr"
            step={300}
            {...register("startTime")}
          />
        </FormField>
        <FormField
          id="session-end"
          label={t("end")}
          error={errors.endTime?.message}
          description={durationHint}
        >
          <Input
            {...fieldProps("session-end", errors.endTime?.message, true)}
            type="time"
            dir="ltr"
            step={300}
            {...register("endTime")}
          />
        </FormField>
      </div>

      <p className="-mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" /> {t("cairoTime")}
      </p>

      <FormField
        id="session-capacity"
        label={t("capacity")}
        error={errors.capacity?.message}
        description={
          session && session.bookedCount > 0
            ? t("capacityBooked", { count: session.bookedCount })
            : t("capacityMax", { max: SESSION_RULES.maxCapacity })
        }
      >
        <Input
          {...fieldProps("session-capacity", errors.capacity?.message, true)}
          inputMode="numeric"
          dir="ltr"
          maxLength={2}
          className="sm:max-w-32"
          {...register("capacity")}
        />
      </FormField>
    </form>
  );
}

type SessionFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The class to edit, or null to schedule a new one. */
  session: SessionResponse | null;
  preset?: SessionPreset | null;
};

/** The side panel for scheduling or editing a class. */
export function SessionFormSheet({
  open,
  onOpenChange,
  session,
  preset = null,
}: SessionFormSheetProps) {
  const t = useTranslations("Sessions.form");
  const tCommon = useTranslations("Common");
  const save = useSaveSession();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={session ? t("titleEdit") : t("titleNew")}
      description={session ? t("descriptionEdit") : t("descriptionNew")}
      formId={FORM_ID}
      submitLabel={session ? tCommon("save") : t("submitNew")}
      submitting={save.isPending}
    >
      <SessionForm
        session={session}
        preset={preset}
        save={save}
        onSaved={() => onOpenChange(false)}
      />
    </FormSheet>
  );
}
