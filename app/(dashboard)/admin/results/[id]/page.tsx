"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { ResultPage } from "@/features/results/components/result-page";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";

/** Admin view of a published result, with the correction flow. */
export default function AdminResult() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useAppQuery(["result", id], () => services.results.resultDetail(id));
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [component, setComponent] = useState("");
  const [value, setValue] = useState("");
  const correct = useAction((reason: string) => services.results.correct({ resultVersionId: id, subjectId: subject, component, value: value.trim().toUpperCase() === "AB" ? "AB" : Number(value), reason }), {
    success: "Corrected. A new version was published and guardians must acknowledge again.",
    onSuccess: (newId) => { setOpen(false); router.replace(`/admin/results/${newId}`); },
  });
  const subjects = q.data?.result.subjects ?? [];
  const sub = subjects.find((s) => s.subjectId === subject) ?? subjects[0];
  const comp = sub?.components.find((c) => c.key === component) ?? sub?.components[0];
  return (
    <>
      {q.data?.result.state === "PUBLISHED" ? (
        <div className="mb-3 flex justify-end print:hidden">
          <Button variant="outline" onClick={() => { setSubject(subjects[0]?.subjectId ?? ""); setComponent(subjects[0]?.components[0]?.key ?? ""); setOpen(true); }}><PencilLine /> Correct a mark</Button>
        </div>
      ) : null}
      <ResultPage id={id} backHref="/admin/students" />
      <ReasonDialog open={open} onOpenChange={setOpen} minLength={10} title="Correct a published result" description="Creates a new version, keeps the old one in history, resets acknowledgment and re-notifies guardians by SMS." pending={correct.isPending} onConfirm={(r) => correct.mutate(r)}>
        <NativeSelect label="Subject" value={sub?.subjectId ?? ""} onChange={(v) => { setSubject(v); setComponent(subjects.find((s) => s.subjectId === v)?.components[0]?.key ?? ""); }} options={subjects.map((s) => ({ value: s.subjectId, label: `${s.name} (${s.obtained}/${s.fullMarks})` }))} />
        {sub && sub.components.length > 1 ? <NativeSelect label="Part" value={comp?.key ?? ""} onChange={setComponent} options={sub.components.map((c) => ({ value: c.key, label: `${c.label} /${c.fullMarks}` }))} /> : null}
        <Field label={`New mark (0–${comp?.fullMarks ?? "?"} or AB)`} htmlFor="corr-val"><Input id="corr-val" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      </ReasonDialog>
    </>
  );
}
