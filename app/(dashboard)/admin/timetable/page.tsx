"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Async, NativeSelect, PageHeader } from "@/components/shared";
import { TimetableGrid } from "@/features/timetable/components/timetable-grid";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import type { Weekday } from "@/types";

export default function TimetableBuilder() {
  const ov = useAppQuery(["overview"], () => services.school.overview());
  const [sectionId, setSectionId] = useState("");
  const sid = sectionId || ov.data?.sections[0]?.id || "";
  const q = useAppQuery(["tt", sid], () => services.timetable.section(sid), { enabled: Boolean(sid) });
  const [cell, setCell] = useState<{ day: Weekday; period: number } | null>(null);
  const [choice, setChoice] = useState("");
  const set = useAction((i: { subjectId: string; teacherId: string }) => services.timetable.setSlot({ sectionId: sid, day: cell!.day, period: cell!.period, ...i }), {
    onSuccess: (conflicts) => { setCell(null); if (conflicts) toast.warning("Saved, but this creates a conflict (teacher or room double-booked)."); else toast.success("Saved"); },
  });
  return (
    <>
      <PageHeader title="Timetable builder" description="Click a cell to change it. Conflicts (a teacher or room booked twice in the same shift) are highlighted." actions={<NativeSelect className="w-48" label="Section" value={sid} onChange={setSectionId} options={(ov.data?.sections ?? []).map((s) => ({ value: s.id, label: s.label }))} />} />
      <Async query={q}>
        {(d) => (
          <div className="space-y-4">
            {d.conflicts.length > 0 ? (
              <div className="rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4 text-danger" /> {d.conflicts.length} conflict(s) involving {d.label}</p>
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {d.conflicts.slice(0, 6).map((c) => <li key={c.key}>{c.day} P{c.period}: {c.kind === "teacher" ? "teacher" : "room"} also used by {c.sections.filter((s) => s !== d.label).join(", ")}</li>)}
                </ul>
              </div>
            ) : null}
            <TimetableGrid slots={d.slots} mode="section" onCellClick={(day, period) => { setCell({ day, period }); const s = d.slots.find((x) => x.day === day && x.period === period); setChoice(s ? `${s.subjectId}|${s.teacherId}` : `${d.options[0]?.subjectId}|${d.options[0]?.teacherId}`); }} />
            <Dialog open={Boolean(cell)} onOpenChange={(o) => !o && setCell(null)}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>{cell?.day} · Period {cell?.period}</DialogTitle></DialogHeader>
                <NativeSelect label="Subject — teacher" value={choice} onChange={setChoice} options={d.options.map((o) => ({ value: `${o.subjectId}|${o.teacherId}`, label: o.label }))} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCell(null)}>Cancel</Button>
                  <Button disabled={set.isPending} onClick={() => { const [subjectId, teacherId] = choice.split("|"); set.mutate({ subjectId, teacherId }); }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Async>
    </>
  );
}
