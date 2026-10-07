"use client";

import { useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { injectStore } from "@/lib/api-client";
import { makeQueryClient } from "@/lib/query-client";
import { makeStore } from "@/store/store";

/**
 * Everything the client side of the app needs, in one place:
 * Redux (auth + UI state), TanStack Query (server data), the light/dark theme and toasts.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useState(() => ...) creates the store and query client once per browser tab, not on every render.
  const [store] = useState(() => {
    const newStore = makeStore();
    injectStore(newStore);
    return newStore;
  });
  const [queryClient] = useState(makeQueryClient);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ReduxProvider>
  );
}
