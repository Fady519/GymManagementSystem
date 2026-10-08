"use client";

import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, ExternalLink, Link2, MapPin, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import { useFormat } from "@/hooks/use-format";
import { Link } from "@/i18n/navigation";
import { applyServerErrors } from "@/lib/form-errors";
import { useGymSettings, useUpdateGymSettings } from "@/features/settings/queries";
import {
  ADDRESS_MAX,
  GYM_NAME_MAX,
  gymSettingsSchema,
  MAP_URL_MAX,
  SOCIAL_URL_MAX,
  toFormValues,
  toRequest,
  type GymSettingsValues,
} from "@/features/settings/schemas";
import type { GymSettingsResponse } from "@/types";

const FIELDS = [
  "gymName",
  "phone",
  "whatsApp",
  "email",
  "address",
  "mapUrl",
  "facebookUrl",
  "instagramUrl",
  "weekdayOpensAt",
  "weekdayClosesAt",
  "fridayOpensAt",
  "fridayClosesAt",
] as const;

/** Admin page: edit the details the public website shows (GET/PUT /api/settings/gym). */
export function GymSettingsAdmin() {
  const t = useTranslations("GymSettings");
  const f = useFormat();
  const settings = useGymSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          <>
            <p>{t("description")}</p>
            {settings.data && (
              <p className="text-xs">
                {settings.data.updatedAt
                  ? t("lastUpdated", { date: f.dateTime(settings.data.updatedAt) })
                  : t("neverUpdated")}
              </p>
            )}
          </>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/" target="_blank">
              {t("viewWebsite")} <ExternalLink />
            </Link>
          </Button>
        }
      />

      {settings.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : settings.isError ? (
        <QueryError
          title={t("loadError")}
          error={settings.error}
          onRetry={settings.refetch}
          retrying={settings.isFetching}
        />
      ) : (
        // A new key after each save resets the form to the saved values (and clears "unsaved changes").
        <GymSettingsForm key={settings.data.updatedAt ?? "default"} settings={settings.data} />
      )}
    </div>
  );
}

function GymSettingsForm({ settings }: { settings: GymSettingsResponse }) {
  const t = useTranslations("GymSettings");
  const tErrors = useTranslations("GymSettings.errors");
  const tCommon = useTranslations("Common");
  const save = useUpdateGymSettings();
  const schema = useMemo(() => gymSettingsSchema(tErrors), [tErrors]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<GymSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(settings),
  });
  const fridayOpen = useWatch({ control, name: "fridayOpen" });

  const onSubmit = async (values: GymSettingsValues) => {
    try {
      const { live } = await save.mutateAsync(toRequest(values));
      toast.success(t("saved"), { description: live ? t("savedLive") : t("savedSoon") });
    } catch (error) {
      applyServerErrors(error, setError, FIELDS);
    }
  };

  /** Label + input for a text field, with its error and help text wired up. */
  const text = (
    name: (typeof FIELDS)[number],
    options: {
      maxLength?: number;
      type?: string;
      dir?: "ltr" | "rtl" | "auto";
      hint?: string;
      placeholder?: string;
    } = {},
  ) => {
    const id = `gym-${name}`;
    const error = errors[name]?.message;
    return (
      <FormField
        id={id} // Every text field has its label under GymSettings.fields.<name>.
        label={t(`fields.${name}` as "fields.gymName")}
        error={error}
        description={options.hint}
      >
        <Input
          {...fieldProps(id, error, Boolean(options.hint))}
          type={options.type ?? "text"}
          dir={options.dir}
          maxLength={options.maxLength}
          placeholder={options.placeholder}
          {...register(name)}
        />
      </FormField>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 pb-24">
      <FormError message={errors.root?.server?.message} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard icon={<Store />} title={t("details")} description={t("detailsHint")}>
          {text("gymName", { maxLength: GYM_NAME_MAX })}
          <div className="grid gap-5 sm:grid-cols-2">
            {text("phone", {
              type: "tel",
              dir: "ltr",
              maxLength: 20,
              placeholder: "+20 100 555 0199",
            })}
            {text("whatsApp", {
              type: "tel",
              dir: "ltr",
              maxLength: 20,
              hint: t("fields.whatsAppHint"),
            })}
          </div>
          {text("email", { type: "email", dir: "ltr", maxLength: 100 })}
        </SettingsCard>

        <SettingsCard icon={<MapPin />} title={t("location")} description={t("locationHint")}>
          {/* One address in any language: dir="auto" follows the text the admin types. */}
          {text("address", { dir: "auto", maxLength: ADDRESS_MAX })}
          {text("mapUrl", {
            type: "url",
            dir: "ltr",
            maxLength: MAP_URL_MAX,
            hint: t("fields.mapUrlHint"),
          })}
        </SettingsCard>

        <SettingsCard icon={<Clock />} title={t("hours")} description={t("hoursHint")}>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium">{t("fields.weekdays")}</legend>
            <div className="grid grid-cols-2 gap-4">
              <TimeField
                id="gym-weekdayOpensAt"
                label={t("fields.opens")}
                error={errors.weekdayOpensAt?.message}
                {...register("weekdayOpensAt")}
              />
              <TimeField
                id="gym-weekdayClosesAt"
                label={t("fields.closes")}
                error={errors.weekdayClosesAt?.message}
                {...register("weekdayClosesAt")}
              />
            </div>
          </fieldset>

          <div className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{t("fields.friday")}</span>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="gym-fridayOpen"
                  className="text-sm font-normal text-muted-foreground"
                >
                  {fridayOpen ? t("fields.fridayOpen") : t("fields.fridayClosed")}
                </Label>
                <Controller
                  control={control}
                  name="fridayOpen"
                  render={({ field }) => (
                    <Switch
                      id="gym-fridayOpen"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
            {fridayOpen && (
              <div className="grid grid-cols-2 gap-4">
                <TimeField
                  id="gym-fridayOpensAt"
                  label={t("fields.opens")}
                  error={errors.fridayOpensAt?.message}
                  {...register("fridayOpensAt")}
                />
                <TimeField
                  id="gym-fridayClosesAt"
                  label={t("fields.closes")}
                  error={errors.fridayClosesAt?.message}
                  {...register("fridayClosesAt")}
                />
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard icon={<Link2 />} title={t("social")} description={t("socialHint")}>
          {text("facebookUrl", {
            type: "url",
            dir: "ltr",
            maxLength: SOCIAL_URL_MAX,
            placeholder: "https://facebook.com/…",
          })}
          {text("instagramUrl", {
            type: "url",
            dir: "ltr",
            maxLength: SOCIAL_URL_MAX,
            placeholder: "https://instagram.com/…",
          })}
        </SettingsCard>
      </div>

      {/* Sticky save bar: always reachable on long forms, and it says when something is unsaved. */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur">
        {isDirty && <p className="me-auto text-sm text-muted-foreground">{t("unsaved")}</p>}
        <Button
          type="button"
          variant="ghost"
          disabled={!isDirty || save.isPending}
          onClick={() => reset()}
        >
          {t("discard")}
        </Button>
        <Button type="submit" disabled={!isDirty || save.isPending}>
          {save.isPending ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-primary">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}

/** A 24-hour time picker ("HH:mm") with its label and error. */
function TimeField({
  id,
  label,
  error,
  ...input
}: { id: string; label: string; error?: string } & React.ComponentProps<"input">) {
  return (
    <FormField id={id} label={label} error={error}>
      <Input {...fieldProps(id, error)} type="time" step={60} dir="ltr" {...input} />
    </FormField>
  );
}
