import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-error";

/** Creates the TanStack Query client with app-wide defaults. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is "fresh" for 30 seconds: going back to a page shows it instantly without refetching.
        staleTime: 30_000,
        // Retry network errors and 5xx once, but never 4xx (a 404 or 403 won't fix itself).
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
