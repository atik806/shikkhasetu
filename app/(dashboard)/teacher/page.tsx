"use client";

import Link from "next/link";
import { AlertTriangle, CalendarCheck, ClipboardList, MessageSquare, Signature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, StatCard, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAppQuery, useMe } from "@/lib/hooks";
import { today, weekdayOf } from "@/lib/time";

export default function TeacherHome() {
  const me = useMe();
  const tt = useAppQuery(["teacher-tt"], () => services.timetable.teacher());
  const secs = useAppQuery(["my-sections"], () => services.attendance.mySections());
  const sheets = useAppQuery(["my-mark-sheets"], () => services.results.myMarkSheets());
  const threads = useAppQuery(["threads"], () => services.messaging.threads());
  const ct = me.data?.classTeacherSectionIds[0];
  const board = useAppQuery(["board", ct], () => services.attendance.sectionBoard(ct!), { enabled: Boolean(ct) });
  const tracker = useAppQuery(["tracker-latest", ct], async () => {
    const first = await services.acks.tracker("_", ct!);
    const latest = first.exams[first.exams.length - 1];
    return latest ? { name: latest.name, ...(await services.acks.tracker(latest.id, ct!)).summary } : null;
  }, { enabled: Boolean(ct) });

  const todaySlots = (tt.data ?? []).filter((s) => s.day === weekdayOf(today())).sort((a, b) => a.period - b.period);
  const pendingMarks = (sheets.data ?? []).filter((s) => s.status === "DRAFT" && s.sectionState === "OPEN");
  const unread = (threads.data ?? []).reduce((s, t) => s + t.unread, 0);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-semibold sm:text-2xl">Good day, {me.data?.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{(secs.data ?? []).length} section(s){ct ? ` · class teacher of ${secs.data?.find((s) => s.id === ct)?.label ?? ""}` : ""}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Classes today" value={todaySlots.length} icon={<CalendarCheck />} />
        <StatCard label="Marks to enter" value={pendingMarks.length} icon={<ClipboardList />} tone={pendingMarks.length ? "warning" : "default"} />
        <StatCard label="Unread messages" value={unread} icon={<MessageSquare />} />
        {ct ? <StatCard label="Open mismatches" value={board.data?.mismatches.length ?? "…"} icon={<AlertTriangle />} tone={board.data?.mismatches.length ? "danger" : "default"} /> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Today&apos;s periods</CardTitle></CardHeader>
          <CardContent>
            {todaySlots.length === 0 ? <p className="text-sm text-muted-foreground">No classes today.</p> : (
              <ol className="space-y-1.5 text-sm">{todaySlots.map((s) => <li key={s.id} className="flex justify-between gap-2"><span><b>P{s.period}</b> {s.subjectName}</span><span className="text-muted-foreground">{s.sectionLabel}</span></li>)}</ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Marks pending</CardTitle><Button size="sm" variant="link" render={<Link href="/teacher/marks" />}>All</Button></CardHeader>
          <CardContent>
            {pendingMarks.length === 0 ? <p className="text-sm text-muted-foreground">All submitted. 👍</p> : (
              <ul className="space-y-1.5 text-sm">
                {pendingMarks.slice(0, 6).map((s) => (
                  <li key={`${s.examId}${s.sectionId}${s.subjectId}`}>
                    <Link className="hover:underline" href={`/teacher/marks/${s.examId}/${s.sectionId}/${s.subjectId}`}>{s.subjectName} · {s.sectionLabel}</Link>
                    <span className="ml-2 text-xs text-muted-foreground">{s.examName} · {s.entered}/{s.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        {ct ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Signature className="size-4" /> Acknowledgments {tracker.data ? `· ${tracker.data.name}` : ""}</CardTitle>
              <Button size="sm" render={<Link href="/teacher/acknowledgments" />}>Open tracker</Button>
            </CardHeader>
            <CardContent>
              <Async query={tracker} rows={1}>
                {(s) => s ? (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <StatusBadge tone="success">{s.acknowledged}/{s.total} acknowledged</StatusBadge>
                    <StatusBadge tone="warning">{s.pending} pending</StatusBadge>
                    <StatusBadge tone="danger">{s.overdue} overdue</StatusBadge>
                    <StatusBadge tone={s.flagged ? "danger" : "neutral"}>{s.flagged} need follow-up</StatusBadge>
                    <StatusBadge tone={s.paperMismatch ? "danger" : "neutral"}>{s.paperMismatch} paper mismatch</StatusBadge>
                  </div>
                ) : <p className="text-sm text-muted-foreground">No published results yet.</p>}
              </Async>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
