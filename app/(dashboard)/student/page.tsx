"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardCheck, IdCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, StatCard } from "@/components/shared";
import { services } from "@/lib/services";
import { useAppQuery, useMe, useNum } from "@/lib/hooks";
import { weekdayOf, today, fmtTime } from "@/lib/time";

export default function StudentHome() {
  const me = useMe();
  const n = useNum();
  const sid = me.data?.studentRecordId;
  const info = useAppQuery(["my-student"], () => services.reports.myStudent());
  const tt = useAppQuery(["tt", info.data?.sectionId], () => services.timetable.section(info.data!.sectionId), { enabled: Boolean(info.data) });
  const hw = useAppQuery(["homework", sid], () => services.homework.forStudent(sid!), { enabled: Boolean(sid) });
  const att = useAppQuery(["att-month", sid, today().slice(0, 7)], () => services.attendance.studentMonth(sid!, today().slice(0, 7)), { enabled: Boolean(sid) });
  const status = useAppQuery(["today", sid], () => services.attendance.todayStatus(sid!), { enabled: Boolean(sid) });
  const todaySlots = (tt.data?.slots ?? []).filter((s) => s.day === weekdayOf(today())).sort((a, b) => a.period - b.period);
  const pending = (hw.data ?? []).filter((h) => !h.done);
  return (
    <Async query={info}>
      {(s) => (
        <div className="space-y-5">
          <div>
            <h1 className="font-heading text-xl font-semibold sm:text-2xl">Hi {s.name.split(" ")[0]} 👋</h1>
            <p className="text-sm text-muted-foreground">{s.sectionLabel} · Roll {s.roll} · {s.shift} shift · Class teacher {s.classTeacher}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Attendance (term)" value={att.data ? `${n(att.data.termPercent)}%` : "…"} icon={<CalendarDays />} />
            <StatCard label="Homework to do" value={n(pending.length)} icon={<BookOpen />} tone={pending.length > 3 ? "warning" : "default"} />
            <StatCard label="Checked in today" value={status.data?.gateIn ? fmtTime(status.data.gateIn.at) : "—"} icon={<IdCard />} />
            <StatCard label="Results" value={<Link className="text-base text-primary underline-offset-4 hover:underline" href="/student/results">Open</Link>} icon={<ClipboardCheck />} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Today&apos;s classes</CardTitle></CardHeader>
              <CardContent>
                {todaySlots.length === 0 ? <p className="text-sm text-muted-foreground">No classes today.</p> : (
                  <ol className="space-y-1.5 text-sm">
                    {todaySlots.map((x) => <li key={x.id} className="flex justify-between gap-2"><span><b>P{x.period}</b> {x.subjectName}</span><span className="text-muted-foreground">{x.teacherName}</span></li>)}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Homework</CardTitle></CardHeader>
              <CardContent>
                {pending.length === 0 ? <p className="text-sm text-muted-foreground">All done. 🎉</p> : (
                  <ul className="space-y-1.5 text-sm">
                    {pending.slice(0, 5).map((h) => <li key={h.id}><b>{h.subjectName}:</b> {h.title}</li>)}
                  </ul>
                )}
                <Link href="/student/homework" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">Open homework</Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Async>
  );
}
