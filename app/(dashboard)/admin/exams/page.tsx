"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Async, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { addDaysISO, fmtDate, today } from "@/lib/time";
import type { Exam } from "@/types";

function CreateExam({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ov = useAppQuery(["overview"], () => services.school.overview(), { enabled: open });
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [kind, setKind] = useState<Exam["kind"]>("class_test");
  const [start, setStart] = useState(addDaysISO(today(), 7));
  const [end, setEnd] = useState(addDaysISO(today(), 10));
  const [full, setFull] = useState(100);
  const [mcq, setMcq] = useState(30);
  const [classes, setClasses] = useState<string[]>([]);
  const create = useAction((i: Parameters<typeof services.results.createExam>[0]) => services.results.createExam(i), { success: "Exam created. Teachers can enter marks now.", onSuccess: () => onOpenChange(false) });
  const all = ov.data?.classes ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Create exam</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="ex-name"><Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Class Test 4" /></Field>
          <Field label="Name (Bangla)" htmlFor="ex-bn"><Input id="ex-bn" value={nameBn} onChange={(e) => setNameBn(e.target.value)} placeholder="শ্রেণি পরীক্ষা ৪" /></Field>
          <NativeSelect label="Type" value={kind} onChange={(v) => setKind(v as Exam["kind"])} options={[{ value: "class_test", label: "Class test" }, { value: "half_yearly", label: "Half-yearly" }, { value: "annual", label: "Annual" }, { value: "pre_test", label: "Pre-test" }, { value: "test", label: "Test" }]} />
          <div />
          <Field label="Start" htmlFor="ex-s"><Input id="ex-s" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End" htmlFor="ex-e"><Input id="ex-e" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Field label="Full marks per subject" htmlFor="ex-full"><Input id="ex-full" type="number" min={10} value={full} onChange={(e) => setFull(Number(e.target.value))} /></Field>
          <Field label="MCQ part (0 = written only)" htmlFor="ex-mcq" hint="Written and MCQ must be passed separately when MCQ > 0."><Input id="ex-mcq" type="number" min={0} max={full - 1} value={mcq} onChange={(e) => setMcq(Number(e.target.value))} /></Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Classes</legend>
          <div className="flex flex-wrap gap-3">
            {all.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm"><Checkbox checked={classes.includes(c.id)} onCheckedChange={(v) => setClasses((l) => (v ? [...l, c.id] : l.filter((x) => x !== c.id)))} /> Class {c.name}</label>
            ))}
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim() || classes.length === 0 || create.isPending} onClick={() => create.mutate({ name: name.trim(), nameBn: nameBn.trim() || name.trim(), kind, startDate: start, endDate: end, classIds: classes, fullMarks: full, mcqMarks: mcq })}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminExams() {
  const q = useAppQuery(["exams"], () => services.results.exams());
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader title="Exams & results" description="Teachers enter marks → class teacher locks → you publish → guardians acknowledge." actions={<Button onClick={() => setOpen(true)}><Plus /> Create exam</Button>} />
      <Async query={q}>
        {(rows) => (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/exams/${e.id}`} className="flex items-center gap-4 rounded-xl border p-4 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.name} <span className="text-sm font-normal text-muted-foreground">· {e.nameBn}</span></p>
                    <p className="text-xs text-muted-foreground">{fmtDate(e.startDate)} – {fmtDate(e.endDate)} · {e.classIds.length} classes</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {e.counts.open ? <StatusBadge>{e.counts.open} open</StatusBadge> : null}
                      {e.counts.locked ? <StatusBadge tone="warning">{e.counts.locked} ready to publish</StatusBadge> : null}
                      {e.counts.published ? <StatusBadge tone="success">{e.counts.published} published</StatusBadge> : null}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Async>
      <CreateExam open={open} onOpenChange={setOpen} />
    </>
  );
}
