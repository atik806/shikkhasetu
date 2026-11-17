"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";

export default function AdminClasses() {
  const ov = useAppQuery(["overview"], () => services.school.overview());
  const teachers = useAppQuery(["teachers"], () => services.school.teachers());
  const [sectionId, setSectionId] = useState("");
  const sid = sectionId || ov.data?.sections[0]?.id || "";
  const asg = useAppQuery(["assignments", sid], () => services.school.assignments(sid), { enabled: Boolean(sid) });
  const setCT = useAction((i: { s: string; t: string }) => services.school.setClassTeacher(i.s, i.t), { success: "Class teacher updated" });
  const setA = useAction((i: { sub: string; t: string }) => services.school.setAssignment(sid, i.sub, i.t), { success: "Subject teacher updated" });
  const tOptions = (teachers.data ?? []).map((t) => ({ value: t.id, label: t.name }));
  return (
    <>
      <PageHeader title="Classes & sections" description="Each section has a shift, a version (Bangla/English medium), a room and one class teacher." />
      <Async query={ov}>
        {(d) => (
          <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr><th scope="col" className="px-3 py-2">Section</th><th scope="col" className="px-3 py-2">Shift</th><th scope="col" className="px-3 py-2">Version</th><th scope="col" className="px-3 py-2">Students</th><th scope="col" className="px-3 py-2">Class teacher</th></tr>
                </thead>
                <tbody>
                  {d.sections.map((s) => (
                    <tr key={s.id} className={`border-t ${s.id === sid ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-2"><button type="button" className="font-medium hover:underline" onClick={() => setSectionId(s.id)}>{s.label}</button><span className="block text-xs text-muted-foreground">Room {s.room}</span></td>
                      <td className="px-3 py-2">{s.shiftName}</td>
                      <td className="px-3 py-2"><StatusBadge tone={s.version === "english" ? "info" : "neutral"}>{s.version}</StatusBadge></td>
                      <td className="px-3 py-2 tabular-nums">{s.studentCount}</td>
                      <td className="px-3 py-2"><NativeSelect hideLabel label={`Class teacher of ${s.label}`} value={s.classTeacherId} onChange={(v) => setCT.mutate({ s: s.id, t: v })} options={tOptions} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Subject teachers · {d.sections.find((s) => s.id === sid)?.label}</CardTitle></CardHeader>
              <CardContent>
                <Async query={asg}>
                  {(rows) => (
                    <ul className="space-y-2">
                      {rows.map((r) => (
                        <li key={r.subject.id} className="grid grid-cols-[1fr_1.2fr] items-center gap-2 text-sm">
                          <span>{r.subject.name}{r.subject.isOptional ? <span className="text-xs text-muted-foreground"> (4th)</span> : null}</span>
                          <NativeSelect hideLabel label={`Teacher for ${r.subject.name}`} value={r.teacherId ?? ""} onChange={(v) => setA.mutate({ sub: r.subject.id, t: v })} options={[...(r.teacherId ? [] : [{ value: "", label: "— choose —" }]), ...tOptions]} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Async>
              </CardContent>
            </Card>
          </div>
        )}
      </Async>
    </>
  );
}
