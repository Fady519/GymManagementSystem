import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-error";
import { applyServerErrors } from "@/lib/form-errors";
import type { ErrorText } from "@/features/member-profile/schemas";

/**
 * API error codes we know how to say in the visitor's language. The API writes its messages in
 * English, so for these we show our own translation instead.
 */
const KNOWN_CODES = {
  "Member.PhoneTaken": "phoneTaken",
  "File.Empty": "photoType",
  "File.NotAnImage": "photoType",
  "File.TooLarge": "photoSize",
} as const;

type KnownCode = keyof typeof KNOWN_CODES;
const isKnown = (code: string | null): code is KnownCode => !!code && code in KNOWN_CODES;

/** The best message for a failed request: translated when we know the code, else the API's own. */
export function errorMessage(error: unknown, t: ErrorText): string {
  if (!(error instanceof ApiError)) return t("generic");
  return isKnown(error.code) ? t(KNOWN_CODES[error.code]) : error.message;
}

/**
 * Shows a failed save on a form: a known error code goes under its field (translated),
 * everything else goes through the shared applyServerErrors (field errors / message on top).
 */
export function showFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  t: ErrorText,
  codeFields: Partial<Record<KnownCode, Path<T>>> = {},
) {
  if (!(error instanceof ApiError)) {
    setError("root.server", { type: "server", message: t("generic") });
    return;
  }
  const field = isKnown(error.code) ? codeFields[error.code] : undefined;
  if (field && isKnown(error.code)) {
    setError(field, { type: "server", message: t(KNOWN_CODES[error.code]) }, { shouldFocus: true });
    return;
  }
  applyServerErrors(error, setError, fields);
}
