"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { MonthCalendar } from "@/features/attendance/components/month-calendar";
import { useMe } from "@/lib/hooks";

export default function StudentAttendance() {
  const me = useMe();
  const sid = me.data?.studentRecordId;
  return (
    <>
      <PageHeader title="My attendance" />
      {sid ? <MonthCalendar studentId={sid} /> : <LoadingBlock />}
    </>
  );
}
