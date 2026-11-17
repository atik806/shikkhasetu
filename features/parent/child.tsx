"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTranslations } from "next-intl";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";
import { Initials } from "@/components/shared";
import { cn } from "@/lib/utils";

const useChildStore = create<{ childId: string | null; setChildId: (id: string) => void }>()(
  persist((set) => ({ childId: null, setChildId: (childId) => set({ childId }) }), { name: "shikkhasetu-child" }),
);

/** Children of the signed-in guardian, plus the currently selected one. */
export function useChildren() {
  const q = useAppQuery(["my-children"], () => services.reports.myChildren());
  const { childId, setChildId } = useChildStore();
  const children = q.data ?? [];
  const selected = children.find((c) => c.id === childId) ?? children[0];
  useEffect(() => {
    if (selected && selected.id !== childId) setChildId(selected.id);
  }, [selected, childId, setChildId]);
  return { query: q, children, selected, setChildId };
}

export function ChildSwitcher({ className }: { className?: string }) {
  const t = useTranslations("parent");
  const { children, selected, setChildId } = useChildren();
  if (children.length <= 1) return null;
  return (
    <div role="radiogroup" aria-label={t("childSwitcher")} className={cn("mb-5 flex gap-2 overflow-x-auto pb-1", className)}>
      {children.map((c) => {
        const active = c.id === selected?.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setChildId(c.id)}
            className={cn("flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm transition-colors", active ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}
          >
            <Initials name={c.name} className="size-7" />
            <span className="text-left leading-tight">
              {c.name.split(" ")[0]}
              <span className="block text-[11px] font-normal text-muted-foreground">{c.sectionLabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
