"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { LanguageProvider } from "@/lib/i18n/context";
import { NotificationProvider } from "@/components/notifications/notification-context";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator, UpdateAvailableBanner } from "@/components/pwa/offline-indicator";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <NotificationProvider>
              {children}
              {/* PWA Components */}
              <InstallPrompt 
                delay={5000}
                autoShow={true}
              />
              <OfflineIndicator 
                position="top"
                showSyncStatus={true}
              />
              <UpdateAvailableBanner />
            </NotificationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
