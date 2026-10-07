import axios, { type AxiosError } from "axios";
import { toApiError } from "@/lib/api-error";
import type { AppStore } from "@/store/store";

/**
 * The one Axios instance the app uses.
 * - baseURL is empty: calls go to /api/... on the same origin, and next.config.ts forwards them to the API.
 * - withCredentials: sends the httpOnly refresh-token cookie (used by /api/auth/refresh in F1).
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

// Every failed request becomes an ApiError, so components get one consistent error shape.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(toApiError(error as AxiosError<never>)),
);
