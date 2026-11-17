"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Async, DataTable, PageHeader, StatusBadge } from "@/components/shared";
import { Register } from "@/features/attendance/components/register";
import { GateLog } from "@/features/attendance/components/gate-log";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";
import { fmtDate, today } from "@/lib/time";

export default function AdminAttendance() {
  const q = useAppQuery(["att-overview"], () => services.attendance.overview(14));
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"sections" | "gate">("sections");
  return (
    <>
      <PageHeader title="Attendance" description={`Today, ${fmtDate(today())}. Open a section to view or override its register (reason required after lock).`} actions={
        <div className="flex gap-1"><Button size="sm" variant={tab === "sections" ? "secondary" : "ghost"} onClick={() => setTab("sections")}>Sections</Button><Button size="sm" variant={tab === "gate" ? "secondary" : "ghost"} onClick={() => setTab("gate")}>Gate log</Button></div>
      } />
      {tab === "gate" ? <GateLog /> : (
        <Async query={q}>
          {(d) => (
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle className="text-base">School-wide attendance (14 school days)</CardTitle></CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.trend.filter((t) => t.percent !== null)} margin={{ left: -18, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v: string) => fmtDate(v, "d MMM")} tick={{ fontSize: 11 }} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, "Present"]} labelFormatter={(v) => fmtDate(String(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="percent" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <DataTable
                rows={d.bySection}
                rowKey={(r) => r.id}
                pageSize={30}
                columns={[
                  { key: "sec", header: "Section", cell: (r) => <button type="button" className="font-medium hover:underline" onClick={() => setOpen(r.id)}>{r.label}</button>, sortValue: (r) => r.label },
                  { key: "shift", header: "Shift", cell: (r) => r.shift, sortValue: (r) => r.shift },
                  { key: "sub", header: "Register", cell: (r) => (r.submitted ? <StatusBadge tone="success">Submitted</StatusBadge> : <StatusBadge tone="warning">Not yet</StatusBadge>) },
                  { key: "pct", header: "Present", cell: (r) => (r.percent === null ? "—" : `${r.percent}%`), sortValue: (r) => r.percent ?? -1 },
                  { key: "abs", header: "Absent", cell: (r) => r.absent, sortValue: (r) => r.absent },
                  { key: "late", header: "Late", cell: (r) => r.late, sortValue: (r) => r.late },
                  { key: "mm", header: "Gate/class mismatch", cell: (r) => (r.mismatches ? <StatusBadge tone="danger">{r.mismatches}</StatusBadge> : "0"), sortValue: (r) => r.mismatches },
                ]}
              />
            </div>
          )}
        </Async>
      )}
      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Register</DialogTitle></DialogHeader>
          {open ? <Register sectionId={open} date={today()} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
