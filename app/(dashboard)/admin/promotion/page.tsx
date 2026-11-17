"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";

export default function Promotion() {
  const ov = useAppQuery(["overview"], () => services.school.overview());
  const [sectionId, setSectionId] = useState("");
  const sid = sectionId || ov.data?.sections[0]?.id || "";
  const chooseSection = (v: string) => {
    setSectionId(v);
    setOverrides({});
  };
  const q = useAppQuery(["promotion", sid], () => services.school.promotionPreview(sid), { enabled: Boolean(sid) });
  // per-student overrides on top of the default "passed students are promoted"
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const picked = (q.data?.students ?? []).filter((s) => overrides[s.id] ?? s.passed).map((s) => s.id);
  const setPicked = (id: string, v: boolean) => setOverrides((o) => ({ ...o, [id]: v }));
  const [confirm, setConfirm] = useState(false);
  const apply = useAction((reason: string) => services.school.applyPromotion(sid, picked, reason), { success: "Promotion applied (audited)", onSuccess: () => setConfirm(false) });
  return (
    <>
      <PageHeader title="Year-end promotion" description="Students who passed are pre-selected. Override individually; the change is audited. Previous years stay viewable in results." actions={<NativeSelect className="w-48" label="Section" value={sid} onChange={chooseSection}options={(ov.data?.sections ?? []).map((s) => ({ value: s.id, label: s.label }))} />} />
      <Async query={q}>
        {(d) => (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{d.from} → {d.to} <span className="block text-xs font-normal text-muted-foreground">Based on: {d.basedOn}</span></CardTitle>
              <Button onClick={() => setConfirm(true)} disabled={picked.length === 0}>Promote {picked.length}</Button>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {d.students.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                      <Checkbox checked={picked.includes(s.id)} onCheckedChange={(v) => setPicked(s.id, Boolean(v))} />
                      <span className="flex-1">{s.roll}. {s.name}</span>
                      {s.gpa !== null ? <StatusBadge tone={s.passed ? "success" : "danger"}>{s.gpa.toFixed(2)}</StatusBadge> : null}
                    </label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </Async>
      <ReasonDialog open={confirm} onOpenChange={setConfirm} title={`Promote ${picked.length} student(s)?`} description="They move to the next class's section with the same letter. Class 10 students are marked as left (graduated)." pending={apply.isPending} onConfirm={(r) => apply.mutate(r)} />
    </>
  );
}
