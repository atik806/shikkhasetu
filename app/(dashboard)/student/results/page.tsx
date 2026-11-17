"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { ResultsList } from "@/features/results/components/results-list";
import { useMe } from "@/lib/hooks";

export default function StudentResults() {
  const me = useMe();
  const sid = me.data?.studentRecordId;
  return (
    <>
      <PageHeader title="My results" description="Your guardian reviews and acknowledges each result in their own app." />
      {sid ? <ResultsList studentId={sid} hrefBase="/student/results" /> : <LoadingBlock />}
    </>
  );
}
