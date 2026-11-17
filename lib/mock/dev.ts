"use client";
/** Dev-panel settings (per browser). */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setClockOffset } from "@/lib/time";

interface DevState {
  clockOffsetMs: number;
  latency: boolean;
  errorRate: number; // 0..1
  offline: boolean;
  setClockOffsetMs: (ms: number) => void;
  set: (p: Partial<Omit<DevState, "set" | "setClockOffsetMs">>) => void;
}

export const useDevStore = create<DevState>()(
  persist(
    (set) => ({
      clockOffsetMs: 0,
      latency: true,
      errorRate: 0,
      offline: false,
      setClockOffsetMs: (ms) => {
        setClockOffset(ms);
        set({ clockOffsetMs: ms });
      },
      set: (p) => set(p),
    }),
    {
      name: "shikkhasetu-dev",
      onRehydrateStorage: () => (state) => {
        if (state) setClockOffset(state.clockOffsetMs);
      },
    },
  ),
);

export class InjectedError extends Error {
  constructor() {
    super("Simulated network error (dev panel). Try again.");
    this.name = "InjectedError";
  }
}

export async function simulateNetwork() {
  const { latency, errorRate } = useDevStore.getState();
  if (latency) await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
  if (errorRate > 0 && Math.random() < errorRate) throw new InjectedError();
}
