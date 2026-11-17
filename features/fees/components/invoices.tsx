"use client";

import { useState } from "react";
import { CreditCard, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Async, EmptyState, Field, Status, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useNum } from "@/lib/hooks";
import { useSession } from "@/lib/auth/session";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Payment } from "@/types";

const METHODS: { id: Payment["method"]; label: string; color: string }[] = [
  { id: "bkash", label: "bKash", color: "bg-[#e2136e] text-white" },
  { id: "nagad", label: "Nagad", color: "bg-[#f6921e] text-white" },
  { id: "rocket", label: "Rocket", color: "bg-[#8c3494] text-white" },
  { id: "card", label: "Card", color: "bg-slate-700 text-white" },
];

function ReceiptDialog({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const n = useNum();
  const q = useAppQuery(["receipt", paymentId], () => services.fees.receipt(paymentId));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Money receipt</DialogTitle></DialogHeader>
        <Async query={q}>
          {(r) => (
            <div className="space-y-1 text-sm" id="receipt">
              <p className="font-semibold">{r.school}</p>
              <p>{r.student} · {r.studentCode} · {r.section}</p>
              <p>{r.invoice.title}</p>
              <p className="text-2xl font-semibold">৳{n(r.payment.amount)}</p>
              <p className="text-muted-foreground">{r.payment.method.toUpperCase()} · TrxID {r.payment.trxId}</p>
              <p className="text-muted-foreground">{fmtDateTime(r.payment.at)} · paid by {r.paidBy}</p>
            </div>
          )}
        </Async>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StudentInvoices({ studentId }: { studentId: string }) {
  const n = useNum();
  const role = useSession((s) => s.role);
  const q = useAppQuery(["invoices", studentId], () => services.fees.studentInvoices(studentId));
  const [payFor, setPayFor] = useState<{ id: string; title: string; due: number } | null>(null);
  const [method, setMethod] = useState<Payment["method"]>("bkash");
  const [wallet, setWallet] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const pay = useAction((i: { invoiceId: string; method: Payment["method"] }) => services.fees.pay(i), {
    success: (p) => `Paid ৳${p.amount} — TrxID ${p.trxId}`,
    onSuccess: (p) => { setPayFor(null); setReceipt(p.id); },
  });
  const canPay = role === "parent";
  return (
    <Async query={q}>
      {(rows) => {
        const due = rows.filter((r) => r.status !== "paid");
        const paid = rows.filter((r) => r.status === "paid");
        return (
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">Due ({due.length})</CardTitle></CardHeader>
              <CardContent>
                {due.length === 0 ? <EmptyState title="No dues. Thank you!" /> : (
                  <ul className="divide-y">
                    {due.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="font-medium">{i.title}</p>
                          <p className="text-xs text-muted-foreground">Due {fmtDate(i.dueDate)} {i.overdue ? <StatusBadge tone="danger" className="ml-1">Overdue</StatusBadge> : null}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-heading text-lg font-semibold tabular-nums">৳{n(i.due)}</span>
                          {canPay ? <Button size="sm" onClick={() => setPayFor({ id: i.id, title: i.title, due: i.due })}><CreditCard /> Pay</Button> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Paid</CardTitle></CardHeader>
              <CardContent>
                {paid.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
                  <ul className="divide-y">
                    {paid.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                        <span>{i.title}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums">৳{n(i.total)}</span>
                          <Status value="paid" />
                          {i.payments[0] ? <Button variant="ghost" size="xs" onClick={() => setReceipt(i.payments[0].id)}><Receipt /> Receipt</Button> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Dialog open={Boolean(payFor)} onOpenChange={(o) => !o && setPayFor(null)}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Pay ৳{payFor ? n(payFor.due) : ""}</DialogTitle>
                  <DialogDescription>{payFor?.title}. Simulated payment — no money moves in this demo.</DialogDescription>
                </DialogHeader>
                <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2">
                  {METHODS.map((m) => (
                    <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)} className={cn("rounded-lg px-3 py-3 text-sm font-semibold ring-offset-2 transition", m.color, method === m.id ? "ring-2 ring-ring" : "opacity-70")}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {method !== "card" ? (
                  <Field label={`${METHODS.find((m) => m.id === method)!.label} account number`} htmlFor="wallet" hint="A real integration redirects to the provider's own page.">
                    <Input id="wallet" inputMode="tel" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="01XXXXXXXXX" />
                  </Field>
                ) : <p className="text-xs text-muted-foreground">A real integration opens the bank&apos;s secure card page. Card numbers are never typed into this app.</p>}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
                  <Button disabled={pay.isPending || (method !== "card" && wallet.replace(/\D/g, "").length < 11)} onClick={() => payFor && pay.mutate({ invoiceId: payFor.id, method })}>
                    {pay.isPending ? "Processing…" : "Confirm payment"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {receipt ? <ReceiptDialog paymentId={receipt} onClose={() => setReceipt(null)} /> : null}
          </div>
        );
      }}
    </Async>
  );
}
