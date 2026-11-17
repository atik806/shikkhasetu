"use client";

import { useAppQuery } from "@/lib/hooks";
import { services } from "@/lib/services";
import { NativeSelect } from "@/components/shared";

/** Sections where the current teacher is class teacher (usually one). */
export function useCtSections() {
  return useAppQuery(["my-sections"], () => services.attendance.mySections());
}

export function CtSectionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const q = useCtSections();
  const list = (q.data ?? []).filter((s) => s.isClassTeacher);
  if (list.length <= 1) return null;
  return <NativeSelect className="w-48" label="Section" value={value} onChange={onChange} options={list.map((s) => ({ value: s.id, label: s.label }))} />;
}
