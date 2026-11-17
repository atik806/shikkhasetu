"use client";

import { LoadingBlock, PageHeader } from "@/components/shared";
import { ChildSwitcher, useChildren } from "@/features/parent/child";
import { StudentInvoices } from "@/features/fees/components/invoices";

export default function ParentFees() {
  const { selected } = useChildren();
  return (
    <>
      <PageHeader title="Fees & payment" description="Pay tuition and exam fees with bKash, Nagad, Rocket or card." />
      <ChildSwitcher />
      {selected ? <StudentInvoices key={selected.id} studentId={selected.id} /> : <LoadingBlock />}
    </>
  );
}
