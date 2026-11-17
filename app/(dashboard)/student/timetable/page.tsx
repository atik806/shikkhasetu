"use client";

import { Async, PageHeader } from "@/components/shared";
import { TimetableGrid } from "@/features/timetable/components/timetable-grid";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";

export default function StudentTimetable() {
  const info = useAppQuery(["my-student"], () => services.reports.myStudent());
  const tt = useAppQuery(["tt", info.data?.sectionId], () => services.timetable.section(info.data!.sectionId), { enabled: Boolean(info.data) });
  return (
    <>
      <PageHeader title="Class routine" description={tt.data ? `${tt.data.label} · ${tt.data.shift?.name} shift (${tt.data.shift?.startTime}–${tt.data.shift?.endTime})` : undefined} />
      <Async query={tt}>{(d) => <TimetableGrid slots={d.slots} mode="section" />}</Async>
    </>
  );
}
