"use client";

import { useState } from "react";
import { FormProvider, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HeartPulse,
  Loader2,
  MapPin,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { AddressFieldset, GenderField } from "@/components/shared/person-fields";
import { HealthFieldset } from "@/features/members/components/health-fieldset";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { PhotoPicker, type PickedPhoto } from "@/features/members/components/photo-picker";
import { isolate } from "@/lib/bidi";
import { useCreateMember, useUploadMemberPhoto } from "@/features/members/queries";
import { createMemberSchema, type CreateMemberValues } from "@/features/members/schemas";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { applyServerErrors } from "@/lib/form-errors";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  EMPTY_ADDRESS,
  EMPTY_HEALTH,
  ageOn,
  isAddressEmpty,
  isHealthEmpty,
  toAddressDto,
  toHealthDto,
} from "@/lib/validation";
import { Link, useRouter } from "@/i18n/navigation";

type StepKey = "personal" | "address" | "health" | "photo";

type Step = {
  /** Its title and description are under Members.wizard.steps.<key>. */
  key: StepKey;
  icon: LucideIcon;
  optional: boolean;
  /** The fields checked before moving to the next step. */
  fields: Path<CreateMemberValues>[];
};

const STEPS: Step[] = [
  {
    key: "personal",
    icon: UserRound,
    optional: false,
    fields: ["name", "email", "phone", "dateOfBirth", "gender"],
  },
  {
    key: "address",
    icon: MapPin,
    optional: true,
    fields: ["address.buildingNumber", "address.street", "address.city"],
  },
  {
    key: "health",
    icon: HeartPulse,
    optional: true,
    fields: [
      "healthRecord.height",
      "healthRecord.weight",
      "healthRecord.bloodType",
      "healthRecord.note",
    ],
  },
  { key: "photo", icon: UserPlus, optional: true, fields: [] },
];

const ALL_FIELDS = STEPS.flatMap((step) => step.fields);
const LAST = STEPS.length - 1;

const CODE_TO_FIELD = {
  "Member.EmailTaken": "email",
  "Member.PhoneTaken": "phone",
} as const;

/** The numbered steps at the top. Steps already visited can be clicked to go back. */
function Stepper({
  current,
  reached,
  onSelect,
}: {
  current: number;
  reached: number;
  onSelect: (step: number) => void;
}) {
  const t = useTranslations("Members.wizard.steps");
  const f = useFormat();
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = index <= reached && !active;
        return (
          <li key={step.key}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
              className="group flex w-full flex-col items-center gap-2 text-center disabled:cursor-default sm:flex-row sm:text-start"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-primary/10 text-primary",
                  !active && !done && "border-border text-muted-foreground",
                  clickable && "group-hover:border-primary",
                )}
              >
                {done ? <Check className="size-4" /> : f.number(index + 1)}
              </span>
              <span
                className={cn(
                  "text-xs font-medium sm:text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(`${step.key}.title`)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** A live preview of what's been typed so far, so reception can double-check before saving. */
function SummaryCard({ photo }: { photo: PickedPhoto | null }) {
  const t = useTranslations("Members.wizard.summary");
  const tForm = useTranslations("Members.form");
  const tEnums = useTranslations("Enums");
  const now = useNow();
  const values = useWatch<CreateMemberValues>();
  const typedName = values.name?.trim();
  const age =
    now && values.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth)
      ? ageOn(now, values.dateOfBirth)
      : null;
  // Typed values are shown as typed (never translated); only the units around them are.
  const address =
    values.address && !isAddressEmpty({ ...EMPTY_ADDRESS, ...values.address })
      ? [values.address.buildingNumber, values.address.street, values.address.city]
          .filter(Boolean)
          .join(" · ")
      : null;
  const health =
    values.healthRecord && !isHealthEmpty({ ...EMPTY_HEALTH, ...values.healthRecord })
      ? [
          values.healthRecord.height && t("heightValue", { value: values.healthRecord.height }),
          values.healthRecord.weight && t("weightValue", { value: values.healthRecord.weight }),
          values.healthRecord.bloodType && isolate(values.healthRecord.bloodType),
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  const rows: { label: string; value: string | null; dir?: "ltr" | "auto" }[] = [
    { label: tForm("email"), value: values.email?.trim() || null, dir: "ltr" },
    { label: t("mobile"), value: values.phone?.trim() || null, dir: "ltr" },
    {
      label: t("age"),
      value: age !== null && age >= 0 && age < 120 ? t("ageValue", { count: age }) : null,
    },
    { label: tForm("gender"), value: values.gender ? tEnums(`Gender.${values.gender}`) : null },
    { label: t("address"), value: address, dir: "auto" },
    { label: t("health"), value: health },
  ];

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader className="items-center text-center">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data: preview
          <img src={photo.preview} alt="" className="mx-auto size-20 rounded-full object-cover" />
        ) : (
          <MemberAvatar
            name={typedName || t("newMember")}
            photoUrl={null}
            className="mx-auto size-20 text-xl"
          />
        )}
        <CardTitle className="mt-2 break-words">
          {typedName ? <bdi>{typedName}</bdi> : t("newMember")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={cn("text-end break-all", !row.value && "text-muted-foreground/60")}>
                {row.value ? <bdi dir={row.dir}>{row.value}</bdi> : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Adding a member at reception, in four short steps. One form holds every step's fields;
 * "Next" only checks the fields of the current step. The member is created with one request
 * at the end, then the photo (if any) is uploaded with a second one.
 */
export function MemberCreateWizard() {
  const t = useTranslations("Members.wizard");
  const tForm = useTranslations("Members.form");
  const tErrors = useTranslations("Members.errors");
  const router = useRouter();
  const create = useCreateMember();
  const upload = useUploadMemberPhoto();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);

  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema(tErrors)),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: EMPTY_ADDRESS,
      healthRecord: EMPTY_HEALTH,
    },
  });
  const {
    register,
    handleSubmit,
    trigger,
    setError,
    getFieldState,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form;

  const [address, healthRecord] = useWatch({ control, name: ["address", "healthRecord"] });
  const sectionEmpty =
    step === 1 ? isAddressEmpty(address) : step === 2 ? isHealthEmpty(healthRecord) : false;

  const goTo = (next: number) => {
    setStep(next);
    setReached((r) => Math.max(r, next));
  };

  const next = async () => {
    const ok = await trigger(STEPS[step].fields, { shouldFocus: true });
    if (ok) goTo(step + 1);
  };

  const onSubmit = async (values: CreateMemberValues) => {
    let memberId: number;
    let memberName: string;
    try {
      const member = await create.mutateAsync({
        name: values.name,
        email: values.email,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        address: toAddressDto(values.address),
        healthRecord: toHealthDto(values.healthRecord),
      });
      memberId = member.id;
      memberName = member.name;
    } catch (error) {
      applyServerErrors(error, setError, ALL_FIELDS, { codes: CODE_TO_FIELD });
      // Jump back to the first step that now has an error (e.g. the email is already taken).
      const stepWithError = STEPS.findIndex((s) => s.fields.some((f) => getFieldState(f).invalid));
      if (stepWithError >= 0) setStep(stepWithError);
      return;
    }

    if (photo) {
      try {
        await upload.mutateAsync({ id: memberId, file: photo.file });
      } catch (error) {
        // The member exists; only the photo failed. Say so clearly and carry on to the profile.
        toastError(t("photoFailed"), error);
      }
    }

    toast.success(t("created", { name: isolate(memberName) }), {
      description: t("createdBody"),
    });
    router.push(`/dashboard/members/${memberId}`);
  };

  // Submitted with a mistake on an earlier step (reachable by clicking the stepper): show that step.
  const onInvalid = () => {
    const stepWithError = STEPS.findIndex((s) => s.fields.some((f) => getFieldState(f).invalid));
    if (stepWithError >= 0) setStep(stepWithError);
  };

  const busy = isSubmitting || isSubmitSuccessful;
  const current = STEPS[step];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/members">
              <ArrowLeft className="rtl:rotate-180" /> {t("backToList")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader className="gap-6 border-b">
            <Stepper current={step} reached={reached} onSelect={setStep} />
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <current.icon className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg">{t(`steps.${current.key}.title`)}</CardTitle>
                <CardDescription>{t(`steps.${current.key}.description`)}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <FormProvider {...form}>
              <form
                // Enter on a middle step means "Next", not "save the member".
                onSubmit={
                  step === LAST
                    ? handleSubmit(onSubmit, onInvalid)
                    : (event) => {
                        event.preventDefault();
                        void next();
                      }
                }
                noValidate
                className="grid gap-6"
              >
                <FormError message={errors.root?.server?.message} />

                {step === 0 && (
                  <div className="grid gap-5">
                    <FormField id="member-name" label={tForm("name")} error={errors.name?.message}>
                      <Input
                        {...fieldProps("member-name", errors.name?.message)}
                        placeholder={tForm("namePlaceholder")}
                        maxLength={50}
                        dir="auto"
                        autoFocus
                        {...register("name")}
                      />
                    </FormField>
                    <FormField
                      id="member-email"
                      label={tForm("email")}
                      error={errors.email?.message}
                      description={tForm("emailHint")}
                    >
                      <Input
                        {...fieldProps("member-email", errors.email?.message, true)}
                        type="email"
                        dir="ltr"
                        placeholder="name@example.com"
                        maxLength={100}
                        {...register("email")}
                      />
                    </FormField>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        id="member-phone"
                        label={tForm("phone")}
                        error={errors.phone?.message}
                      >
                        <Input
                          {...fieldProps("member-phone", errors.phone?.message)}
                          type="tel"
                          inputMode="numeric"
                          dir="ltr"
                          placeholder="01012345678"
                          maxLength={11}
                          {...register("phone")}
                        />
                      </FormField>
                      <FormField
                        id="member-dob"
                        label={tForm("dateOfBirth")}
                        error={errors.dateOfBirth?.message}
                      >
                        <Input
                          {...fieldProps("member-dob", errors.dateOfBirth?.message)}
                          type="date"
                          {...register("dateOfBirth")}
                        />
                      </FormField>
                    </div>
                    <GenderField />
                  </div>
                )}

                {step === 1 && <AddressFieldset showHeading={false} />}
                {step === 2 && <HealthFieldset />}
                {step === 3 && <PhotoPicker value={photo} onChange={setPhoto} />}

                <div className="flex items-center justify-between gap-3 border-t pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 0 || busy}
                  >
                    <ArrowLeft className="rtl:rotate-180" /> {t("back")}
                  </Button>
                  {step < LAST ? (
                    <Button type="submit">
                      {current.optional && sectionEmpty ? t("skip") : t("continue")}
                      <ArrowRight className="rtl:rotate-180" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
                      {busy ? t("submitting") : t("submit")}
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        <FormProvider {...form}>
          <SummaryCard photo={photo} />
        </FormProvider>
      </div>
    </div>
  );
}
