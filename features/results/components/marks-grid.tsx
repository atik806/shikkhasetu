"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Lock, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Async, PageHeader, Status, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { validateMark } from "@/features/results/lib/grading";
import { services } from "@/lib/services";
import { downloadCsv, useAction, useAppQuery } from "@/lib/hooks";
import { fmtTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { MarkValue } from "@/types";

type Grid = Record<string, Record<string, string>>;

/** Spreadsheet-like marks entry: arrow keys / Enter move between cells, autosaves a draft. */
export function MarksGrid({ examId, sectionId, subjectId, backHref }: { examId: string; sectionId: string; subjectId: string; backHref: string }) {
  const q = useAppQuery(["mark-sheet", examId, sectionId, subjectId], () => services.results.markSheet(examId, sectionId, subjectId));
  // typed values are layered over the saved marks (no copying server data into state)
  const [edited, setGrid] = useState<Grid>({});
  const base: Grid = Object.fromEntries((q.data?.students ?? []).map((s) => [s.id, Object.fromEntries((q.data?.components ?? []).map((c) => [c.key, s.marks[c.key] === undefined ? "" : String(s.marks[c.key])]))]));
  const grid: Grid = Object.fromEntries(Object.entries(base).map(([sid, row]) => [sid, { ...row, ...edited[sid] }]));
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [reopen, setReopen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toEntries = (): { ok: true; entries: Record<string, Record<string, MarkValue>> } | { ok: false; error: string } => {
    const d = q.data!;
    const entries: Record<string, Record<string, MarkValue>> = {};
    for (const s of d.students) {
      const row: Record<string, MarkValue> = {};
      for (const c of d.components) {
        const v = validateMark(grid[s.id]?.[c.key] ?? "", c.fullMarks);
        if (!v.ok) return { ok: false, error: `${s.name}, ${c.label}: ${v.error}` };
        if (v.value !== undefined) row[c.key] = v.value;
      }
      if (Object.keys(row).length) entries[s.id] = row;
    }
    return { ok: true, entries };
  };

  const save = useAction((submit: boolean) => {
    const r = toEntries();
    if (!r.ok) return Promise.reject(new Error(r.error));
    return services.results.saveMarks({ examId, sectionId, subjectId, entries: r.entries, submit });
  }, { onSuccess: () => { setDirty(false); setSavedAt(new Date().toISOString()); } });
  const reopenSheet = useAction((reason: string) => services.results.reopenSheet({ examId, sectionId, subjectId, reason }), { success: "Sheet reopened for editing", onSuccess: () => setReopen(false) });

  // autosave draft 2.5 s after the last edit
  const saveMutate = save.mutate;
  useEffect(() => {
    if (!dirty || !q.data?.editable) return;
    const id = setTimeout(() => {
      const r = toEntries();
      if (r.ok) saveMutate(false);
    }, 2500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edited, dirty]);

  const move = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const d = q.data!;
    let r = row;
    let c = col;
    if (e.key === "ArrowDown" || e.key === "Enter") r++;
    else if (e.key === "ArrowUp") r--;
    else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) c++;
    else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) c--;
    else return;
    e.preventDefault();
    r = Math.max(0, Math.min(d.students.length - 1, r));
    c = Math.max(0, Math.min(d.components.length - 1, c));
    document.getElementById(`cell-${r}-${c}`)?.focus();
  };

  const exportCsv = () => {
    const d = q.data!;
    downloadCsv(`marks-${d.sectionLabel}-${d.subjectName}.csv`, [["roll", "student_id", "name", ...d.components.map((c) => c.key)], ...d.students.map((s) => [s.roll, s.studentId, s.name, ...d.components.map((c) => grid[s.id]?.[c.key] ?? "")])]);
  };
  const importCsv = async (file: File) => {
    const d = q.data!;
    const text = await file.text();
    const [head, ...lines] = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
    const cols = head.split(",").map((h) => h.trim());
    const idIdx = cols.indexOf("student_id");
    if (idIdx < 0) return toast.error("CSV needs a student_id column. Export first to get the template.");
    let n = 0;
    const next = { ...edited };
    for (const line of lines) {
      const cells = line.split(",");
      const st = d.students.find((s) => s.studentId === cells[idIdx]?.trim());
      if (!st) continue;
      next[st.id] = { ...next[st.id] };
      d.components.forEach((c) => {
        const i = cols.indexOf(c.key);
        if (i >= 0) next[st.id][c.key] = (cells[i] ?? "").trim();
      });
      n++;
    }
    setGrid(next);
    setDirty(true);
    toast.success(`Imported ${n} rows. Check them, then save.`);
  };

  return (
    <Async query={q}>
      {(d) => {
        const filled = d.students.filter((s) => d.components.every((c) => (grid[s.id]?.[c.key] ?? "") !== "")).length;
        return (
          <>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href={backHref} />}><ArrowLeft /> Back</Button>
            <PageHeader
              title={`${d.subjectName} — ${d.sectionLabel}`}
              description={`${d.examName} · ${d.components.map((c) => `${c.label} ${c.fullMarks}`).join(" + ")} · type AB for absent`}
              actions={
                <>
                  <Status value={d.sectionState === "OPEN" ? d.status : d.sectionState} />
                  <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
                  {d.editable ? <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload /> Import</Button> : null}
                  <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
                  {d.canReopen ? <Button variant="outline" size="sm" onClick={() => setReopen(true)}>Reopen</Button> : null}
                </>
              }
            />
            {!d.editable ? (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm"><Lock className="size-4" />{d.sectionState !== "OPEN" ? "The result sheet is locked by the class teacher." : "Submitted. Ask the class teacher to reopen it to make changes."}</p>
            ) : null}
            <Card className="p-0">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="w-12 px-3 py-2">Roll</th>
                      <th scope="col" className="px-3 py-2">Student</th>
                      {d.components.map((c) => <th key={c.key} scope="col" className="w-28 px-2 py-2">{c.label} <span className="font-normal">/{c.fullMarks}</span></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {d.students.map((s, ri) => (
                      <tr key={s.id} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{s.roll}</td>
                        <td className="px-3 py-1.5">{s.name}</td>
                        {d.components.map((c, ci) => {
                          const val = grid[s.id]?.[c.key] ?? "";
                          const v = validateMark(val, c.fullMarks);
                          return (
                            <td key={c.key} className="px-2 py-1">
                              <input
                                id={`cell-${ri}-${ci}`}
                                aria-label={`${s.name} ${c.label}`}
                                aria-invalid={!v.ok}
                                value={val}
                                disabled={!d.editable}
                                inputMode="decimal"
                                onKeyDown={(e) => move(e, ri, ci)}
                                onChange={(e) => { const v = e.target.value; setGrid((g) => ({ ...g, [s.id]: { ...g[s.id], [c.key]: v } })); setDirty(true); }}
                                className={cn("h-8 w-20 rounded-md border bg-background px-2 text-right tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60", !v.ok && "border-danger bg-danger/5")}
                              />
                              {!v.ok ? <span className="sr-only">{v.error}</span> : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {d.editable ? (
              <div className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-end gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
                <span className="mr-auto text-xs text-muted-foreground">
                  {filled}/{d.students.length} complete · {save.isPending ? "Saving…" : dirty ? "Unsaved changes" : savedAt ? `Draft saved ${fmtTime(savedAt)}` : d.updatedAt ? `Last saved ${fmtTime(d.updatedAt)}` : ""}
                </span>
                <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>Save draft</Button>
                <Button onClick={() => save.mutate(true, { onSuccess: () => toast.success("Submitted to the class teacher") })} disabled={save.isPending || filled < d.students.length}>
                  <Send /> Submit
                </Button>
              </div>
            ) : null}
            {filled < d.students.length && d.editable ? <p className="mt-2 text-right text-xs text-muted-foreground"><StatusBadge tone="warning">{d.students.length - filled} empty</StatusBadge> Submit unlocks when every student has a mark or AB.</p> : null}
            <ReasonDialog open={reopen} onOpenChange={setReopen} title="Reopen this subject" description="The subject teacher will be notified." pending={reopenSheet.isPending} onConfirm={(r) => reopenSheet.mutate(r)} />
          </>
        );
      }}
    </Async>
  );
}
