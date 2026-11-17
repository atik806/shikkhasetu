"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { ChildSwitcher, useChildren } from "@/features/parent/child";
import { ResultsList } from "@/features/results/components/results-list";

export default function ParentResults() {
  const { selected } = useChildren();
  return (
    <>
      <PageHeader title="Results" description="Open a result to review it and acknowledge with your PIN." />
      <ChildSwitcher />
      {selected ? <ResultsList key={selected.id} studentId={selected.id} hrefBase="/parent/results" showMine /> : <LoadingBlock />}
    </>
  );
}
