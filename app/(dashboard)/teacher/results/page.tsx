"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, EmptyState, NativeSelect, PageHeader, Status, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { CtSectionPicker, useCtSections } from "@/features/teacher/ct-section";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/time";

export default function ResultReview() {
  const secs = useCtSections();
  const [picked, setPicked] = useState("");
  const sectionId = picked || secs.data?.find((s) => s.isClassTeacher)?.id || "";
  const exams = useAppQuery(["exams"], () => services.results.exams());
  const [examId, setExamId] = useState("");
  const eid = examId || exams.data?.[0]?.id || "";
  const q = useAppQuery(["section-sheet", eid, sectionId], () => services.results.sectionSheet(eid, sectionId), { enabled: Boolean(eid && sectionId) });
  const [lockOpen, setLockOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const lock = useAction(() => services.results.lock(eid, sectionId), { success: "Locked. The admin has been told it is ready to publish.", onSuccess: () => setLockOpen(false) });
  const unlock = useAction((reason: string) => services.results.unlock(eid, sectionId, reason), { success: "Unlocked for corrections", onSuccess: () => setUnlockOpen(false) });

  if (!sectionId) return <EmptyState title="You are not a class teacher" />;
  return (
    <>
      <PageHeader
        title="Result review & lock"
        description="Check every subject is submitted, review the whole sheet, then lock it so the admin can publish."
        actions={
          <>
            <NativeSelect className="w-64" label="Exam" value={eid} onChange={setExamId} options={(exams.data ?? []).map((e) => ({ value: e.id, label: e.name }))} />
            <CtSectionPicker value={sectionId} onChange={setPicked} />
          </>
        }
      />
      <Async query={q}>
        {(d) => (
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{d.sectionLabel} · {d.examName}</CardTitle>
                <div className="flex items-center gap-2">
                  <Status value={d.state} />
                  {d.state === "OPEN" ? <Button disabled={!d.canLock} onClick={() => setLockOpen(true)}><Lock /> Lock sheet</Button> : null}
                  {d.state === "LOCKED" ? <Button variant="outline" onClick={() => setUnlockOpen(true)}><LockOpen /> Unlock</Button> : null}
                </div>
              </CardHeader>
              <CardContent>
                {d.state !== "OPEN" && d.lockedAt ? <p className="mb-3 text-xs text-muted-foreground">Locked by {d.lockedBy} · {fmtDateTime(d.lockedAt)}</p> : null}
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {d.subjects.map((s) => (
                    <li key={s.subjectId} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                      <span className="min-w-0">
                        <Link className="font-medium hover:underline" href={`/teacher/marks/${eid}/${sectionId}/${s.subjectId}`}>{s.name}</Link>
                        <span className="block truncate text-xs text-muted-foreground">{s.teacher} · {s.entered} entered</span>
                      </span>
                      <Status value={s.status} />
                    </li>
                  ))}
                </ul>
                {!d.canLock && d.state === "OPEN" ? <p className="mt-3 text-xs text-muted-foreground">Lock becomes available when every subject is submitted.</p> : null}
              </CardContent>
            </Card>
            <Card className="p-0">
              <CardHeader className="pt-4"><CardTitle className="text-base">Preview (computed from current marks)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2">Roll</th>
                      <th scope="col" className="px-3 py-2">Student</th>
                      <th scope="col" className="px-3 py-2 text-right">Total</th>
                      <th scope="col" className="px-3 py-2 text-right">GPA</th>
                      <th scope="col" className="px-3 py-2">Grade</th>
                      <th scope="col" className="px-3 py-2 text-right">Position</th>
                      <th scope="col" className="px-3 py-2">Failed subjects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.preview.map((r) => (
                      <tr key={r.studentId} className="border-t">
                        <td className="px-3 py-2 tabular-nums">{r.student.roll}</td>
                        <td className="px-3 py-2">{r.student.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.totalObtained}/{r.totalFull}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.gpa.toFixed(2)}</td>
                        <td className="px-3 py-2"><StatusBadge tone={r.passed ? "success" : "danger"}>{r.letter}</StatusBadge></td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.sectionPosition}</td>
                        <td className="px-3 py-2 text-xs text-danger">{r.subjectResults.filter((s) => s.gp === 0).map((s) => d.subjects.find((x) => x.subjectId === s.subjectId)?.name).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </Async>
      <ReasonDialog open={lockOpen} onOpenChange={setLockOpen} title="Lock this result sheet?" description="Teachers can no longer edit marks. The admin will publish it to guardians." requireReason={false} confirmLabel="Lock" pending={lock.isPending} onConfirm={() => lock.mutate(undefined)} />
      <ReasonDialog open={unlockOpen} onOpenChange={setUnlockOpen} title="Unlock the result sheet" description="Unlocking is audited." pending={unlock.isPending} onConfirm={(r) => unlock.mutate(r)} />
    </>
  );
}
