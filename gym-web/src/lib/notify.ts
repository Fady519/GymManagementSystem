import { toast } from "sonner";
import { ApiError } from "@/lib/api-error";

/**
 * Shows a failed request as an error toast: a short title saying what failed,
 * and the API's own explanation underneath (e.g. "The plan cannot be deleted while it has
 * active memberships. Deactivate it instead.").
 */
export function toastError(title: string, error: unknown) {
  const description =
    error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
  toast.error(title, { description });
}

/**
 * The result of sending an account invite (trainers and members). The API still creates the
 * login when the email fails, so that case is a warning with what to do next, not an error.
 */
export function toastInvite(name: string, email: string, inviteSent: boolean) {
  if (inviteSent) {
    toast.success(`Invite sent to ${name}`, {
      // The link lifetime comes from the API's settings (Email:InviteLinkDays), so we don't repeat the number here.
      description: `${email} got a link to choose a password. It expires after a few days.`,
    });
  } else {
    toast.warning(`${name}'s login is ready, but the email didn't go out`, {
      description: "The mail server didn't accept it. Use “Resend invite” in a few minutes.",
    });
  }
}

/** True when the API says the person already chose their password (resending makes no sense). */
export function isAlreadyActivated(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "Trainer.AlreadyHasAccount" || error.code === "Member.AlreadyHasAccount")
  );
}
