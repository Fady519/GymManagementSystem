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
import { useCreateMember, useUploadMemberPhoto } from "@/features/members/queries";
import { createMemberSchema, type CreateMemberValues } from "@/features/members/schemas";
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

type Step = {
  title: string;
  description: string;
  icon: LucideIcon;
  optional: boolean;
  /** The fields checked before moving to the next step. */
  fields: Path<CreateMemberValues>[];
};

const STEPS: Step[] = [
  {
    title: "Personal details",
    description: "Who is joining? These are required.",
    icon: UserRound,
    optional: false,
    fields: ["name", "email", "phone", "dateOfBirth", "gender"],
  },
  {
    title: "Address",
    description: "Where they live. Leave it empty to skip.",
    icon: MapPin,
    optional: true,
    fields: ["address.buildingNumber", "address.street", "address.city"],
  },
  {
    title: "Health",
    description: "Helps trainers keep them safe. Leave it empty to skip.",
    icon: HeartPulse,
    optional: true,
    fields: [
      "healthRecord.height",
      "healthRecord.weight",
      "healthRecord.bloodType",
      "healthRecord.note",
    ],
  },
  {
    title: "Photo",
    description: "Optional. You can add or change it later.",
    icon: UserPlus,
    optional: true,
    fields: [],
  },
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
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = index <= reached && !active;
        return (
          <li key={step.title}>
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
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium sm:text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.title}
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
  const values = useWatch<CreateMemberValues>();
  const name = values.name?.trim() || "New member";
  const age =
    values.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth)
      ? ageOn(new Date(), values.dateOfBirth)
      : null;
  const address =
    values.address && !isAddressEmpty({ ...EMPTY_ADDRESS, ...values.address })
      ? [values.address.buildingNumber, values.address.street, values.address.city]
          .filter(Boolean)
          .join(", ")
      : null;
  const health =
    values.healthRecord && !isHealthEmpty({ ...EMPTY_HEALTH, ...values.healthRecord })
      ? [
          values.healthRecord.height && `${values.healthRecord.height} cm`,
          values.healthRecord.weight && `${values.healthRecord.weight} kg`,
          values.healthRecord.bloodType,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  const rows: [string, string | null][] = [
    ["Email", values.email?.trim() || null],
    ["Mobile", values.phone?.trim() || null],
    ["Age", age !== null && age >= 0 && age < 120 ? `${age} years` : null],
    ["Gender", values.gender ?? null],
    ["Address", address],
    ["Health", health],
  ];

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader className="items-center text-center">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data: preview
          <img src={photo.preview} alt="" className="mx-auto size-20 rounded-full object-cover" />
        ) : (
          <MemberAvatar name={name} photoUrl={null} className="mx-auto size-20 text-xl" />
        )}
        <CardTitle className="mt-2 break-words">{name}</CardTitle>
        <CardDescription>Member profile preview</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={cn("text-end break-all", !value && "text-muted-foreground/60")}>
                {value ?? "—"}
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
  const router = useRouter();
  const create = useCreateMember();
  const upload = useUploadMemberPhoto();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);

  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
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
        toastError("Member added, but the photo didn't upload", error);
      }
    }

    toast.success(`${memberName} is now a member`, {
      description: "Their profile is ready. You can give them an online account from there.",
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
        title="Add a member"
        description="Takes about a minute. Only the personal details are required."
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/members">
              <ArrowLeft /> Back to members
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
                <CardTitle className="text-lg">{current.title}</CardTitle>
                <CardDescription>{current.description}</CardDescription>
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
                    <FormField id="member-name" label="Full name" error={errors.name?.message}>
                      <Input
                        {...fieldProps("member-name", errors.name?.message)}
                        placeholder="e.g. Mariam Adel"
                        maxLength={50}
                        autoFocus
                        {...register("name")}
                      />
                    </FormField>
                    <FormField
                      id="member-email"
                      label="Email"
                      error={errors.email?.message}
                      description="Used for their online account and receipts."
                    >
                      <Input
                        {...fieldProps("member-email", errors.email?.message, true)}
                        type="email"
                        placeholder="name@example.com"
                        maxLength={100}
                        {...register("email")}
                      />
                    </FormField>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        id="member-phone"
                        label="Mobile number"
                        error={errors.phone?.message}
                      >
                        <Input
                          {...fieldProps("member-phone", errors.phone?.message)}
                          type="tel"
                          inputMode="numeric"
                          placeholder="01012345678"
                          maxLength={11}
                          {...register("phone")}
                        />
                      </FormField>
                      <FormField
                        id="member-dob"
                        label="Date of birth"
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
                    <ArrowLeft /> Back
                  </Button>
                  {step < LAST ? (
                    <Button type="submit">
                      {current.optional && sectionEmpty ? "Skip for now" : "Continue"}
                      <ArrowRight />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
                      {busy ? "Adding member…" : "Add member"}
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
