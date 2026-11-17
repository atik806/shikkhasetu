"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquarePlus, Phone, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Async, Initials, PageHeader, Status, StatusBadge } from "@/components/shared";
import { ReasonDialog } from "@/components/shared/dialogs";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useNum } from "@/lib/hooks";
import { fmtDate, fmtDateTime } from "@/lib/time";

export function StudentProfile({ id, backHref, resultHrefBase, extraActions }: { id: string; backHref: string; resultHrefBase: string; extraActions?: React.ReactNode }) {
  const n = useNum();
  const q = useAppQuery(["student", id], () => services.school.student(id));
  const [remark, setRemark] = useState("");
  const [shareable, setShareable] = useState(false);
  const [req, setReq] = useState<string | null>(null);
  const add = useAction(() => services.school.addRemark(id, remark.trim(), shareable), { success: "Remark added", onSuccess: () => setRemark("") });
  const request = useAction((i: { gid: string; note: string }) => services.school.requestPhoneChange(id, i.gid, i.note), { success: "Request sent to the office. They will verify in person.", onSuccess: () => setReq(null) });
  return (
    <Async query={q}>
      {(d) => (
        <>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href={backHref} />}><ArrowLeft /> Back</Button>
          <PageHeader
            title={<span className="flex items-center gap-3"><Initials name={d.student.name} className="size-11" />{d.student.name}</span>}
            description={`${d.student.sectionLabel} · Roll ${d.student.roll} · ${d.student.studentId}`}
            actions={<>{extraActions}<Status value={d.student.status} /></>}
          />
          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Date of birth</dt><dd>{fmtDate(d.student.dob)}</dd>
                  <dt className="text-muted-foreground">Blood group</dt><dd>{d.student.bloodGroup ?? "—"}</dd>
                  <dt className="text-muted-foreground">Admitted</dt><dd>{fmtDate(d.student.admittedOn)}</dd>
                  <dt className="text-muted-foreground">Attendance</dt><dd>{n(d.attendance)}%</dd>
                  <dt className="text-muted-foreground">Student login</dt><dd>{d.student.userId ? "Yes" : "No (younger class)"}</dd>
                </dl>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Guardians</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {d.guardians.map((g) => (
                    <li key={g.userId} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                      <Initials name={g.name} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{g.name} <span className="font-normal text-muted-foreground capitalize">· {g.relation}{g.isPrimary ? " (primary)" : ""}</span></p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="size-3" />{g.phoneMasked}
                          {g.hasSmartphone ? <><Smartphone className="size-3" /> smartphone</> : <StatusBadge>Feature phone</StatusBadge>}
                          <Status value={g.status} />
                          {g.activation === "remote" ? <StatusBadge tone="warning">Activated remotely</StatusBadge> : null}
                          {g.phoneChangedAt ? <StatusBadge tone="warning">Phone changed {fmtDate(g.phoneChangedAt)}</StatusBadge> : null}
                        </p>
                      </div>
                      {d.canRequestPhoneChange ? <Button size="xs" variant="outline" onClick={() => setReq(g.userId)}>Request phone change</Button> : null}
                    </li>
                  ))}
                </ul>
                <Button variant="link" size="sm" className="px-0" render={<Link href={backHref.startsWith("/teacher") ? "/teacher/messages" : "/admin/messages"} />}><MessageSquarePlus /> Message a guardian</Button>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader>
              <CardContent>
                {d.results.length === 0 ? <p className="text-sm text-muted-foreground">No published results.</p> : (
                  <ul className="divide-y text-sm">
                    {d.results.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <Link href={`${resultHrefBase}/${r.id}`} className="font-medium hover:underline">{r.examName}</Link>
                        <span className="flex items-center gap-2">
                          GPA {r.gpa.toFixed(2)} ({r.letter})
                          <StatusBadge tone={r.acknowledged ? "success" : "warning"}>{r.acknowledged ? "Acknowledged" : "Not acknowledged"}</StatusBadge>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Fees</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p>Due: <b>৳{n(d.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.items.reduce((a, x) => a + x.amount, 0) - i.discount - i.paid, 0))}</b></p>
                <p className="text-xs text-muted-foreground">{d.invoices.filter((i) => i.status !== "paid").length} unpaid invoice(s)</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle className="text-base">Remarks</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {d.canRemark ? (
                  <div className="space-y-2">
                    <label htmlFor="remark" className="sr-only">New remark</label>
                    <Textarea id="remark" rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Behaviour, progress, discipline note…" />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm"><Switch checked={shareable} onCheckedChange={setShareable} /> Visible to guardians</label>
                      <Button size="sm" disabled={remark.trim().length < 3 || add.isPending} onClick={() => add.mutate(undefined)}>Add remark</Button>
                    </div>
                  </div>
                ) : null}
                {d.remarks.length === 0 ? <p className="text-sm text-muted-foreground">No remarks.</p> : (
                  <ul className="space-y-2 text-sm">
                    {d.remarks.map((r) => (
                      <li key={r.id} className="rounded-lg border p-2.5">
                        {r.text}
                        <p className="mt-1 text-xs text-muted-foreground">{r.by} · {fmtDateTime(r.at)} · {r.shareable ? "shared with guardians" : "staff only"}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
          <ReasonDialog open={Boolean(req)} onOpenChange={(o) => !o && setReq(null)} title="Request a guardian phone change" description="Only the office can change it, after checking the guardian in person. Write what the guardian told you." onConfirm={(note) => req && request.mutate({ gid: req, note })} pending={request.isPending} />
        </>
      )}
    </Async>
  );
}
