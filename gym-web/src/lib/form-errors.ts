import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-error";

type ServerErrorOptions<T extends FieldValues> = {
  /** Known API error codes and the field their message belongs under, e.g. { "Auth.EmailTaken": "email" }. */
  codes?: Partial<Record<string, Path<T>>>;
  /** When the API names a field differently from the form, e.g. { newPassword: "password" }. */
  aliases?: Partial<Record<string, Path<T>>>;
};

/**
 * Shows an API error in the right place on a react-hook-form form:
 * 1. 400 validation errors: each message goes under its field (the API sends camelCase keys like "email").
 * 2. Known error codes (options.codes): the message goes under that field.
 * 3. Anything else: one message at the top of the form (read it with formState.errors.root?.server).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  { codes = {}, aliases = {} }: ServerErrorOptions<T> = {},
) {
  if (!(error instanceof ApiError)) {
    setError("root.server", { type: "server", message: "Something went wrong. Please try again." });
    return;
  }

  let shownOnAField = false;
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = aliases[key] ?? fields.find((name) => name === key);
    if (field && messages.length > 0) {
      setError(field, { type: "server", message: messages[0] }, { shouldFocus: !shownOnAField });
      shownOnAField = true;
    }
  }

  const fieldForCode = error.code ? codes[error.code] : undefined;
  if (fieldForCode) {
    setError(fieldForCode, { type: "server", message: error.message }, { shouldFocus: true });
    return;
  }

  if (!shownOnAField) {
    setError("root.server", { type: "server", message: error.message });
  }
}
