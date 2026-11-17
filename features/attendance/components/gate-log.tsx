"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Async, DataTable, PageHeader, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useCan } from "@/lib/hooks";
import { fmtTime, today } from "@/lib/time";

export function GateLog() {
  const can = useCan();
  const [date, setDate] = useState(today());
  const q = useAppQuery(["gate-log", date], () => services.attendance.gateLog(date), { refetchInterval: 15_000 });
  const [fix, setFix] = useState<{ id: string; action: "delete" | "flip" } | null>(null);
  const correct = useAction((i: { eventId: string; action: "delete" | "flip"; reason: string }) => services.attendance.correctGateEvent(i), { success: "Gate record corrected (audited)", onSuccess: () => setFix(null) });
  return (
    <>
      <PageHeader title="Gate log" description="Every IN/OUT scan of the day." actions={<div className="flex items-end gap-2"><label htmlFor="gl-date" className="sr-only">Date</label><Input id="gl-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>} />
      <Async query={q}>
        {(rows) => (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{rows.filter((r) => r.type === "IN").length} IN · {rows.filter((r) => r.type === "OUT").length} OUT · {rows.filter((r) => r.late).length} late</p>
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              searchText={(r) => `${r.student.name} ${r.student.studentId} ${r.student.sectionLabel}`}
              columns={[
                { key: "time", header: "Time", cell: (r) => fmtTime(r.at), sortValue: (r) => r.at },
                { key: "type", header: "Type", cell: (r) => <StatusBadge tone={r.type === "IN" ? "success" : "info"}>{r.type}</StatusBadge> },
                { key: "student", header: "Student", cell: (r) => <span>{r.student.name}<span className="block text-xs text-muted-foreground">{r.student.studentId}</span></span>, sortValue: (r) => r.student.name },
                { key: "section", header: "Class", cell: (r) => r.student.sectionLabel, sortValue: (r) => r.student.sectionLabel },
                { key: "note", header: "Note", cell: (r) => <span className="text-xs">{r.late ? <StatusBadge tone="warning">Late</StatusBadge> : null} {r.reason ? `${r.reason}${r.pickedUpBy ? ` · ${r.pickedUpBy}` : ""}` : ""} {r.correctionReason ? `(corrected: ${r.correctionReason})` : ""}</span> },
                ...(can("gate.correct")
                  ? [{ key: "fix", header: "", cell: (r: (typeof rows)[number]) => (
                      <div className="flex gap-1">
                        <Button size="xs" variant="ghost" onClick={() => setFix({ id: r.id, action: "flip" })}>Flip IN/OUT</Button>
                        <Button size="xs" variant="ghost" className="text-danger" onClick={() => setFix({ id: r.id, action: "delete" })}>Delete</Button>
                      </div>
                    ) }]
                  : []),
              ]}
            />
          </>
        )}
      </Async>
      <ReasonDialog open={Boolean(fix)} onOpenChange={(o) => !o && setFix(null)} title={fix?.action === "delete" ? "Delete gate record" : "Flip IN/OUT"} description="Gate corrections are kept in the audit log." destructive={fix?.action === "delete"} pending={correct.isPending} onConfirm={(reason) => fix && correct.mutate({ eventId: fix.id, action: fix.action, reason })} />
    </>
  );
}
