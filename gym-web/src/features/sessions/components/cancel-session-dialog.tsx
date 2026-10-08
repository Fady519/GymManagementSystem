"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, fieldProps } from "@/components/shared/form-field";
import { useCancelSession } from "@/features/sessions/queries";
import {
  REASON_MAX,
  cancelReasonSchema,
  type CancelReasonValues,
} from "@/features/sessions/schemas";
import { useFormat } from "@/hooks/use-format";
import { applyServerErrors } from "@/lib/form-errors";
import type { SessionResponse } from "@/types";

/**
 * One click fills the most common reasons, in the admin's language; the admin can still edit
 * the text. The reason is saved as typed (it is the admin's own text, emailed to members).
 */
const QUICK_REASONS = ["coachUnwell", "maintenance", "lowBookings", "holiday"] as const;

/** For rich messages: <bdi>name</bdi> keeps a stored name's own direction inside a translated sentence. */
const bdi = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

function CancelForm({ session, onDone }: { session: SessionResponse; onDone: () => void }) {
  const t = useTranslations("Sessions.cancel");
  const tErrors = useTranslations("Sessions.errors");
  const schema = useMemo(() => cancelReasonSchema(tErrors), [tErrors]);
  const cancel = useCancelSession();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CancelReasonValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async ({ reason }: CancelReasonValues) => {
    try {
      await cancel.mutateAsync({ id: session.id, reason });
      toast.success(t("done"), {
        description:
          session.bookedCount > 0
            ? t("doneNotified", { count: session.bookedCount })
            : t("doneNobody"),
      });
      onDone();
    } catch (error) {
      applyServerErrors(error, setError, ["reason"]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <FormError message={errors.root?.server?.message} />

      <FormField
        id="cancel-reason"
        label={t("reason")}
        error={errors.reason?.message}
        description={t("reasonHint")}
      >
        <Textarea
          {...fieldProps("cancel-reason", errors.reason?.message, true)}
          rows={3}
          maxLength={REASON_MAX}
          autoFocus
          // Text side follows what is typed (Arabic or English); an empty box keeps the page side.
          className="[unicode-bidi:plaintext]"
          placeholder={t("reasonPlaceholder")}
          {...register("reason")}
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        {QUICK_REASONS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setValue("reason", t(`quick.${key}`), { shouldValidate: true })}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            {t(`quickLabel.${key}`)}
          </button>
        ))}
      </div>

      {session.bookedCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Mail className="mt-0.5 size-3.5 shrink-0" />
          {t("warning", { count: session.bookedCount })}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={cancel.isPending}>
          {t("keep")}
        </Button>
        <Button type="submit" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending && <Loader2 className="animate-spin" />}
          {t("confirm")}
        </Button>
      </DialogFooter>
    </form>
  );
}

type CancelSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionResponse | null;
};

/** Cancelling a class needs a reason: it is saved on the class and emailed to every booked member. */
export function CancelSessionDialog({ open, onOpenChange, session }: CancelSessionDialogProps) {
  const t = useTranslations("Sessions.cancel");
  const f = useFormat();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {session && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>
                {t.rich("description", {
                  category: session.categoryName,
                  trainer: session.trainerName,
                  time: f.classTime(session.startDate),
                  bdi,
                })}
              </DialogDescription>
            </DialogHeader>
            {/* Mounted only while open, so the reason starts empty every time. */}
            <CancelForm session={session} onDone={() => onOpenChange(false)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
