"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRightLeft, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { StudentProfile } from "@/features/students/student-profile";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";

export default function AdminStudent() {
  const { id } = useParams<{ id: string }>();
  const overview = useAppQuery(["overview"], () => services.school.overview());
  const [transfer, setTransfer] = useState(false);
  const [to, setTo] = useState("");
  const [leave, setLeave] = useState(false);
  const doTransfer = useAction((reason: string) => services.school.transferStudent(id, to, reason), { success: "Section changed (audited)", onSuccess: () => setTransfer(false) });
  const doLeave = useAction((reason: string) => services.school.setStudentStatus(id, "transferred", reason), { success: "Marked as transferred out", onSuccess: () => setLeave(false) });
  const sections = overview.data?.sections ?? [];
  return (
    <>
      <StudentProfile
        id={id}
        backHref="/admin/students"
        resultHrefBase="/admin/results"
        extraActions={
          <>
            <Button variant="outline" size="sm" onClick={() => { setTo(sections[0]?.id ?? ""); setTransfer(true); }}><ArrowRightLeft /> Change section</Button>
            <Button variant="outline" size="sm" onClick={() => setLeave(true)}><UserMinus /> Transfer out</Button>
          </>
        }
      />
      <ReasonDialog open={transfer} onOpenChange={setTransfer} title="Move to another section" pending={doTransfer.isPending} onConfirm={(r) => doTransfer.mutate(r)}>
        <NativeSelect label="New section" value={to} onChange={setTo} options={sections.map((s) => ({ value: s.id, label: s.label }))} />
      </ReasonDialog>
      <ReasonDialog open={leave} onOpenChange={setLeave} title="Transfer the student out of this school" description="The record is kept; the student no longer appears in registers." destructive pending={doLeave.isPending} onConfirm={(r) => doLeave.mutate(r)} />
    </>
  );
}
