"use client";
/**
 * Offline-first gate queue. When the (simulated) network is off, scans are stored on this
 * device with their original timestamp and replayed when it comes back.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GateEvent, ID } from "@/types";

export interface QueuedScan {
  id: string;
  studentId: ID;
  studentName: string;
  type: GateEvent["type"];
  at: string;
  reason?: string;
  pickedUpBy?: string;
}

interface QueueState {
  items: QueuedScan[];
  add: (s: QueuedScan) => void;
  remove: (id: string) => void;
}

export const useGateQueue = create<QueueState>()(
  persist(
    (set) => ({
      items: [],
      add: (s) => set((st) => ({ items: [...st.items, s] })),
      remove: (id) => set((st) => ({ items: st.items.filter((x) => x.id !== id) })),
    }),
    { name: "shikkhasetu-gate-queue" },
  ),
);
