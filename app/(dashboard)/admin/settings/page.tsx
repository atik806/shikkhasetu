"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Async, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDate } from "@/lib/time";
import type { SchoolSettings, Weekday } from "@/types";

const DAYS: Weekday[] = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

export default function Settings() {
  const q = useAppQuery(["overview"], () => services.school.overview());
  const save = useAction((p: Partial<SchoolSettings>) => services.school.updateSettings(p), { success: "Settings saved (audited)" });
  // unsaved edits override the stored scale; null = show what is saved
  type Band = { min: number; letter: string; gp: number };
  const [bandEdits, setBandEdits] = useState<Band[] | null>(null);
  const [passEdit, setPass] = useState<number | null>(null);
  const bands: Band[] = bandEdits ?? q.data?.gradingScales[0].bands ?? [];
  const pass = passEdit ?? q.data?.gradingScales[0].passPercent ?? 33;
  const setBands = (fn: (l: Band[]) => Band[]) => setBandEdits(fn(bands));
  const saveBands = useAction(() => services.school.updateGradingBands(q.data!.gradingScales[0].id, bands, pass), { success: "Grading scale saved", onSuccess: () => { setBandEdits(null); setPass(null); } });
  const [hol, setHol] = useState({ date: "", title: "", kind: "school" as "government" | "school" | "exam" | "event" });
  const addHol = useAction(() => services.school.addHoliday(hol), { success: "Added to calendar", onSuccess: () => setHol({ date: "", title: "", kind: "school" }) });
  const delHol = useAction((id: string) => services.school.removeHoliday(id));
  return (
    <>
      <PageHeader title="School settings" />
      <Async query={q}>
        {(d) => {
          const s = d.school.settings;
          const toggle = (k: keyof SchoolSettings, label: string, hint?: string) => (
            <label className="flex items-start justify-between gap-3 py-2 text-sm">
              <span>{label}{hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}</span>
              <Switch checked={Boolean(s[k])} onCheckedChange={(v) => save.mutate({ [k]: v } as Partial<SchoolSettings>)} />
            </label>
          );
          const num = (k: keyof SchoolSettings, label: string, min = 1, max = 60) => (
            <Field label={label} htmlFor={`set-${k}`}><Input id={`set-${k}`} type="number" min={min} max={max} defaultValue={Number(s[k])} onBlur={(e) => Number(e.target.value) !== s[k] && save.mutate({ [k]: Number(e.target.value) } as Partial<SchoolSettings>)} /></Field>
          );
          return (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">{d.school.name} · {d.school.nameBn}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>EIIN {d.school.eiin} · {d.school.address}</p>
                  <p>Academic year {d.school.academicYear} (January–December) · Versions: {d.school.versions.join(", ")}</p>
                  <p>Shifts: {d.school.shifts.map((x) => `${x.name} ${x.startTime}–${x.endTime} (grace ${x.graceMinutes} min)`).join(" · ")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Attendance & gate</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  {toggle("gateModuleEnabled", "Gate module", "Off for schools without a scanner. Arrival alerts then come from the class register.")}
                  {toggle("periodAttendanceEnabled", "Per-period attendance", "Enables period-level bunking alerts.")}
                  <div className="grid gap-3 py-3 sm:grid-cols-2">
                    <Field label="Register locks at" htmlFor="lock"><Input id="lock" type="time" defaultValue={s.attendanceLockTime} onBlur={(e) => e.target.value !== s.attendanceLockTime && save.mutate({ attendanceLockTime: e.target.value })} /></Field>
                    {num("consecutiveAbsenceAlert", "Alert after N absences in a row", 2, 10)}
                  </div>
                  <fieldset className="py-3">
                    <legend className="mb-2 text-sm font-medium">Weekly holiday</legend>
                    <div className="flex flex-wrap gap-3">
                      {DAYS.map((day) => (
                        <label key={day} className="flex items-center gap-1.5 text-sm"><Switch checked={s.weeklyHolidays.includes(day)} onCheckedChange={(v) => save.mutate({ weeklyHolidays: v ? [...s.weeklyHolidays, day] : s.weeklyHolidays.filter((x) => x !== day) })} />{day}</label>
                      ))}
                    </div>
                  </fieldset>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Results & acknowledgment</CardTitle></CardHeader>
                <CardContent className="divide-y">
                  <div className="grid gap-3 pb-3 sm:grid-cols-2">
                    {num("ackDeadlineDays", "Acknowledge within (days)", 1, 30)}
                    {num("phoneChangeFlagDays", "Flag acks after a phone change (days)", 1, 60)}
                  </div>
                  {toggle("remoteActivationAllowed", "Allow remote parent activation", "Off by default. In-person activation is much harder for a child to fake.")}
                  {toggle("holdResultCardForDues", "Hold the printed result card for dues", "Parents always see the result in the app.")}
                  <div className="grid gap-3 pt-3 sm:grid-cols-2">
                    {num("studentAccountFromClass", "Student accounts from class", 1, 10)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Grading scale</CardTitle><Button size="sm" onClick={() => saveBands.mutate(undefined)} disabled={saveBands.isPending}>Save scale</Button></CardHeader>
                <CardContent>
                  <Field label="Pass mark (%)" htmlFor="pass"><Input id="pass" type="number" value={pass} onChange={(e) => setPass(Number(e.target.value))} className="w-28" /></Field>
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground"><tr><th scope="col">From %</th><th scope="col">Letter</th><th scope="col">GP</th></tr></thead>
                    <tbody>
                      {bands.map((b, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-2"><Input aria-label={`Band ${i + 1} minimum`} type="number" className="h-8" value={b.min} onChange={(e) => setBands((l) => l.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)))} /></td>
                          <td className="py-1 pr-2"><Input aria-label={`Band ${i + 1} letter`} className="h-8" value={b.letter} onChange={(e) => setBands((l) => l.map((x, j) => (j === i ? { ...x, letter: e.target.value } : x)))} /></td>
                          <td className="py-1"><Input aria-label={`Band ${i + 1} grade point`} type="number" step="0.5" className="h-8" value={b.gp} onChange={(e) => setBands((l) => l.map((x, j) => (j === i ? { ...x, gp: Number(e.target.value) } : x)))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted-foreground">GPA = (compulsory GPs + max(0, 4th-subject GP − 2)) ÷ compulsory subjects, capped at 5.00. Any F in a compulsory subject → F.</p>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Academic calendar & holidays</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="Date" htmlFor="h-date"><Input id="h-date" type="date" value={hol.date} onChange={(e) => setHol({ ...hol, date: e.target.value })} /></Field>
                    <Field label="Title" htmlFor="h-title"><Input id="h-title" value={hol.title} onChange={(e) => setHol({ ...hol, title: e.target.value })} /></Field>
                    <NativeSelect label="Kind" value={hol.kind} onChange={(v) => setHol({ ...hol, kind: v as typeof hol.kind })} options={[{ value: "government", label: "Government holiday" }, { value: "school", label: "School holiday" }, { value: "exam", label: "Exam" }, { value: "event", label: "Event" }]} />
                    <Button disabled={!hol.date || !hol.title} onClick={() => addHol.mutate(undefined)}><Plus /> Add</Button>
                  </div>
                  <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {[...d.holidays].sort((a, b) => a.date.localeCompare(b.date)).map((h) => (
                      <li key={h.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
                        <span className="w-24 text-xs text-muted-foreground">{fmtDate(h.date)}</span>
                        <span className="flex-1 truncate">{h.title}</span>
                        <StatusBadge tone={h.kind === "government" || h.kind === "school" ? "info" : "neutral"}>{h.kind}</StatusBadge>
                        <Button size="icon-xs" variant="ghost" aria-label={`Remove ${h.title}`} onClick={() => delHol.mutate(h.id)}><Trash2 /></Button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">Government and school holidays are excluded from attendance, absence streaks and absent alerts. Dates are approximate in the demo — confirm against the official list.</p>
                </CardContent>
              </Card>
            </div>
          );
        }}
      </Async>
    </>
  );
}
