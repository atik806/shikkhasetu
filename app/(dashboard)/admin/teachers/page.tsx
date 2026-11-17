"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Async, DataTable, Field, NativeSelect, PageHeader, Status, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { isValidBdPhone } from "@/lib/phone";

export default function AdminTeachers() {
  const q = useAppQuery(["teachers"], () => services.school.teachers());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teacher" | "gate_staff" | "school_admin">("teacher");
  const [temp, setTemp] = useState<string | null>(null);
  const create = useAction((i: Parameters<typeof services.school.createStaff>[0]) => services.school.createStaff(i), { onSuccess: (r) => { setTemp(r.tempPassword); setName(""); setPhone(""); setEmail(""); } });
  return (
    <>
      <PageHeader title="Teachers & staff" description="Assign subjects and class teachers on the Classes page." actions={<Button onClick={() => { setTemp(null); setOpen(true); }}><Plus /> Add staff</Button>} />
      <Async query={q}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.name} ${r.email ?? ""}`}
            columns={[
              { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}<span className="block text-xs font-normal text-muted-foreground">{r.phoneMasked} · {r.email}</span></span>, sortValue: (r) => r.name },
              { key: "ct", header: "Class teacher of", cell: (r) => r.classTeacherOf.map((c) => <StatusBadge key={c} tone="info" className="mr-1">{c}</StatusBadge>) },
              { key: "load", header: "Subjects taught", cell: (r) => <span className="text-xs">{r.assignments.length} · {[...new Set(r.assignments.map((a) => a.subjectName))].join(", ")}</span>, sortValue: (r) => r.assignments.length },
              { key: "roles", header: "Roles", cell: (r) => <span className="text-xs">{r.roles.join(", ")}</span> },
              { key: "st", header: "Status", cell: (r) => <Status value={r.status} /> },
            ]}
          />
        )}
      </Async>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add staff account</DialogTitle>
            <DialogDescription>A temporary password is generated. Give it to the person privately; they change it on first sign-in.</DialogDescription>
          </DialogHeader>
          {temp ? (
            <p className="rounded-lg bg-success/10 p-3 text-sm">Created. Temporary password: <b className="font-mono">{temp}</b></p>
          ) : (
            <div className="space-y-3">
              <Field label="Name" htmlFor="st-name"><Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Mobile" htmlFor="st-phone" error={phone && !isValidBdPhone(phone) ? "Invalid number" : undefined}><Input id="st-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label="Email (optional)" htmlFor="st-email"><Input id="st-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <NativeSelect label="Role" value={role} onChange={(v) => setRole(v as typeof role)} options={[{ value: "teacher", label: "Teacher" }, { value: "gate_staff", label: "Gate staff" }, { value: "school_admin", label: "School admin" }]} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {!temp ? <Button disabled={!name.trim() || !isValidBdPhone(phone) || create.isPending} onClick={() => create.mutate({ name: name.trim(), phone, email: email || undefined, role })}>Create</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
