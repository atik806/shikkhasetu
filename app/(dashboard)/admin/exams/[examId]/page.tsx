"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Async, DataTable, PageHeader, Status, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/time";

export default function ExamStatus() {
  const { examId } = useParams<{ examId: string }>();
  const q = useAppQuery(["exam-status", examId], () => services.results.examStatus(examId));
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const publish = useAction(() => services.results.publish(examId, selected), {
    success: (n) => `Published ${n} results. Guardians are getting an SMS to review and acknowledge.`,
    onSuccess: () => { setSelected([]); setConfirm(false); },
  });
  return (
    <Async query={q}>
      {(d) => {
        const locked = d.sections.filter((s) => s.state === "LOCKED").map((s) => s.sectionId);
        return (
          <>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/admin/exams" />}><ArrowLeft /> Exams</Button>
            <PageHeader
              title={d.exam.name}
              description="Only sections locked by their class teacher can be published."
              actions={
                <>
                  <Button variant="outline" onClick={() => setSelected(locked)} disabled={locked.length === 0}>Select all ready ({locked.length})</Button>
                  <Button onClick={() => setConfirm(true)} disabled={selected.length === 0}><Send /> Publish {selected.length || ""}</Button>
                </>
              }
            />
            <DataTable
              rows={d.sections}
              rowKey={(r) => r.sectionId}
              pageSize={30}
              columns={[
                { key: "sel", header: <span className="sr-only">Select</span>, cell: (r) => <Checkbox aria-label={`Select ${r.label}`} disabled={r.state !== "LOCKED"} checked={selected.includes(r.sectionId)} onCheckedChange={(v) => setSelected((l) => (v ? [...l, r.sectionId] : l.filter((x) => x !== r.sectionId)))} /> },
                { key: "sec", header: "Section", cell: (r) => <span className="font-medium">{r.label}<span className="block text-xs font-normal text-muted-foreground">{r.classTeacher}</span></span>, sortValue: (r) => r.label },
                { key: "sub", header: "Subjects submitted", cell: (r) => `${r.submitted}/${r.subjects}`, sortValue: (r) => r.submitted / Math.max(1, r.subjects) },
                { key: "state", header: "Workflow", cell: (r) => <Status value={r.workflow} />, sortValue: (r) => r.workflow },
                { key: "pub", header: "Published", cell: (r) => (r.publishedAt ? fmtDateTime(r.publishedAt) : "—") },
                { key: "ack", header: "Acknowledged", cell: (r) => (r.ackRate === null ? "—" : <StatusBadge tone={r.ackRate >= 80 ? "success" : r.ackRate >= 50 ? "warning" : "danger"}>{r.ackRate}%</StatusBadge>), sortValue: (r) => r.ackRate ?? -1 },
              ]}
            />
            <ReasonDialog open={confirm} onOpenChange={setConfirm} title={`Publish ${selected.length} section(s)?`} description="Every guardian gets an in-app notice and SMS. Published results can only be changed with a correction (reason required, guardians re-notified)." requireReason={false} confirmLabel="Publish" pending={publish.isPending} onConfirm={() => publish.mutate(undefined)} />
          </>
        );
      }}
    </Async>
  );
}
