"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { HomeworkList } from "@/features/homework/components/homework-list";
import { useMe } from "@/lib/hooks";

export default function StudentHomework() {
  const me = useMe();
  const sid = me.data?.studentRecordId;
  return (
    <>
      <PageHeader title="Homework & diary" description="Tick items when you finish them. Your guardian can see this list." />
      {sid ? <HomeworkList studentId={sid} canMarkDone /> : <LoadingBlock />}
    </>
  );
}
