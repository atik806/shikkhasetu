"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Async, EmptyState, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDate, fmtTime } from "@/lib/time";

export default function ParentMeetings() {
  const q = useAppQuery(["parent-slots"], () => services.messaging.slotsForParent());
  const [slot, setSlot] = useState<string | null>(null);
  const [child, setChild] = useState("");
  const [note, setNote] = useState("");
  const book = useAction((i: { slotId: string; studentId: string; note: string }) => services.messaging.book(i), { success: "Meeting booked. The teacher has been told.", onSuccess: () => { setSlot(null); setNote(""); } });
  const cancel = useAction((id: string) => services.messaging.cancelBooking(id), { success: "Booking cancelled" });
  return (
    <>
      <PageHeader title="Parent–teacher meetings" description="Book a 15-minute slot published by your child's teachers." />
      <Async query={q}>
        {(d) => {
          const mine = d.slots.filter((s) => s.mine);
          const open = d.slots.filter((s) => !s.mine);
          const byDay = new Map<string, typeof open>();
          open.forEach((s) => byDay.set(s.start.slice(0, 10), [...(byDay.get(s.start.slice(0, 10)) ?? []), s]));
          return (
            <div className="space-y-5">
              {mine.length > 0 ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">Your bookings</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {mine.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                        <span><b>{fmtDate(s.start, "EEE d MMM")}, {fmtTime(s.start)}</b> with {s.teacherName} · about {s.studentName}</span>
                        <Button size="sm" variant="outline" onClick={() => cancel.mutate(s.id)}>Cancel</Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
              {open.length === 0 ? <EmptyState icon={<CalendarClock />} title="No open slots right now" description="Teachers publish slots each week. You can also send a message." /> : (
                [...byDay].map(([day, slots]) => (
                  <Card key={day}>
                    <CardHeader><CardTitle className="text-base">{fmtDate(day, "EEEE, d MMMM")}</CardTitle></CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {slots.map((s) => (
                        <Button key={s.id} variant="outline" className="h-auto flex-col items-start py-2" onClick={() => { setSlot(s.id); setChild(d.children[0]?.id ?? ""); }}>
                          <span className="font-semibold">{fmtTime(s.start)}</span>
                          <span className="text-xs text-muted-foreground">{s.teacherName}</span>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
              <Dialog open={Boolean(slot)} onOpenChange={(o) => !o && setSlot(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Book this slot</DialogTitle></DialogHeader>
                  <NativeSelect label="About" value={child} onChange={setChild} options={d.children.map((c) => ({ value: c.id, label: c.name }))} />
                  <Field label="What would you like to discuss?" htmlFor="mt-note"><Textarea id="mt-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSlot(null)}>Cancel</Button>
                    <Button disabled={!child || book.isPending} onClick={() => slot && book.mutate({ slotId: slot, studentId: child, note })}>Book</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <p className="text-xs text-muted-foreground"><StatusBadge tone="info">Tip</StatusBadge> After acknowledging a result you can tick “I want to meet the class teacher”.</p>
            </div>
          );
        }}
      </Async>
    </>
  );
}
