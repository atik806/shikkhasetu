"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Async, EmptyState, NativeSelect, PageHeader } from "@/components/shared";
import { Register } from "@/features/attendance/components/register";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";
import { today } from "@/lib/time";

export default function TakeAttendance() {
  const q = useAppQuery(["my-sections"], () => services.attendance.mySections());
  const [section, setSection] = useState("");
  const [date, setDate] = useState(today());
  return (
    <>
      <PageHeader title="Take attendance" description="Daily register. Guardians of absent students get an SMS as soon as you submit." />
      <Async query={q}>
        {(secs) => {
          if (secs.length === 0) return <EmptyState title="No sections assigned" />;
          const ct = secs.find((s) => s.isClassTeacher);
          const sid = section || ct?.id || secs[0].id;
          return (
            <>
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <NativeSelect className="w-56" label="Section" value={sid} onChange={setSection} options={secs.map((s) => ({ value: s.id, label: `${s.label}${s.isClassTeacher ? " (class teacher)" : ""}` }))} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="att-date" className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input id="att-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
                </div>
              </div>
              <Register key={`${sid}:${date}`} sectionId={sid} date={date} />
            </>
          );
        }}
      </Async>
    </>
  );
}
