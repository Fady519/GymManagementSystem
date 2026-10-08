import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toApiError, type ApiError } from "@/lib/api-error";
import { areaOf } from "@/lib/roles";
import { clearSessionHint, setSessionHint } from "@/lib/session-hint";
import { sessionEnded, sessionStarted } from "@/store/authSlice";
import type { AppStore } from "@/store/store";
import type { AuthResponse } from "@/types";

/**
 * The one Axios instance the app uses.
 * - baseURL is empty: calls go to /api/... on the same origin, and next.config.ts forwards them to the API.
 * - withCredentials: sends the httpOnly refresh-token cookie to /api/auth/*.
 */
export const apiClient = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

// The store is created inside React (StoreProvider), so it is handed to us here
// instead of being imported. This avoids a circular import and a shared server-side store.
let appStore: AppStore | null = null;

export function injectStore(store: AppStore) {
  appStore = store;
}

// Adds "Authorization: Bearer <token>" when the user is logged in.
apiClient.interceptors.request.use((config) => {
  const token = appStore?.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------------------------
// Silent refresh
// ---------------------------------------------------------------------------------------------

/**
 * A separate client for the refresh call, without our interceptors.
 * Otherwise a failing refresh would trigger another refresh, forever.
 */
const refreshClient = axios.create({ baseURL: "", withCredentials: true });

/** The refresh that is running right now, shared by everyone who asks for one. */
let refreshInFlight: Promise<AuthResponse | null> | null = null;

/**
 * Gets a new access token using the refresh cookie, and saves the new session in the store.
 * Returns the new session, or null if the user must log in again.
 *
 * The API gives every refresh token ONE use. If the same token is sent twice, it thinks the token
 * was stolen and signs the user out everywhere. So we make sure only one refresh runs at a time:
 * - in this tab: everyone who calls while a refresh is running gets the same promise;
 * - across tabs: the Web Locks API makes other tabs wait, so they send the NEW cookie, not the used one.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function runRefresh(): Promise<AuthResponse | null> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("pf-auth-refresh", callRefreshEndpoint);
  }
  return callRefreshEndpoint();
}

async function callRefreshEndpoint(): Promise<AuthResponse | null> {
  try {
    const response = await refreshClient.post<AuthResponse>("/api/auth/refresh");
    // Update the hint first, so proxy.ts already knows the right area if we navigate next.
    setSessionHint(areaOf(response.data.user.roles));
    appStore?.dispatch(sessionStarted(response.data));
    return response.data;
  } catch (error) {
    const apiError = toApiError(error as AxiosError<never>);
    // 401 = the refresh cookie is missing, expired or revoked: the session is really over.
    // Other errors (server down, 429 rate limit) keep the hint, so a later reload can try again.
    if (apiError.status === 401) {
      clearSessionHint();
    }
    appStore?.dispatch(sessionEnded("expired"));
    return null;
  }
}

/** Auth endpoints that must never trigger a refresh-and-retry (their 401s mean "wrong password" etc.). */
const NO_RETRY_URLS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/accept-invite",
];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * When a request fails with 401 because the access token expired (after 15 minutes),
 * refresh once and repeat the request. The user never notices.
 * Every other failure becomes an ApiError, so components get one consistent error shape.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const hadToken = Boolean(appStore?.getState().auth.accessToken);

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      hadToken &&
      !NO_RETRY_URLS.includes(original.url ?? "")
    ) {
      original._retried = true;
      const session = await refreshSession();
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient(original);
      }
    }

    await readBlobError(error);
    return Promise.reject<ApiError>(toApiError(error as AxiosError<never>));
  },
);

/**
 * File downloads ask for responseType "blob", so when they fail the ProblemDetails body is a Blob
 * instead of an object. Turn it back into JSON, so the user sees the API's message
 * (e.g. "The export is limited to 10,000 rows") instead of "Request failed (400)".
 */
async function readBlobError(error: AxiosError) {
  const response = error.response;
  if (!response || !(response.data instanceof Blob) || !response.data.type.includes("json")) return;
  try {
    response.data = JSON.parse(await response.data.text());
  } catch {
    // Not valid JSON: keep the generic message.
  }
}
