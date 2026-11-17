"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Async, PageHeader } from "@/components/shared";
import { IdCard } from "@/features/students/id-card";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";

export default function StudentIdCard() {
  const q = useAppQuery(["my-student"], () => services.reports.myStudent());
  return (
    <>
      <PageHeader className="print:hidden" title="Digital ID card" description="Show this QR code at the gate. Your guardian gets a message when you check in." actions={<Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>} />
      <Async query={q}>{(s) => <IdCard s={s} />}</Async>
    </>
  );
}
