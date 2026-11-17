"use client";

import { Async, PageHeader } from "@/components/shared";
import { TimetableGrid } from "@/features/timetable/components/timetable-grid";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";

export default function TeacherTimetable() {
  const q = useAppQuery(["teacher-tt"], () => services.timetable.teacher());
  return (
    <>
      <PageHeader title="My routine" description="Your periods across all sections." />
      <Async query={q}>{(slots) => <TimetableGrid slots={slots} mode="teacher" />}</Async>
    </>
  );
}
