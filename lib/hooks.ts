"use client";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { useLocale } from "next-intl";
import { services } from "@/lib/services";
import { useSession } from "@/lib/auth/session";
import { toBanglaDigits } from "@/lib/time";
import type { Permission } from "@/lib/auth/permissions";

export function useMe() {
  const userId = useSession((s) => s.userId);
  const role = useSession((s) => s.role);
  return useQuery({ queryKey: ["me", userId, role], queryFn: () => services.auth.me(), enabled: Boolean(userId && role), staleTime: 60_000 });
}

export function useCan() {
  const me = useMe();
  return useCallback((p: Permission) => Boolean(me.data?.permissions.includes(p)), [me.data]);
}

/** Query scoped to the current session so switching role/user never shows stale data. */
export function useAppQuery<T>(key: QueryKey, fn: () => Promise<T>, options: { enabled?: boolean; refetchInterval?: number } = {}) {
  const userId = useSession((s) => s.userId);
  const role = useSession((s) => s.role);
  return useQuery({ queryKey: [userId, role, ...key], queryFn: fn, enabled: options.enabled ?? true, refetchInterval: options.refetchInterval });
}

/** Mutation that toasts errors/success and refreshes every query (the mock DB is tiny and local). */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string | undefined); onSuccess?: (r: TResult) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r) => {
      await qc.invalidateQueries();
      const msg = typeof opts.success === "function" ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(r);
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong"),
  });
}

/** Number formatting that honours the Bangla-digits preference. */
export function useNum() {
  const locale = useLocale();
  const bnDigits = useSession((s) => s.banglaDigits);
  return useCallback(
    (v: number | string, opts?: Intl.NumberFormatOptions) => {
      const s = typeof v === "number" ? v.toLocaleString("en-IN", opts) : v;
      return locale === "bn" || bnDigits ? toBanglaDigits(s) : s;
    },
    [locale, bnDigits],
  );
}

export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
  const esc = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
