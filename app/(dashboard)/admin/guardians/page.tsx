"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { KeyRound, PhoneCall, Printer, ShieldCheck, TicketCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Async, DataTable, Field, NativeSelect, PageHeader, Status, StatusBadge } from "@/components/shared";
import { CodeInput, ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { isValidBdPhone } from "@/lib/phone";
import { fmtDate } from "@/lib/time";

type Row = Awaited<ReturnType<typeof services.school.guardians>>[number];
type Slip = Awaited<ReturnType<typeof services.school.issueSlip>>;

function SlipDialog({ slip, onClose }: { slip: Slip; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Activation slip</DialogTitle></DialogHeader>
        <div id="slip" className="space-y-2 rounded-lg border-2 border-dashed p-4 text-sm">
          <p className="font-semibold">{slip.school}</p>
          <p>Guardian: <b>{slip.name}</b> · {slip.phoneMasked}</p>
          <p className="text-xs">For: {slip.children.join(", ")}</p>
          <div className="flex items-center gap-3">
            <div className="rounded bg-white p-1"><QRCodeSVG value={slip.code} size={72} /></div>
            <p className="font-mono text-2xl font-bold tracking-widest">{slip.code}</p>
          </div>
          <p className="text-xs font-semibold text-danger">Do not give this slip to your child. Activate at the school office.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivateDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const [slip, setSlip] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const act = useAction(() => services.school.activateInPerson({ guardianUserId: row.id, slipCode: slip, password, pin }), { success: "Account activated in person", onSuccess: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activate in person — {row.name}</DialogTitle>
          <DialogDescription>Hand the device to the guardian. They type their own password and PIN. Check their NID first.</DialogDescription>
        </DialogHeader>
        <Field label="Code on the activation slip" htmlFor="ap-slip"><Input id="ap-slip" value={slip} onChange={(e) => setSlip(e.target.value.toUpperCase())} placeholder={row.slip ? "e.g. " + "ABCD-EFGH" : "Issue a slip first"} /></Field>
        <Field label="Guardian's new password (8+)" htmlFor="ap-pw"><Input id="ap-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <CodeInput id="ap-pin" length={6} value={pin} onChange={setPin} label="Guardian's parent PIN (4–6 digits)" masked />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!slip || password.length < 8 || pin.length < 4 || act.isPending} onClick={() => act.mutate(undefined)}>Activate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminGuardians() {
  const [q, setQ] = useState("");
  const list = useAppQuery(["guardians", q], () => services.school.guardians(q));
  const [slip, setSlip] = useState<Slip | null>(null);
  const [activate, setActivate] = useState<Row | null>(null);
  const [phoneFor, setPhoneFor] = useState<Row | null>(null);
  const [newPhone, setNewPhone] = useState("");
  const [method, setMethod] = useState<"in_person_nid" | "call_old_number">("in_person_nid");
  const [pinFor, setPinFor] = useState<Row | null>(null);
  const [newPin, setNewPin] = useState("");
  const issue = useAction((id: string) => services.school.issueSlip(id), { onSuccess: (s) => setSlip(s) });
  const change = useAction((reason: string) => services.school.changeGuardianPhone({ guardianUserId: phoneFor!.id, newPhone, reason, method }), { success: "Phone changed. The old number was notified; acknowledgments for 7 days will be flagged.", onSuccess: () => { setPhoneFor(null); setNewPhone(""); } });
  const resetPin = useAction((reason: string) => services.school.resetPin({ guardianUserId: pinFor!.id, newPin, reason }), { success: "PIN reset. All guardians were notified.", onSuccess: () => { setPinFor(null); setNewPin(""); } });
  return (
    <>
      <PageHeader title="Guardians" description="Only the office links guardians, activates accounts and changes registered phone numbers. This is the foundation of trustworthy acknowledgments." />
      <div className="mb-3 max-w-sm"><Input aria-label="Search guardians" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Async query={list}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: "name", header: "Guardian", cell: (r) => <span className="font-medium">{r.name}<span className="block text-xs font-normal text-muted-foreground">{r.phoneMasked}{r.hasSmartphone ? "" : " · feature phone"}</span></span>, sortValue: (r) => r.name },
              { key: "kids", header: "Children", cell: (r) => <span className="text-xs">{r.children.map((c) => `${c.name} (${c.section}, ${c.relation})`).join("; ")}</span> },
              { key: "status", header: "Account", cell: (r) => (
                <span className="flex flex-wrap gap-1">
                  <Status value={r.status} />
                  {r.activation?.method === "remote" ? <StatusBadge tone="warning">Remote</StatusBadge> : r.activation ? <StatusBadge tone="success">In person {fmtDate(r.activation.at)}</StatusBadge> : null}
                  {r.phoneChangedAt ? <StatusBadge tone="warning">Phone changed {fmtDate(r.phoneChangedAt)}</StatusBadge> : null}
                </span>
              ) },
              { key: "act", header: "", cell: (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.status === "invited" ? (
                    <>
                      <Button size="xs" variant="outline" onClick={() => issue.mutate(r.id)}><TicketCheck /> Slip</Button>
                      <Button size="xs" variant="outline" onClick={() => setActivate(r)}><ShieldCheck /> Activate</Button>
                    </>
                  ) : null}
                  <Button size="xs" variant="ghost" onClick={() => setPhoneFor(r)}><PhoneCall /> Phone</Button>
                  {r.status === "active" ? <Button size="xs" variant="ghost" onClick={() => setPinFor(r)}><KeyRound /> PIN</Button> : null}
                </div>
              ) },
            ]}
          />
        )}
      </Async>
      {slip ? <SlipDialog slip={slip} onClose={() => setSlip(null)} /> : null}
      {activate ? <ActivateDialog row={activate} onClose={() => setActivate(null)} /> : null}
      <ReasonDialog open={Boolean(phoneFor)} onOpenChange={(o) => !o && setPhoneFor(null)} title={`Change registered phone — ${phoneFor?.name ?? ""}`} description="Only after verifying the guardian. The OLD number gets an SMS, other guardians are told, devices are signed out, and acknowledgments for the next 7 days are flagged." pending={change.isPending} onConfirm={(r) => (isValidBdPhone(newPhone) ? change.mutate(r) : undefined)}>
        <Field label="New mobile number" htmlFor="np" error={newPhone && !isValidBdPhone(newPhone) ? "Not a valid Bangladeshi mobile number" : undefined}><Input id="np" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
        <NativeSelect label="How did you verify?" value={method} onChange={(v) => setMethod(v as typeof method)} options={[{ value: "in_person_nid", label: "In person with NID" }, { value: "call_old_number", label: "Called the old number and confirmed" }]} />
      </ReasonDialog>
      <ReasonDialog open={Boolean(pinFor)} onOpenChange={(o) => !o && setPinFor(null)} title={`Reset parent PIN — ${pinFor?.name ?? ""}`} description="In person only. Every guardian of the children is notified." pending={resetPin.isPending} onConfirm={(r) => (newPin.length >= 4 ? resetPin.mutate(r) : undefined)}>
        <CodeInput id="rp" length={6} value={newPin} onChange={setNewPin} label="New PIN typed by the guardian" masked />
      </ReasonDialog>
    </>
  );
}
