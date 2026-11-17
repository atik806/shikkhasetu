"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Async, DataTable, Field, NativeSelect, PageHeader, StatCard, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { downloadCsv, useAction, useAppQuery, useNum } from "@/lib/hooks";
import { fmtDate } from "@/lib/time";

export default function AdminFees() {
  const n = useNum();
  const summary = useAppQuery(["fee-summary"], () => services.fees.summary());
  const structure = useAppQuery(["fee-structure"], () => services.fees.structure());
  const ov = useAppQuery(["overview"], () => services.school.overview());
  const [section, setSection] = useState("all");
  const dues = useAppQuery(["dues", section], () => services.fees.dueList(section));
  const setFee = useAction((i: { c: string; h: string; a: number }) => services.fees.setFee(i.c, i.h, i.a), { success: "Fee updated" });
  const [cash, setCash] = useState<string | null>(null);
  const [waive, setWaive] = useState<{ id: string; max: number } | null>(null);
  const [amount, setAmount] = useState("");
  const payCash = useAction((id: string) => services.fees.pay({ invoiceId: id, method: "cash" }), { success: (p) => `Cash recorded · receipt ${p.trxId}`, onSuccess: () => setCash(null) });
  const doWaive = useAction((reason: string) => services.fees.waive({ invoiceId: waive!.id, amount: Number(amount), reason }), { success: "Waiver applied (audited)", onSuccess: () => { setWaive(null); setAmount(""); } });
  return (
    <>
      <PageHeader title="Fees" description="Fee structure per class, dues and collections. A result is never hidden from a parent because of dues." />
      <Async query={summary}>
        {(s) => (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Collected this month" value={`৳${n(s.collected)}`} tone="success" />
            <StatCard label="Outstanding" value={`৳${n(s.outstanding)}`} tone="warning" />
            <StatCard label="Overdue invoices" value={n(s.overdueCount)} tone="danger" />
            <StatCard label="bKash / Nagad this month" value={`৳${n((s.byMethod.find((m) => m.method === "bkash")?.amount ?? 0) + (s.byMethod.find((m) => m.method === "nagad")?.amount ?? 0))}`} />
          </div>
        )}
      </Async>
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Async query={dues}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              searchText={(r) => `${r.studentName} ${r.studentCode}`}
              toolbar={
                <>
                  <NativeSelect className="w-44" label="Section" value={section} onChange={setSection} options={[{ value: "all", label: "All sections" }, ...(ov.data?.sections ?? []).map((s) => ({ value: s.id, label: s.label }))]} />
                  <Button variant="outline" size="sm" onClick={() => downloadCsv("dues.csv", [["student_id", "name", "section", "invoice", "due_date", "amount"], ...rows.map((r) => [r.studentCode, r.studentName, r.sectionLabel, r.title, r.dueDate, r.due])])}><Download /> CSV</Button>
                </>
              }
              columns={[
                { key: "st", header: "Student", cell: (r) => <span>{r.studentName}<span className="block text-xs text-muted-foreground">{r.sectionLabel}</span></span>, sortValue: (r) => r.studentName },
                { key: "inv", header: "Invoice", cell: (r) => r.title },
                { key: "due", header: "Due date", cell: (r) => <span>{fmtDate(r.dueDate)} {r.overdue ? <StatusBadge tone="danger">Overdue</StatusBadge> : null}</span>, sortValue: (r) => r.dueDate },
                { key: "amt", header: "Amount", cell: (r) => `৳${n(r.due)}`, sortValue: (r) => r.due },
                { key: "act", header: "", cell: (r) => <div className="flex gap-1"><Button size="xs" variant="outline" onClick={() => setCash(r.id)}>Cash</Button><Button size="xs" variant="ghost" onClick={() => setWaive({ id: r.id, max: r.due })}>Waive</Button></div> },
              ]}
            />
          )}
        </Async>
        <Card>
          <CardHeader><CardTitle className="text-base">Fee structure (৳)</CardTitle></CardHeader>
          <CardContent>
            <Async query={structure}>
              {(s) => (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground"><tr><th scope="col" className="py-1">Class</th>{s.heads.filter((h) => h.id !== "fh_transport").map((h) => <th key={h.id} scope="col" className="px-1 py-1">{h.name}</th>)}</tr></thead>
                    <tbody>
                      {s.classes.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="py-1.5">{c.name}</td>
                          {s.heads.filter((h) => h.id !== "fh_transport").map((h) => {
                            const f = s.structures.find((x) => x.classId === c.id && x.feeHeadId === h.id);
                            return <td key={h.id} className="px-1 py-1"><Input aria-label={`${h.name} for class ${c.name}`} className="h-7 w-20" type="number" defaultValue={f?.amount ?? 0} onBlur={(e) => Number(e.target.value) !== (f?.amount ?? 0) && setFee.mutate({ c: c.id, h: h.id, a: Number(e.target.value) })} /></td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Async>
          </CardContent>
        </Card>
      </div>
      <ReasonDialog open={Boolean(cash)} onOpenChange={(o) => !o && setCash(null)} title="Record cash payment at the office" requireReason={false} confirmLabel="Record payment" pending={payCash.isPending} onConfirm={() => cash && payCash.mutate(cash)} />
      <ReasonDialog open={Boolean(waive)} onOpenChange={(o) => !o && setWaive(null)} title="Waive / discount" pending={doWaive.isPending} onConfirm={(r) => Number(amount) > 0 && doWaive.mutate(r)}>
        <Field label={`Amount (max ৳${waive?.max ?? 0})`} htmlFor="wv"><Input id="wv" type="number" min={1} max={waive?.max} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </ReasonDialog>
    </>
  );
}
