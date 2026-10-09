"use client";

import { useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Direction } from "radix-ui";
import { Toaster } from "@/components/ui/sonner";
import { directionOf } from "@/i18n/routing";
import { AuthBootstrap } from "@/features/auth/components/auth-bootstrap";
import { injectStore } from "@/lib/api-client";
import { makeQueryClient } from "@/lib/query-client";
import { makeStore } from "@/store/store";

/**
 * Everything the client side of the app needs, in one place:
 * Redux (auth + UI state), TanStack Query (server data), the light/dark theme and toasts.
 * AuthBootstrap restores the logged-in session when the page loads.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useState(() => ...) creates the store and query client once per browser tab, not on every render.
  const [store] = useState(makeStore);
  const [queryClient] = useState(makeQueryClient);
  const locale = useLocale();
  const tCommon = useTranslations("Common");

  // Give the API client the store React actually kept. (In development, React's Strict Mode runs the
  // initializer above twice and throws one store away, so we must not inject from inside it.)
  // Assigning the same store again on later renders is harmless.
  injectStore(store);

  return (
    // Radix components (Tabs, Select, menus...) assume left-to-right unless told otherwise.
    // Without this, Arabic pages get dir="ltr" inside tabs and reversed keyboard navigation.
    <Direction.Provider dir={directionOf(locale)}>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthBootstrap />
            {children}
            <Toaster
              richColors
              position="top-center"
              dir={directionOf(locale)}
              containerAriaLabel={tCommon("notifications")}
            />
          </ThemeProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ReduxProvider>
    </Direction.Provider>
  );
}
