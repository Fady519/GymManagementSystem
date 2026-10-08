"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** Text of the button that closes the dialog (default: "Cancel" in the site language). */
  cancelLabel?: string;
  /** Red confirm button, for actions that remove something. */
  destructive?: boolean;
  /** True while the request runs: the buttons are disabled and the dialog can't be closed. */
  pending: boolean;
  onConfirm: () => void;
};

/**
 * "Are you sure?" before an action that can't be undone from the screen (delete, deactivate...).
 * The parent runs the request in onConfirm. While it runs, the dialog can't be closed. When it
 * finishes, the parent closes the dialog: on success, and also on failure after showing the
 * error toast, because errors here (e.g. "the plan still has active memberships") are not
 * fixed by clicking the same button again.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations("Common");
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel ?? t("cancel")}</AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog doesn't close before the request finishes. */}
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
