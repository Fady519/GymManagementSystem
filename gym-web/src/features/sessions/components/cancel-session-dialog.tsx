"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
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
import { cancelReasonSchema, type CancelReasonValues } from "@/features/sessions/schemas";
import { applyServerErrors } from "@/lib/form-errors";
import { formatClassTime } from "@/lib/format";
import type { SessionResponse } from "@/types";

/** One click fills the most common reasons; the admin can still edit the text. */
const QUICK_REASONS = [
  "The coach is unwell today.",
  "The studio is closed for maintenance.",
  "Not enough members booked this class.",
  "The gym is closed for a public holiday.",
];

function CancelForm({ session, onDone }: { session: SessionResponse; onDone: () => void }) {
  const cancel = useCancelSession();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CancelReasonValues>({
    resolver: zodResolver(cancelReasonSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async ({ reason }: CancelReasonValues) => {
    try {
      await cancel.mutateAsync({ id: session.id, reason });
      toast.success("Class cancelled", {
        description:
          session.bookedCount > 0
            ? `${session.bookedCount} booked ${session.bookedCount === 1 ? "member was" : "members were"} emailed the reason.`
            : "Nobody had booked it yet.",
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
        label="Reason"
        error={errors.reason?.message}
        description="Members read this in the email and on their bookings page."
      >
        <Textarea
          {...fieldProps("cancel-reason", errors.reason?.message, true)}
          rows={3}
          maxLength={200}
          autoFocus
          placeholder="e.g. The coach is unwell today."
          {...register("reason")}
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        {QUICK_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() => setValue("reason", reason, { shouldValidate: true })}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            {reason.replace(/\.$/, "")}
          </button>
        ))}
      </div>

      {session.bookedCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Mail className="mt-0.5 size-3.5 shrink-0" />
          All {session.bookedCount} bookings are cancelled and each member gets an email with this
          reason. This can&apos;t be undone.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={cancel.isPending}>
          Keep the class
        </Button>
        <Button type="submit" variant="destructive" disabled={cancel.isPending}>
          {cancel.isPending && <Loader2 className="animate-spin" />}
          Cancel class
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {session && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel this class?</DialogTitle>
              <DialogDescription>
                {session.categoryName} with {session.trainerName},{" "}
                {formatClassTime(session.startDate)}.
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
