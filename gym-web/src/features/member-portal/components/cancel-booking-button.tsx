"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  CANCELLATION_DEADLINE_HOURS,
  cancelDeadline,
} from "@/features/member-portal/booking-rules";
import { useCancelMyBooking } from "@/features/member-portal/queries";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-now";
import { toastError } from "@/lib/notify";

type CancelBookingButtonProps = {
  bookingId: number;
  /** The class name shown in the confirmation, e.g. "HIIT Circuit". */
  classTitle: string;
  startDate: string;
};

/**
 * "Cancel" for one of the member's bookings, with a confirmation and the cancellation deadline:
 * before the deadline it shows "Free cancellation until 17:00"; after it, the button is disabled
 * and explains why (the API refuses late cancellations anyway).
 */
export function CancelBookingButton({
  bookingId,
  classTitle,
  startDate,
}: CancelBookingButtonProps) {
  const t = useTranslations("MemberPortal.bookings");
  const f = useFormat();
  const now = useNow();
  const cancel = useCancelMyBooking();
  const [open, setOpen] = useState(false);

  const deadline = cancelDeadline({ sessionStartDate: startDate });
  const canCancel = now !== null && now < deadline;

  const onConfirm = async () => {
    try {
      await cancel.mutateAsync(bookingId);
      toast.success(t("cancelledToast"), { description: t("cancelledToastBody") });
    } catch (error) {
      toastError(t("cancelError"), error);
    } finally {
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 text-end">
      <Button
        size="sm"
        variant="outline"
        disabled={!canCancel || cancel.isPending}
        onClick={() => setOpen(true)}
      >
        <X /> {t("cancel")}
      </Button>
      <p className="max-w-56 text-xs text-muted-foreground">
        {canCancel
          ? t("cancelUntil", { time: f.classTime(deadline) })
          : t("cancelClosed", { hours: CANCELLATION_DEADLINE_HOURS })}
      </p>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("cancelTitle")}
        description={t("cancelBody", { name: classTitle, date: f.classTime(startDate) })}
        confirmLabel={t("cancelConfirm")}
        cancelLabel={t("keep")}
        destructive
        pending={cancel.isPending}
        onConfirm={() => void onConfirm()}
      />
    </div>
  );
}
