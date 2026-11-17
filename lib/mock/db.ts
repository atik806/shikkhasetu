"use client";
/**
 * Mock database: one Zustand store persisted to IndexedDB (localStorage is too small for a school).
 * UI code must NOT import this file — go through the services in /features/<domain>/service.ts.
 */
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { produce } from "immer";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { DB_VERSION, type MockDB } from "./schema";
import { buildSeed } from "./seed";

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

interface DbState {
  db: MockDB | null;
  hydrated: boolean;
  setDb: (db: MockDB) => void;
}

export const useDbStore = create<DbState>()(
  persist(
    (set) => ({
      db: null,
      hydrated: false,
      setDb: (db) => set({ db }),
    }),
    {
      name: "shikkhasetu-db",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ db: s.db }),
      version: DB_VERSION,
      migrate: () => ({ db: null }), // schema changed → reseed
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.db || state.db.version !== DB_VERSION) state.setDb(buildSeed());
        useDbStore.setState({ hydrated: true });
      },
    },
  ),
);

export function getDb(): MockDB {
  const db = useDbStore.getState().db;
  if (!db) throw new Error("Database is not ready yet");
  return db;
}

/** Apply a mutation with Immer and persist it. Returns whatever the recipe returns. */
export function mutate<T>(recipe: (draft: MockDB) => T): T {
  const current = getDb();
  let out!: T;
  const next = produce(current, (draft) => {
    out = recipe(draft as MockDB);
  });
  useDbStore.getState().setDb(next);
  return out;
}

export function reseed() {
  useDbStore.getState().setDb(buildSeed());
}
