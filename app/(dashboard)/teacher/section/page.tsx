"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, DoorOpen, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, DataTable, EmptyState, PageHeader, StatCard, Status, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { CtSectionPicker, useCtSections } from "@/features/teacher/ct-section";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDate, fmtTime } from "@/lib/time";
import type { MismatchKind } from "@/types";

export default function SectionBoard() {
  const secs = useCtSections();
  const [picked, setPicked] = useState("");
  const sectionId = picked || secs.data?.find((s) => s.isClassTeacher)?.id || "";
  const q = useAppQuery(["board", sectionId], () => services.attendance.sectionBoard(sectionId), { enabled: Boolean(sectionId), refetchInterval: 15_000 });
  const [resolve, setResolve] = useState<{ studentId: string; date: string; kind: MismatchKind; name: string } | null>(null);
  const done = useAction((i: { studentId: string; date: string; kind: MismatchKind; note: string }) => services.attendance.resolveMismatch(i), { success: "Marked as resolved", onSuccess: () => setResolve(null) });

  if (!sectionId) return <EmptyState title="You are not a class teacher" />;
  return (
    <>
      <PageHeader title="My section board" description="Live view: gate check-ins against your class register. Refreshes every 15 seconds." actions={<CtSectionPicker value={sectionId} onChange={setPicked} />} />
      <Async query={q}>
        {(d) => {
          const inCount = d.rows.filter((r) => r.gateIn).length;
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Checked in at gate" value={`${inCount}/${d.rows.length}`} icon={<CheckCircle2 />} tone="success" />
                <StatCard label="Late" value={d.rows.filter((r) => r.gateLate).length} icon={<DoorOpen />} tone="warning" />
                <StatCard label="Open mismatches" value={d.mismatches.length} icon={<AlertTriangle />} tone={d.mismatches.length ? "danger" : "default"} />
                <StatCard label="Absence streaks" value={d.chronic.length} icon={<UserX />} tone={d.chronic.length ? "danger" : "default"} />
              </div>
              {!d.registerSubmitted ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                  <span>Today&apos;s register for {d.sectionLabel} is not submitted yet. Mismatches appear after you submit.</span>
                  <Button size="sm" render={<Link href="/teacher/attendance" />}>Take attendance</Button>
                </div>
              ) : null}
              <Card>
                <CardHeader><CardTitle className="text-base">Mismatches to resolve</CardTitle></CardHeader>
                <CardContent>
                  {d.mismatches.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to check. 👍</p> : (
                    <ul className="divide-y">
                      {d.mismatches.map((m) => (
                        <li key={`${m.studentId}:${m.date}`} className="flex flex-wrap items-center gap-3 py-2.5">
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-medium">{m.student.name} <span className="text-xs text-muted-foreground">Roll {m.student.roll}</span></p>
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(m.date)} · {m.kind === "gate_in_class_absent" ? <span className="text-danger">Gate IN {m.gateInAt ? fmtTime(m.gateInAt) : ""} but ABSENT in class — possible bunking</span> : "Present in class but no gate scan"}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setResolve({ studentId: m.studentId, date: m.date, kind: m.kind, name: m.student.name })}>Resolve</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <DataTable
                rows={d.rows}
                rowKey={(r) => r.id}
                searchText={(r) => r.name}
                pageSize={50}
                columns={[
                  { key: "roll", header: "Roll", cell: (r) => r.roll, sortValue: (r) => r.roll },
                  { key: "name", header: "Student", cell: (r) => <Link className="hover:underline" href={`/teacher/students/${r.id}`}>{r.name}</Link>, sortValue: (r) => r.name },
                  { key: "gate", header: "Gate", cell: (r) => r.gateIn ? <span>{fmtTime(r.gateIn)} {r.gateLate ? <StatusBadge tone="warning">Late</StatusBadge> : null}{r.gateOut ? <span className="block text-xs text-muted-foreground">OUT {fmtTime(r.gateOut)}</span> : null}</span> : <span className="text-muted-foreground">—</span>, sortValue: (r) => r.gateIn ?? "~" },
                  { key: "class", header: "Class register", cell: (r) => (r.classStatus ? <Status value={r.classStatus} /> : <span className="text-xs text-muted-foreground">not taken</span>) },
                  { key: "streak", header: "Absent streak", cell: (r) => (r.streak > 0 ? <StatusBadge tone={r.streak >= 3 ? "danger" : "warning"}>{r.streak} day(s)</StatusBadge> : null), sortValue: (r) => r.streak },
                ]}
              />
            </div>
          );
        }}
      </Async>
      <ReasonDialog open={Boolean(resolve)} onOpenChange={(o) => !o && setResolve(null)} title={`Resolve: ${resolve?.name ?? ""}`} description="What happened? (e.g. was in the nurse's room, scan missed, talked to guardian)" minLength={3} confirmLabel="Mark resolved" pending={done.isPending} onConfirm={(note) => resolve && done.mutate({ ...resolve, note })} />
    </>
  );
}
