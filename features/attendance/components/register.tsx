"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, EmptyState, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDateTime, fmtTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

const OPTIONS: AttendanceStatus[] = ["P", "A", "L", "LV"];
const STYLE: Record<AttendanceStatus, string> = {
  P: "data-[on=true]:bg-success data-[on=true]:text-white",
  A: "data-[on=true]:bg-danger data-[on=true]:text-white",
  L: "data-[on=true]:bg-warning data-[on=true]:text-black",
  LV: "data-[on=true]:bg-primary data-[on=true]:text-primary-foreground",
};

export function Register({ sectionId, date }: { sectionId: string; date: string }) {
  const t = useTranslations("status");
  const q = useAppQuery(["register", sectionId, date], () => services.attendance.register(sectionId, date));
  // teacher's taps are layered over the server/pre-filled values instead of copied into state
  const [edits, setEntries] = useState<Record<string, AttendanceStatus>>({});
  const entries: Record<string, AttendanceStatus> = { ...Object.fromEntries((q.data?.students ?? []).map((s) => [s.id, s.status])), ...edits };
  const [reasonOpen, setReasonOpen] = useState(false);
  const save = useAction((i: { reason?: string }) => services.attendance.submitRegister({ sectionId, date, entries, reason: i.reason }), {
    success: (r) => (r.created ? "Register submitted. Guardians of absent students were notified." : r.changed ? `${r.changed} change(s) saved` : "No changes"),
    onSuccess: () => setReasonOpen(false),
  });

  return (
    <Async query={q}>
      {(d) => {
        if (!d.schoolDay) return <EmptyState title="Holiday" description="No register on weekly holidays or government holidays." />;
        const counts = OPTIONS.map((o) => ({ o, n: Object.values(entries).filter((v) => v === o).length }));
        const dirty = d.submitted && d.students.some((s) => entries[s.id] !== s.status);
        const submit = () => (d.needsReason && dirty ? setReasonOpen(true) : save.mutate({}));
        return (
          <Card>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{d.sectionLabel} · {d.shift.name} shift</CardTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                  {d.submitted ? <StatusBadge tone="success">Submitted {d.submittedAt ? fmtTime(d.submittedAt) : ""} by {d.markedBy}</StatusBadge> : <StatusBadge tone="warning">Not submitted</StatusBadge>}
                  {d.locked ? <StatusBadge tone="neutral" icon={<Lock className="size-3" />}>Locked after {d.lockTime}</StatusBadge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {counts.map((c) => <span key={c.o}>{t(c.o)}: <b className="text-foreground">{c.n}</b></span>)}
                {d.gateEnabled && !d.submitted ? <span>Pre-filled from gate scans. Tap to change.</span> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!d.canEdit ? <p className="rounded-lg bg-muted p-3 text-sm">The register is locked. Ask the class teacher or admin to make changes.</p> : null}
              <ul className="divide-y rounded-xl border">
                {d.students.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium"><span className="mr-2 inline-block w-6 text-muted-foreground tabular-nums">{s.roll}</span>{s.name}</p>
                      <p className="pl-8 text-xs text-muted-foreground">
                        {s.gateInAt ? `Gate IN ${fmtTime(s.gateInAt)}${s.gateLate ? " (late)" : ""}` : d.gateEnabled ? "No gate scan" : ""}
                        {s.onLeave ? " · approved leave" : ""}
                      </p>
                    </div>
                    <div role="radiogroup" aria-label={`Attendance for ${s.name}`} className="flex gap-1 pl-8 sm:pl-0">
                      {OPTIONS.map((o) => (
                        <button
                          key={o}
                          type="button"
                          role="radio"
                          aria-checked={entries[s.id] === o}
                          data-on={entries[s.id] === o}
                          disabled={!d.canEdit}
                          onClick={() => setEntries((e) => ({ ...e, [s.id]: o }))}
                          className={cn("h-9 min-w-11 rounded-md border px-2 text-xs font-semibold transition-colors disabled:opacity-50", STYLE[o])}
                          title={t(o)}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              {d.edits.length > 0 ? (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Edit history ({d.edits.length})</summary>
                  <ul className="mt-2 space-y-1">
                    {d.edits.map((e, i) => <li key={i}>{fmtDateTime(e.at)} · {e.by}: {d.students.find((s) => s.id === e.studentId)?.name} {e.from} → {e.to} — {e.reason}</li>)}
                  </ul>
                </details>
              ) : null}
              {d.canEdit ? (
                <div className="sticky bottom-20 flex justify-end lg:bottom-4">
                  <Button size="lg" className="shadow-lg" onClick={submit} disabled={save.isPending || (d.submitted && !dirty)}>
                    <Save /> {d.submitted ? "Save changes" : "Submit register"}
                  </Button>
                </div>
              ) : null}
              <ReasonDialog open={reasonOpen} onOpenChange={setReasonOpen} title="Edit a locked register" description="Changes after the lock time are audited and guardians are notified again." pending={save.isPending} onConfirm={(reason) => save.mutate({ reason })} />
            </CardContent>
          </Card>
        );
      }}
    </Async>
  );
}
