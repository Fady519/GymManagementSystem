"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { FormField, fieldProps } from "@/components/shared/form-field";
import { GENDERS, type AddressFields } from "@/lib/validation";
import { cn } from "@/lib/utils";

/**
 * Form pieces shared by the trainer and member forms. They read the form from
 * react-hook-form's context (the parent wraps its <form> in <FormProvider>), so they
 * don't need the whole form passed down as props.
 */

/** Two big "Male / Female" buttons (real radio inputs underneath, so the keyboard works). */
export function GenderField() {
  const t = useTranslations("Shared.gender");
  const tGender = useTranslations("Enums.Gender");
  const {
    register,
    formState: { errors },
  } = useFormContext<{ gender: (typeof GENDERS)[number] }>();
  const error = errors.gender?.message;

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">{t("legend")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {GENDERS.map((gender) => (
          <label
            key={gender}
            className={cn(
              "flex h-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors",
              "hover:bg-muted has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary",
              "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              error && "border-destructive",
            )}
          >
            <input
              type="radio"
              value={gender}
              className="sr-only"
              aria-describedby={error ? "gender-error" : undefined}
              {...register("gender")}
            />
            {/* The API value stays "Male"/"Female"; only what the user reads is translated. */}
            {tGender(gender)}
          </label>
        ))}
      </div>
      {error && (
        <p id="gender-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Building number, street and city. Optional: leave all three empty to skip. */
export function AddressFieldset({ showHeading = true }: { showHeading?: boolean }) {
  const t = useTranslations("Shared.address");
  const tCommon = useTranslations("Common");
  const {
    register,
    formState: { errors },
  } = useFormContext<{ address: AddressFields }>();
  const e = errors.address;

  return (
    <fieldset className="grid gap-4">
      {showHeading && (
        <legend className="mb-1">
          <span className="text-sm font-semibold">{t("legend")}</span>
          <span className="ms-2 text-xs text-muted-foreground">{tCommon("optional")}</span>
        </legend>
      )}
      <div className="grid grid-cols-[7rem_1fr] gap-4">
        <FormField id="address-building" label={t("building")} error={e?.buildingNumber?.message}>
          <Input
            {...fieldProps("address-building", e?.buildingNumber?.message)}
            inputMode="numeric"
            dir="ltr"
            placeholder={t("buildingPlaceholder")}
            maxLength={4}
            {...register("address.buildingNumber")}
          />
        </FormField>
        <FormField id="address-street" label={t("street")} error={e?.street?.message}>
          <Input
            {...fieldProps("address-street", e?.street?.message)}
            autoComplete="address-line1"
            dir="auto"
            placeholder={t("streetPlaceholder")}
            maxLength={50}
            {...register("address.street")}
          />
        </FormField>
      </div>
      <FormField id="address-city" label={t("city")} error={e?.city?.message}>
        <Input
          {...fieldProps("address-city", e?.city?.message)}
          autoComplete="address-level2"
          dir="auto"
          placeholder={t("cityPlaceholder")}
          maxLength={30}
          {...register("address.city")}
        />
      </FormField>
    </fieldset>
  );
}
