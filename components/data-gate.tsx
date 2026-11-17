"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { useDbStore } from "@/lib/mock/db";
import { useSession } from "@/lib/auth/session";

const noopSubscribe = () => () => {};

/** Waits until the browser database is loaded (first visit seeds the demo school). */
export function DataGate({ children }: { children: ReactNode }) {
  const hydrated = useDbStore((s) => s.hydrated);
  const locale = useSession((s) => s.locale);
  // false on the server and during hydration, true afterwards
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (mounted && hydrated) return <>{children}</>;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground" role="status" aria-live="polite">
      <GraduationCap className="size-10 animate-pulse text-primary" aria-hidden />
      <p className="text-sm">{locale === "bn" ? "স্কুলের তথ্য লোড হচ্ছে…" : "Loading school data…"}</p>
    </div>
  );
}
