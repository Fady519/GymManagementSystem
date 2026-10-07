import type { AxiosError } from "axios";

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
 */
export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  readonly status: number;
  /** Machine-readable code from the API, e.g. "Membership.Overlap". */
  readonly code: string | null;
  /** Validation errors per field (from 400 responses), e.g. { email: ["..."] }. */
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    code: string | null,
    fieldErrors: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Turns an Axios error into an ApiError with the best message the API gave us. */
export function toApiError(error: AxiosError<ProblemDetailsBody>): ApiError {
  if (!error.response) {
    return new ApiError(
      0,
      "Can't reach the server. Check your connection and try again.",
      null,
      {},
    );
  }

  const status = error.response.status;
  const body = error.response.data ?? {};
  const message = body.detail ?? body.title ?? `Request failed (${status}).`;

  return new ApiError(status, message, body.code ?? null, body.errors ?? {});
}
