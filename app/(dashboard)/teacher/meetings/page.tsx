"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Async, EmptyState, Field, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { addDaysISO, dhakaDateTime, fmtDate, fmtTime, today } from "@/lib/time";

export default function TeacherMeetings() {
  const q = useAppQuery(["my-slots"], () => services.messaging.mySlots());
  const [date, setDate] = useState(addDaysISO(today(), 1));
  const [from, setFrom] = useState("12:15");
  const [count, setCount] = useState(4);
  const add = useAction(() => {
    const [h, m] = from.split(":").map(Number);
    const starts = Array.from({ length: count }, (_, i) => {
      const t = h * 60 + m + i * 15;
      return dhakaDateTime(date, `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    });
    return services.messaging.addSlots({ startISO: starts, minutes: 15 });
  }, { success: "Slots published. Guardians can book them now." });
  const remove = useAction((id: string) => services.messaging.removeSlot(id), { success: "Slot removed" });
  return (
    <>
      <PageHeader title="Meeting slots" description="Publish 15-minute slots. Guardians book them from their app." />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Add slots</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Date" htmlFor="ms-date"><Input id="ms-date" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Start time" htmlFor="ms-from"><Input id="ms-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="Number of 15-minute slots" htmlFor="ms-count"><Input id="ms-count" type="number" min={1} max={12} value={count} onChange={(e) => setCount(Math.max(1, Math.min(12, Number(e.target.value))))} /></Field>
            <Button className="w-full" onClick={() => add.mutate(undefined)} disabled={add.isPending}><Plus /> Publish slots</Button>
          </CardContent>
        </Card>
        <Async query={q}>
          {(slots) => slots.length === 0 ? <EmptyState title="No upcoming slots" /> : (
            <Card>
              <CardContent>
                <ul className="divide-y">
                  {slots.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                      <span className="w-40 font-medium">{fmtDate(s.start, "EEE d MMM")}, {fmtTime(s.start)}</span>
                      {s.bookedBy ? <span className="flex-1"><StatusBadge tone="success">Booked</StatusBadge> {s.bookedByName} · {s.studentName}{s.note ? ` — “${s.note}”` : ""}</span> : <span className="flex-1 text-muted-foreground">Open</span>}
                      <Button size="icon-sm" variant="ghost" aria-label="Remove slot" onClick={() => remove.mutate(s.id)}><Trash2 /></Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </Async>
      </div>
    </>
  );
}
