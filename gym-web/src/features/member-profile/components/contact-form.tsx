"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { ProfileSection, SaveBar } from "@/features/member-profile/components/profile-section";
import { useUpdateMyProfile } from "@/features/member-profile/queries";
import {
  contactSchema,
  toContactValues,
  type ContactValues,
} from "@/features/member-profile/schemas";
import { showFormError } from "@/features/member-profile/server-errors";
import { toAddressDto } from "@/lib/validation";
import type { MemberResponse } from "@/types";

// The API reports validation errors with these keys, so they can land under the right box.
const FIELDS = ["phone", "address.buildingNumber", "address.street", "address.city"] as const;

/** Phone + optional address: the only personal data a member may change themselves (PUT /api/me). */
export function ContactForm({ profile }: { profile: MemberResponse }) {
  const t = useTranslations("MemberProfile.contact");
  const tErrors = useTranslations("MemberProfile.errors");
  const save = useUpdateMyProfile();
  const schema = useMemo(() => contactSchema(tErrors), [tErrors]);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    defaultValues: toContactValues(profile),
  });

  const onSubmit = async (values: ContactValues) => {
    try {
      const member = await save.mutateAsync({
        phone: values.phone,
        address: toAddressDto(values.address),
      });
      // Start again from what the API saved, so the form is "clean" and shows the stored values.
      reset(toContactValues(member));
      toast.success(t("saved"));
    } catch (error) {
      showFormError(error, setError, FIELDS, tErrors, { "Member.PhoneTaken": "phone" });
    }
  };

  const a = errors.address;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <ProfileSection
        icon={<PhoneCall />}
        title={t("title")}
        description={t("hint")}
        footer={<SaveBar dirty={isDirty} pending={save.isPending} onDiscard={() => reset()} />}
      >
        <FormError message={errors.root?.server?.message} />

        <FormField
          id="me-phone"
          label={t("phone")}
          error={errors.phone?.message}
          description={t("phoneHint")}
          className="sm:max-w-xs"
        >
          <Input
            {...fieldProps("me-phone", errors.phone?.message, true)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            maxLength={11}
            placeholder="01012345678"
            {...register("phone")}
          />
        </FormField>

        {/* The divider sits on a wrapper: a fieldset's own border would be cut by its legend. */}
        <div className="border-t pt-5">
          <fieldset className="grid gap-4" aria-describedby="me-address-hint">
            <legend className="text-sm font-medium">{t("address")}</legend>
            <p id="me-address-hint" className="text-sm text-muted-foreground">
              {t("addressHint")}
            </p>
            <div className="grid items-start gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
              <FormField
                id="me-building"
                label={t("buildingNumber")}
                error={a?.buildingNumber?.message}
              >
                <Input
                  {...fieldProps("me-building", a?.buildingNumber?.message)}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="12"
                  {...register("address.buildingNumber")}
                />
              </FormField>
              <FormField id="me-street" label={t("street")} error={a?.street?.message}>
                <Input
                  {...fieldProps("me-street", a?.street?.message)}
                  autoComplete="address-line1"
                  maxLength={50}
                  {...register("address.street")}
                />
              </FormField>
              <FormField id="me-city" label={t("city")} error={a?.city?.message}>
                <Input
                  {...fieldProps("me-city", a?.city?.message)}
                  autoComplete="address-level2"
                  maxLength={30}
                  {...register("address.city")}
                />
              </FormField>
            </div>
          </fieldset>
        </div>
      </ProfileSection>
    </form>
  );
}
