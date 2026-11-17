"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { ChildSwitcher, useChildren } from "@/features/parent/child";
import { HomeworkList } from "@/features/homework/components/homework-list";

export default function ParentHomework() {
  const { selected } = useChildren();
  return (
    <>
      <PageHeader title="Homework & diary" description="What teachers gave in the last two weeks. Your child marks items as done." />
      <ChildSwitcher />
      {selected ? <HomeworkList key={selected.id} studentId={selected.id} /> : <LoadingBlock />}
    </>
  );
}
