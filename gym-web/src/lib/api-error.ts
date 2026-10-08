import type { AxiosError } from "axios";
import { plainTranslations, type ErrorsText } from "@/lib/plain-translations";

/** The ProblemDetails body every API error uses (RFC 9457), plus our machine-readable `code`. */
type ProblemDetailsBody = {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
};

/**
 * One error type for the whole app. Components only deal with this,
 * never with raw Axios errors.
 *
 * `message` is already in the visitor's language (see describeProblem below), so code that
 * shows `error.message` keeps working. Prefer apiErrorMessage(error) for new code.
 */
export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  readonly status: number;
  /** Machine-readable code from the API, e.g. "Membership.Overlap". */
  readonly code: string | null;
  /** Validation errors per field (from 400 responses), e.g. { email: ["..."] }. */
  readonly fieldErrors: Record<string, string[]>;
  /** The API's own explanation (ProblemDetails `detail`), always in English. Last-resort text only. */
  readonly serverMessage: string | null;
  /** True when the request gave up waiting (no answer in time), false when the server was unreachable. */
  readonly timedOut: boolean;

  constructor(
    status: number,
    message: string,
    code: string | null,
    fieldErrors: Record<string, string[]>,
    serverMessage: string | null = null,
    timedOut = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.serverMessage = serverMessage;
    this.timedOut = timedOut;
  }
}

/** Codes look like "Plan.NameTaken"; anything else can't be a key of the "Errors" messages. */
const CODE_SHAPE = /^[A-Z][A-Za-z]*\.[A-Z][A-Za-z]*$/;

// Used only before the translations are registered (the first instant after page load).
const ENGLISH_FALLBACK = {
  network: "Can't reach the server. Check your connection and try again.",
  generic: "Something went wrong. Please try again.",
};

type FallbackKey = Parameters<ErrorsText>[0] & `fallback.${string}`;

/** The general message for an HTTP status when the API sent no code we know. */
function fallbackFor(status: number, timedOut: boolean): FallbackKey {
  if (status === 0) return timedOut ? "fallback.timeout" : "fallback.network";
  if (status >= 500) return "fallback.server";
  switch (status) {
    case 400:
      return "fallback.badRequest";
    case 401:
      return "fallback.unauthenticated";
    case 403:
      return "fallback.forbidden";
    case 404:
      return "fallback.notFound";
    case 409:
      return "fallback.conflict";
    case 429:
      return "fallback.rateLimit";
    default:
      return "fallback.generic";
  }
}

/**
 * The best message for a failed request, in the visitor's language:
 * 1. a code we have a translation for, e.g. "Plan.NameTaken" -> Errors.Plan.NameTaken;
 * 2. no answer at all / a server crash -> the translated network or server message;
 * 3. an unknown code with an explanation from the API -> the API's (English) text, as a last resort;
 * 4. otherwise a translated message for the HTTP status.
 */
function describeProblem(
  status: number,
  code: string | null,
  serverMessage: string | null,
  timedOut: boolean,
): string {
  const t = plainTranslations()?.errors;
  if (!t)
    return serverMessage ?? (status === 0 ? ENGLISH_FALLBACK.network : ENGLISH_FALLBACK.generic);

  if (code && CODE_SHAPE.test(code)) {
    // Codes come from the server at run time, so TypeScript can't check them: t.has() does.
    const key = code as Parameters<ErrorsText>[0];
    if (t.has(key)) return t(key);
  }
  if (status !== 0 && status < 500 && serverMessage) return serverMessage;
  return t(fallbackFor(status, timedOut));
}

/** The message to show for any caught error (an ApiError or anything else), in the visitor's language. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Worked out again (not error.message) so a cached error follows a language switch.
    return describeProblem(error.status, error.code, error.serverMessage, error.timedOut);
  }
  return plainTranslations()?.errors("fallback.generic") ?? ENGLISH_FALLBACK.generic;
}

/** Turns an Axios error into an ApiError with the best message we can give. */
export function toApiError(error: AxiosError<ProblemDetailsBody>): ApiError {
  if (!error.response) {
    const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    return new ApiError(0, describeProblem(0, null, null, timedOut), null, {}, null, timedOut);
  }

  const status = error.response.status;
  const body = error.response.data ?? {};
  const code = body.code ?? null;
  // Only `detail` explains the problem; `title` is a generic phrase like "Not Found".
  const serverMessage = body.detail ?? null;

  return new ApiError(
    status,
    describeProblem(status, code, serverMessage, false),
    code,
    body.errors ?? {},
    serverMessage,
  );
}
