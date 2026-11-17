"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ID, Role } from "@/types";

export const SESSION_COOKIE = "ss_session";

/** Per-browser device id, used for the active-devices list and anomaly rules. */
function newDeviceId() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return `dev_${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android phone" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows PC" : /Mac/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux PC" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
}

interface SessionState {
  userId: ID | null;
  role: Role | null;
  deviceId: string;
  locale: "en" | "bn";
  banglaDigits: boolean;
  setSession: (userId: ID, role: Role) => void;
  setRole: (role: Role) => void;
  clear: () => void;
  setLocale: (l: "en" | "bn") => void;
  setBanglaDigits: (v: boolean) => void;
  lastRoleByUser: Record<ID, Role>;
}

/**
 * MOCK session cookie (readable by proxy.ts for role redirects). Not httpOnly, not signed —
 * the real backend replaces this with a signed httpOnly session cookie.
 */
function writeCookie(userId: ID | null, role: Role | null) {
  if (typeof document === "undefined") return;
  if (!userId || !role) {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const value = btoa(JSON.stringify({ u: userId, r: role }));
  document.cookie = `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      userId: null,
      role: null,
      deviceId: typeof crypto !== "undefined" ? newDeviceId() : "dev_ssr",
      locale: "en",
      banglaDigits: false,
      lastRoleByUser: {},
      setSession: (userId, role) => {
        writeCookie(userId, role);
        set({ userId, role, lastRoleByUser: { ...get().lastRoleByUser, [userId]: role } });
      },
      setRole: (role) => {
        const { userId } = get();
        writeCookie(userId, role);
        set({ role, lastRoleByUser: userId ? { ...get().lastRoleByUser, [userId]: role } : get().lastRoleByUser });
      },
      clear: () => {
        writeCookie(null, null);
        set({ userId: null, role: null });
      },
      setLocale: (locale) => set({ locale }),
      setBanglaDigits: (banglaDigits) => set({ banglaDigits }),
    }),
    {
      name: "shikkhasetu-session",
      onRehydrateStorage: () => (state) => {
        // keep cookie in sync with storage (e.g. after the cookie expired)
        if (state?.userId && state.role) writeCookie(state.userId, state.role);
      },
    },
  ),
);
