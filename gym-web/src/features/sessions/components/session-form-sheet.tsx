"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
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
  SESSION_RULES,
  formatMinutes,
  minutesBetween,
  sessionSchema,
  type SessionValues,
} from "@/features/sessions/schemas";
import { useTrainers } from "@/features/trainers/queries";
import { cairoToUtc, cairoToday, utcToCairoInputs } from "@/lib/cairo-time";
import { formatClassTime } from "@/lib/format";
import { applyServerErrors } from "@/lib/form-errors";
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
    resolver: zodResolver(sessionSchema),
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
      ? `${formatMinutes(minutes)} class`
      : `${SESSION_RULES.minMinutes} min to ${SESSION_RULES.maxMinutes / 60} hours`;

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
      toast.success(session ? "Class updated" : "Class scheduled", {
        description: `${saved.categoryName} with ${saved.trainerName}, ${formatClassTime(saved.startDate)}.`,
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
        <FormField id="session-category" label="Class type" error={errors.categoryId?.message}>
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
                  <SelectValue placeholder={categories.isPending ? "Loading…" : "Choose a type"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          id="session-trainer"
          label="Coach"
          error={errors.trainerId?.message}
          description={noTrainers ? "No coach teaches this type yet." : undefined}
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
                    placeholder={!categoryId ? "Pick the type first" : "Choose a coach"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {trainers.data?.items.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>
                      {trainer.name}
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
        label="Title / description"
        error={errors.description?.message}
        description="Members see this on the schedule, e.g. “Morning HIIT: full-body burn”."
      >
        <Textarea
          {...fieldProps("session-description", errors.description?.message, true)}
          placeholder="e.g. Evening Yoga flow for all levels"
          maxLength={500}
          rows={2}
          {...register("description")}
        />
      </FormField>

      <FormField id="session-date" label="Day" error={errors.date?.message}>
        <Input
          {...fieldProps("session-date", errors.date?.message)}
          type="date"
          min={cairoToday()}
          {...register("date")}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-5">
        <FormField id="session-start" label="Starts" error={errors.startTime?.message}>
          <Input
            {...fieldProps("session-start", errors.startTime?.message)}
            type="time"
            step={300}
            {...register("startTime")}
          />
        </FormField>
        <FormField
          id="session-end"
          label="Ends"
          error={errors.endTime?.message}
          description={durationHint}
        >
          <Input
            {...fieldProps("session-end", errors.endTime?.message, true)}
            type="time"
            step={300}
            {...register("endTime")}
          />
        </FormField>
      </div>

      <p className="-mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" /> All times are Cairo time.
      </p>

      <FormField
        id="session-capacity"
        label="Spots"
        error={errors.capacity?.message}
        description={
          session && session.bookedCount > 0
            ? `${session.bookedCount} already booked, so at least ${session.bookedCount}.`
            : `Up to ${SESSION_RULES.maxCapacity} members per class.`
        }
      >
        <Input
          {...fieldProps("session-capacity", errors.capacity?.message, true)}
          inputMode="numeric"
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
  const save = useSaveSession();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={session ? "Edit class" : "Schedule a class"}
      description={
        session
          ? "Booked members keep their spot. If the time changes, let them know."
          : "Add a class to the timetable. It opens for booking as soon as you save."
      }
      formId={FORM_ID}
      submitLabel={session ? "Save changes" : "Schedule class"}
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
