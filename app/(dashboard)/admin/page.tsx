"use client";

import Link from "next/link";
import { AlertTriangle, CalendarCheck, CreditCard, GraduationCap, ScanLine, ShieldAlert, Signature, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, StatCard, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAppQuery, useNum } from "@/lib/hooks";
import { fmtDate, fmtDateTime } from "@/lib/time";

export default function AdminDashboard() {
  const n = useNum();
  const q = useAppQuery(["admin-dash"], () => services.reports.adminDashboard());
  const att = useAppQuery(["att-overview"], () => services.attendance.overview(14));
  const rates = useAppQuery(["ack-rates"], () => services.acks.schoolRates());
  return (
    <Async query={q}>
      {(d) => (
        <div className="space-y-5">
          <div>
            <h1 className="font-heading text-xl font-semibold sm:text-2xl">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{n(d.students)} students · {n(d.teachers)} teachers · {d.sections} sections</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Attendance today" value={d.attendanceToday !== null ? `${n(d.attendanceToday)}%` : "—"} hint={`${d.registersSubmitted}/${d.sections} registers submitted`} icon={<CalendarCheck />} />
            <StatCard label="Gate check-ins today" value={n(d.gateInToday)} icon={<ScanLine />} />
            <StatCard label={`Acknowledged · ${d.ackExam ?? ""}`} value={d.ackRate !== null ? `${n(d.ackRate)}%` : "—"} hint={`${d.flagged} need follow-up`} icon={<Signature />} tone={d.flagged ? "warning" : "success"} />
            <StatCard label="Collected this month" value={`৳${n(d.collected)}`} icon={<CreditCard />} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Attendance — last 14 school days</CardTitle></CardHeader>
              <CardContent className="h-60">
                {att.data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={att.data.trend.filter((x) => x.percent !== null)} margin={{ left: -18, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tickFormatter={(v: string) => fmtDate(v, "d MMM")} tick={{ fontSize: 11 }} />
                      <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, "Present"]} labelFormatter={(v) => fmtDate(String(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="percent" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Needs your action</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {d.pendingPublish.length > 0 ? (
                  <div>
                    <p className="mb-1 font-medium">Ready to publish ({d.pendingPublish.length})</p>
                    <ul className="space-y-1">
                      {d.pendingPublish.slice(0, 5).map((p) => <li key={p.id}><Link className="hover:underline" href={`/admin/exams/${p.examId}`}>{p.section}</Link> <span className="text-xs text-muted-foreground">· {p.exam}</span></li>)}
                    </ul>
                  </div>
                ) : <p className="text-muted-foreground">No result sheets waiting.</p>}
                <p>Pending leave requests: <b>{d.pendingLeaves}</b></p>
                <p className="flex items-center gap-1.5"><ShieldAlert className="size-4 text-warning" /> Flagged acknowledgments: <b>{d.flagged}</b></p>
                <Button size="sm" variant="outline" render={<Link href="/admin/attendance" />}><AlertTriangle /> Attendance & mismatches</Button>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Acknowledgment rate by section {rates.data?.exam ? `· ${rates.data.exam.name}` : ""}</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {(rates.data?.sections ?? []).map((s) => (
                    <li key={s.id} className="text-sm">
                      <div className="flex justify-between"><span>{s.label}</span><span className="tabular-nums">{s.acked}/{s.total} {s.flagged ? <StatusBadge tone="danger" className="ml-1">{s.flagged} flagged</StatusBadge> : null}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${s.rate}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Recent activity</CardTitle><Button size="sm" variant="link" render={<Link href="/admin/audit" />}>Audit log</Button></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs">
                  {d.recentAudit.map((a) => <li key={a.id}><b>{a.actor}</b> · {a.action}<span className="block text-muted-foreground">{fmtDateTime(a.at)}{a.reason ? ` — ${a.reason}` : ""}</span></li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button variant="outline" render={<Link href="/admin/students" />}><GraduationCap /> Students</Button>
            <Button variant="outline" render={<Link href="/admin/guardians" />}><Users /> Guardians</Button>
            <Button variant="outline" render={<Link href="/admin/exams" />}><Signature /> Exams</Button>
            <Button variant="outline" render={<Link href="/admin/fees" />}><CreditCard /> Fees</Button>
          </div>
        </div>
      )}
    </Async>
  );
}
