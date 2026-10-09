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
import { getQueryClient } from "@/lib/query-client";
import { getStore } from "@/store/store";

/**
 * Everything the client side of the app needs, in one place:
 * Redux (auth + UI state), TanStack Query (server data), the light/dark theme and toasts.
 * AuthBootstrap restores the logged-in session when the page loads.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // One store and one query client per browser tab (see getStore for why it can't be one per Providers).
  // useState keeps the same objects for the life of this component.
  const [store] = useState(getStore);
  const [queryClient] = useState(getQueryClient);
  const locale = useLocale();
  const tCommon = useTranslations("Common");

  // Give the API client the store. In the browser it's always the same one, so this is harmless
  // on every render; on the server it's the store of the current render.
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
