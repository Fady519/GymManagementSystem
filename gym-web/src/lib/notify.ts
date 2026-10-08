import { toast } from "sonner";
import { ApiError, apiErrorMessage } from "@/lib/api-error";
import { isolate, isolateLtr } from "@/lib/bidi";
import { plainTranslations } from "@/lib/plain-translations";

/**
 * Shows a failed request as an error toast: a short title saying what failed (the caller passes it
 * already translated), and the reason underneath in the visitor's language (e.g. "The plan can't be
 * deleted while it has active memberships."), worked out from the API's error code.
 */
export function toastError(title: string, error: unknown) {
  toast.error(title, { description: apiErrorMessage(error) });
}

/**
 * The result of sending an account invite (trainers and members). The API still creates the
 * login when the email fails, so that case is a warning with what to do next, not an error.
 * The name and email are typed by staff, so they are shown exactly as stored (isolated, so they
 * read correctly inside an Arabic sentence).
 */
export function toastInvite(name: string, email: string, inviteSent: boolean) {
  const t = plainTranslations()?.invite;
  const values = { name: isolate(name), email: isolateLtr(email) };

  if (inviteSent) {
    // The link lifetime comes from the API's settings (Email:InviteLinkDays), so we don't repeat the number here.
    toast.success(t ? t("sentTitle", values) : `Invite sent to ${name}`, {
      description: t ? t("sentBody", values) : `${email} got a link to choose a password.`,
    });
  } else {
    toast.warning(
      t ? t("failedTitle", values) : `${name}'s login is ready, but the email didn't go out`,
      {
        description: t ? t("failedBody") : "Use “Resend invite” in a few minutes.",
      },
    );
  }
}

/** True when the API says the person already chose their password (resending makes no sense). */
export function isAlreadyActivated(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "Trainer.AlreadyHasAccount" || error.code === "Member.AlreadyHasAccount")
  );
}
