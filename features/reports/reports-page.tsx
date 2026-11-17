"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Async, DataTable, EmptyState, NativeSelect, PageHeader, StatCard, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { downloadCsv, useAppQuery } from "@/lib/hooks";
import { today } from "@/lib/time";

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 };

export function ReportsPage() {
  const secs = useAppQuery(["report-sections"], () => services.reports.sectionsForReports());
  const [sectionId, setSectionId] = useState("");
  const sid = sectionId || secs.data?.[0]?.id || "";
  const [examId, setExamId] = useState("");
  const [month, setMonth] = useState(today().slice(0, 7));
  const analysis = useAppQuery(["analysis", examId, sid], async () => {
    const first = await services.reports.resultAnalysis(examId || "_", sid);
    if (!examId && first.exams[0]) return services.reports.resultAnalysis(first.exams[first.exams.length - 1].id, sid);
    return first;
  }, { enabled: Boolean(sid) });
  const att = useAppQuery(["att-report", sid, month], () => services.reports.attendanceReport(sid, month), { enabled: Boolean(sid) });
  const eid = examId || analysis.data?.exams[analysis.data.exams.length - 1]?.id || "";
  return (
    <>
      <PageHeader
        title="Reports"
        actions={
          <>
            <NativeSelect className="w-44" label="Section" value={sid} onChange={setSectionId} options={(secs.data ?? []).map((s) => ({ value: s.id, label: s.label }))} />
            {analysis.data ? <NativeSelect className="w-56" label="Exam" value={eid} onChange={setExamId} options={analysis.data.exams.map((e) => ({ value: e.id, label: e.name }))} /> : null}
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          </>
        }
      />
      <Async query={analysis}>
        {(a) => a.total === 0 ? <EmptyState title="No published results for this section yet" /> : (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Students" value={a.total} />
              <StatCard label="Pass rate" value={`${a.passRate}%`} tone={a.passRate >= 85 ? "success" : "warning"} />
              <StatCard label="Average GPA" value={a.averageGpa.toFixed(2)} />
              <StatCard label="Top student" value={<span className="text-base">{a.top[0]?.name ?? "—"}</span>} hint={a.top[0] ? `GPA ${a.top[0].gpa.toFixed(2)}` : undefined} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Grade distribution</CardTitle></CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.grades} margin={{ left: -24, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="Students" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Subject averages (%)</CardTitle></CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.subjects} layout="vertical" margin={{ left: 30, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="subject" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="average" name="Average %" fill="var(--chart-2, var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Async>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Monthly attendance report</CardTitle>
          <div className="flex items-end gap-2">
            <label htmlFor="rep-month" className="sr-only">Month</label>
            <Input id="rep-month" type="month" max={today().slice(0, 7)} value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 w-40" />
            <Button size="sm" variant="outline" onClick={() => att.data && downloadCsv(`attendance-${month}.csv`, [["roll", "name", "days", "present", "late", "absent", "leave", "percent"], ...att.data.map((r) => [r.roll, r.name, r.days, r.present, r.late, r.absent, r.leave, r.percent])])}><Download /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Async query={att}>
            {(rows) => (
              <DataTable rows={rows} rowKey={(r) => r.id} pageSize={40} columns={[
                { key: "roll", header: "Roll", cell: (r) => r.roll, sortValue: (r) => r.roll },
                { key: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
                { key: "p", header: "Present", cell: (r) => r.present },
                { key: "l", header: "Late", cell: (r) => r.late },
                { key: "a", header: "Absent", cell: (r) => r.absent, sortValue: (r) => r.absent },
                { key: "lv", header: "Leave", cell: (r) => r.leave },
                { key: "pct", header: "%", cell: (r) => <StatusBadge tone={r.percent >= 90 ? "success" : r.percent >= 75 ? "warning" : "danger"}>{r.percent}%</StatusBadge>, sortValue: (r) => r.percent },
              ]} />
            )}
          </Async>
        </CardContent>
      </Card>
    </>
  );
}
