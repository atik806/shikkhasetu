"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { ChildSwitcher, useChildren } from "@/features/parent/child";
import { MonthCalendar } from "@/features/attendance/components/month-calendar";

export default function ParentAttendance() {
  const { selected } = useChildren();
  return (
    <>
      <PageHeader title="Attendance" description={selected ? `${selected.name} · ${selected.sectionLabel}` : undefined} />
      <ChildSwitcher />
      {selected ? <MonthCalendar key={selected.id} studentId={selected.id} /> : <LoadingBlock />}
    </>
  );
}
