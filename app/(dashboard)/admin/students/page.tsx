"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Async, DataTable, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { downloadCsv, useAction, useAppQuery } from "@/lib/hooks";
import { isValidBdPhone } from "@/lib/phone";

type G = { name: string; phone: string; relation: "father" | "mother" | "guardian"; hasSmartphone: boolean };

function AdmitDialog({ open, onOpenChange, sections }: { open: boolean; onOpenChange: (o: boolean) => void; sections: { id: string; label: string }[] }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [dob, setDob] = useState("2014-01-01");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [guardians, setGuardians] = useState<G[]>([{ name: "", phone: "", relation: "father", hasSmartphone: true }]);
  const admit = useAction((i: Parameters<typeof services.school.admitStudent>[0]) => services.school.admitStudent(i), {
    success: (r) => `Admitted · Student ID ${r.studentCode}. Print activation slips from Guardians.`,
    onSuccess: () => { onOpenChange(false); setName(""); setGuardians([{ name: "", phone: "", relation: "father", hasSmartphone: true }]); },
  });
  const phonesOk = guardians.every((g) => g.name.trim() && isValidBdPhone(g.phone));
  const setG = (i: number, p: Partial<G>) => setGuardians((list) => list.map((g, j) => (j === i ? { ...g, ...p } : g)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Admit a student</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" htmlFor="ad-name"><Input id="ad-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <NativeSelect label="Section" value={sectionId} onChange={setSectionId} options={sections.map((s) => ({ value: s.id, label: s.label }))} />
          <NativeSelect label="Gender" value={gender} onChange={(v) => setGender(v as "male" | "female")} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
          <Field label="Date of birth" htmlFor="ad-dob"><Input id="ad-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Guardians (1–3) — from the admission form. Parent accounts are created only here.</p>
          {guardians.map((g, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Input aria-label="Guardian name" placeholder="Name" value={g.name} onChange={(e) => setG(i, { name: e.target.value })} />
              <Input aria-label="Guardian phone" placeholder="01XXXXXXXXX" inputMode="tel" value={g.phone} onChange={(e) => setG(i, { phone: e.target.value })} aria-invalid={g.phone.length > 0 && !isValidBdPhone(g.phone)} />
              <NativeSelect hideLabel label="Relation" value={g.relation} onChange={(v) => setG(i, { relation: v as G["relation"] })} options={[{ value: "father", label: "Father" }, { value: "mother", label: "Mother" }, { value: "guardian", label: "Guardian" }]} />
              <label className="flex items-center gap-2 text-xs sm:col-span-2"><Checkbox checked={g.hasSmartphone} onCheckedChange={(v) => setG(i, { hasSmartphone: Boolean(v) })} /> Has a smartphone</label>
              {guardians.length > 1 ? <Button size="icon-sm" variant="ghost" aria-label="Remove guardian" onClick={() => setGuardians((l) => l.filter((_, j) => j !== i))}><Trash2 /></Button> : null}
            </div>
          ))}
          {guardians.length < 3 ? <Button size="sm" variant="outline" onClick={() => setGuardians((l) => [...l, { name: "", phone: "", relation: "mother", hasSmartphone: true }])}><Plus /> Add guardian</Button> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim() || !phonesOk || admit.isPending} onClick={() => admit.mutate({ name: name.trim(), gender, dob, sectionId, guardians })}>Admit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStudents() {
  const overview = useAppQuery(["overview"], () => services.school.overview());
  const [section, setSection] = useState("all");
  const [status, setStatus] = useState("active");
  const q = useAppQuery(["students", section, status], () => services.school.students({ sectionId: section, status: status as "active" }));
  const [open, setOpen] = useState(false);
  const sections = (overview.data?.sections ?? []).map((s) => ({ id: s.id, label: s.label }));
  return (
    <>
      <PageHeader
        title="Students"
        actions={
          <>
            <Button variant="outline" onClick={() => q.data && downloadCsv("students.csv", [["student_id", "name", "section", "roll", "attendance_%"], ...q.data.map((s) => [s.studentId, s.name, s.sectionLabel, s.roll, s.attendance])])}><Download /> CSV</Button>
            <Button onClick={() => setOpen(true)} disabled={!sections.length}><Plus /> Admit student</Button>
          </>
        }
      />
      <Async query={q}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.name} ${r.studentId}`}
            toolbar={
              <>
                <NativeSelect className="w-44" label="Section" value={section} onChange={setSection} options={[{ value: "all", label: "All sections" }, ...sections.map((s) => ({ value: s.id, label: s.label }))]} />
                <NativeSelect className="w-36" label="Status" value={status} onChange={setStatus} options={[{ value: "active", label: "Active" }, { value: "transferred", label: "Transferred" }, { value: "left", label: "Left" }, { value: "all", label: "All" }]} />
              </>
            }
            columns={[
              { key: "name", header: "Name", cell: (r) => <Link className="font-medium hover:underline" href={`/admin/students/${r.id}`}>{r.name}</Link>, sortValue: (r) => r.name },
              { key: "id", header: "Student ID", cell: (r) => <span className="font-mono text-xs">{r.studentId}</span>, sortValue: (r) => r.studentId },
              { key: "sec", header: "Section", cell: (r) => `${r.sectionLabel} · ${r.roll}`, sortValue: (r) => `${r.sectionLabel}${String(r.roll).padStart(3, "0")}` },
              { key: "att", header: "Attendance", cell: (r) => <StatusBadge tone={r.attendance >= 90 ? "success" : r.attendance >= 75 ? "warning" : "danger"}>{r.attendance}%</StatusBadge>, sortValue: (r) => r.attendance },
              { key: "g", header: "Guardians", cell: (r) => <span className="text-xs">{r.guardians.map((g) => `${g.name.split(" ").slice(-1)[0]} (${g.relation[0].toUpperCase()}${g.status === "invited" ? ", not active" : ""})`).join(", ")}</span> },
            ]}
          />
        )}
      </Async>
      {open ? <AdmitDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) toast.dismiss(); }} sections={sections} /> : null}
    </>
  );
}
