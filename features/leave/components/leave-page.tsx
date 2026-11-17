"use client";

import { useState } from "react";
import { Check, Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Async, EmptyState, Field, NativeSelect, PageHeader, Status } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { useChildren } from "@/features/parent/child";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { useSession } from "@/lib/auth/session";
import { fmtDate, fmtDateTime, today } from "@/lib/time";

function RequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { children, selected } = useChildren();
  const [studentId, setStudentId] = useState("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [reason, setReason] = useState("");
  const [file, setFile] = useState("");
  const submit = useAction((i: Parameters<typeof services.leave.submit>[0]) => services.leave.submit(i), { success: "Leave request sent to the class teacher", onSuccess: () => { onOpenChange(false); setReason(""); } });
  const sid = studentId || selected?.id || "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <NativeSelect label="Child" value={sid} onChange={setStudentId} options={children.map((c) => ({ value: c.id, label: `${c.name} (${c.sectionLabel})` }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="lv-from"><Input id="lv-from" type="date" min={today()} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} /></Field>
            <Field label="To" htmlFor="lv-to"><Input id="lv-to" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <Field label="Reason" htmlFor="lv-reason"><Textarea id="lv-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <Field label="Doctor's note photo (optional)" htmlFor="lv-file" hint="Simulated — only the file name is kept."><Input id="lv-file" type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} /></Field>
          <p className="text-xs text-muted-foreground">Approved leave is marked as “Leave” in the register, and you will not get absent alerts for those days.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!sid || reason.trim().length < 5 || submit.isPending} onClick={() => submit.mutate({ studentId: sid, from, to, reason: reason.trim(), attachmentName: file || undefined })}>Send request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeavePage() {
  const role = useSession((s) => s.role);
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const q = useAppQuery(["leaves"], () => services.leave.list());
  const decide = useAction((i: { leaveId: string; approve: boolean; note?: string }) => services.leave.decide(i), { success: "Decision sent to the guardians", onSuccess: () => setRejecting(null) });
  return (
    <>
      <PageHeader
        title="Leave"
        description={role === "parent" ? "Tell the class teacher in advance when your child will be away." : "Approve or reject leave requests from guardians."}
        actions={role === "parent" ? <Button onClick={() => setOpen(true)}><Plus /> Request leave</Button> : null}
      />
      <Async query={q}>
        {(rows) =>
          rows.length === 0 ? <EmptyState title="No leave requests" /> : (
            <ul className="space-y-2">
              {rows.map((l) => (
                <li key={l.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{l.studentName}</p>
                          <span className="text-xs text-muted-foreground">{l.sectionLabel}</span>
                          <Status value={l.status} />
                        </div>
                        <p className="text-sm">{fmtDate(l.from)}{l.to !== l.from ? ` → ${fmtDate(l.to)}` : ""}: {l.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested by {l.requestedByName} · {fmtDateTime(l.createdAt)}
                          {l.attachmentName ? <span className="ml-2 inline-flex items-center gap-1"><Paperclip className="size-3" />{l.attachmentName}</span> : null}
                          {l.decidedByName !== "—" ? ` · ${l.status} by ${l.decidedByName}` : ""}
                          {l.decisionNote ? ` — “${l.decisionNote}”` : ""}
                        </p>
                      </div>
                      {l.canDecide ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setRejecting(l.id)}><X /> Reject</Button>
                          <Button size="sm" onClick={() => decide.mutate({ leaveId: l.id, approve: true })} disabled={decide.isPending}><Check /> Approve</Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </Async>
      {role === "parent" ? <RequestDialog open={open} onOpenChange={setOpen} /> : null}
      <ReasonDialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)} title="Reject leave request" description="The guardians will see your note." confirmLabel="Reject" destructive pending={decide.isPending} onConfirm={(note) => rejecting && decide.mutate({ leaveId: rejecting, approve: false, note })} />
    </>
  );
}
