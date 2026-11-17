"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth/session";
import { useDevStore } from "@/lib/mock/dev";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";

const MESSAGES = { en, bn } as const;

/**
 * App-wide providers. Rendering is NOT gated here, so public/marketing pages are server-rendered
 * and indexable. Pages that read the browser database wrap themselves in <DataGate>.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  const locale = useSession((s) => s.locale);
  // touching the dev store makes sure the simulated clock is restored before any query runs
  useDevStore((s) => s.clockOffsetMs);

  useEffect(() => {
    document.documentElement.lang = locale === "bn" ? "bn" : "en";
  }, [locale]);

  return (
    // Light ("white") mode by default for everyone; dark stays available from the toggle.
    // New storage key so earlier visitors on a dark system also start in light mode.
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="shikkhasetu-theme" disableTransitionOnChange>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Dhaka" onError={() => {}}>
        <QueryClientProvider client={client}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-center" />
          </TooltipProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
