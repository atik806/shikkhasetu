"use client";

import { useState } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Async, EmptyState, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useMe } from "@/lib/hooks";
import { addDaysISO, fmtDate, today } from "@/lib/time";

function AssignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const me = useMe();
  const sheets = useAppQuery(["my-mark-sheets"], () => services.results.myMarkSheets(), { enabled: open });
  const pairs = [...new Map((sheets.data ?? []).map((s) => [`${s.sectionId}:${s.subjectId}`, { value: `${s.sectionId}:${s.subjectId}`, label: `${s.sectionLabel} — ${s.subjectName}` }])).values()];
  const diary = (me.data?.classTeacherSectionIds ?? []).map((id) => ({ value: `${id}:`, label: `${pairs.find((p) => p.value.startsWith(id))?.label.split(" — ")[0] ?? "My section"} — Diary note (whole section)` }));
  const options = [...pairs, ...diary];
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [due, setDue] = useState(addDaysISO(today(), 1));
  const [file, setFile] = useState("");
  const value = target || options[0]?.value || "";
  const assign = useAction((i: Parameters<typeof services.homework.assign>[0]) => services.homework.assign(i), { success: "Posted. Students and guardians can see it now.", onSuccess: () => { onOpenChange(false); setTitle(""); setDetails(""); } });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Assign homework / diary note</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <NativeSelect label="Section & subject" value={value} onChange={setTarget} options={options} />
          <Field label="Title" htmlFor="hw-title"><Input id="hw-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Details" htmlFor="hw-details"><Textarea id="hw-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Due date" htmlFor="hw-due"><Input id="hw-due" type="date" min={today()} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
            <Field label="Attachment" htmlFor="hw-file" hint="Simulated"><Input id="hw-file" type="file" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!value || !title.trim() || assign.isPending} onClick={() => { const [sectionId, subjectId] = value.split(":"); assign.mutate({ sectionId, subjectId: subjectId || undefined, title: title.trim(), details: details.trim(), dueDate: due, attachmentName: file || undefined }); }}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherHomework() {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const q = useAppQuery(["teacher-homework"], () => services.homework.forTeacher());
  const remove = useAction((id: string) => services.homework.remove(id), { success: "Deleted" });
  return (
    <>
      <PageHeader title="Homework & diary" description="Students see it at once, and guardians see today's diary on their home screen." actions={<Button onClick={() => setOpen(true)}><Plus /> Assign</Button>} />
      <Async query={q}>
        {(rows) => rows.length === 0 ? <EmptyState title="Nothing posted yet" /> : (
          <ul className="space-y-2">
            {rows.map((h) => (
              <li key={h.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><StatusBadge tone={h.subjectId ? "info" : "warning"}>{h.subjectName}</StatusBadge><span className="text-xs text-muted-foreground">{h.sectionLabel} · {h.by}</span></div>
                      <p className="mt-1 font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground">Given {fmtDate(h.assignedOn)} · due {fmtDate(h.dueDate)} {h.attachmentName ? <span className="ml-1 inline-flex items-center gap-1"><Paperclip className="size-3" />{h.attachmentName}</span> : null}</p>
                    </div>
                    <div className="w-full sm:w-44">
                      <p className="mb-1 text-xs text-muted-foreground">{h.completion}% marked done</p>
                      <Progress value={h.completion} aria-label="Completion" />
                    </div>
                    {h.createdBy === me.data?.id ? <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(h.id)}><Trash2 /></Button> : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Async>
      <AssignDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
