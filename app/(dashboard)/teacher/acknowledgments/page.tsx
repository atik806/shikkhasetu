"use client";

import { useState } from "react";
import { BellRing, FileWarning, Flag, MessageSquareText, Phone, ShieldAlert, Signature, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Async, EmptyState, NativeSelect, PageHeader, StatCard, StatusBadge } from "@/components/shared";
import { CodeInput, ReasonDialog } from "@/components/shared/dialogs";
import { CtSectionPicker, useCtSections } from "@/features/teacher/ct-section";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDate, fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

type Tracker = Awaited<ReturnType<typeof services.acks.tracker>>;
type Row = Tracker["rows"][number];
const FILTERS = ["all", "pending", "overdue", "acknowledged", "flagged", "paper"] as const;

function SmsCodeDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const guardians = row.guardians.filter((g) => g.canAcknowledge);
  const [gid, setGid] = useState(guardians.find((g) => !g.hasSmartphone)?.userId ?? guardians[0]?.userId ?? "");
  const [sent, setSent] = useState<{ sentTo: string; callNumber?: string } | null>(null);
  const [code, setCode] = useState("");
  const send = useAction(() => services.acks.sendSmsCode({ resultVersionId: row.resultVersionId!, guardianUserId: gid }), { success: "SMS with code sent (see dev panel → SMS outbox)", onSuccess: (r) => setSent(r) });
  const enter = useAction(() => services.acks.enterSmsCode({ resultVersionId: row.resultVersionId!, guardianUserId: gid, code }), { success: "Acknowledgment recorded (sms_code)", onSuccess: onClose });
  const g = guardians.find((x) => x.userId === gid);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Feature-phone acknowledgment</DialogTitle>
          <DialogDescription>For guardians without a smartphone. You call the <b>registered number</b> from the school — never accept a code from an incoming call.</DialogDescription>
        </DialogHeader>
        <NativeSelect label="Guardian" value={gid} onChange={(v) => { setGid(v); setSent(null); }} options={guardians.map((x) => ({ value: x.userId, label: `${x.name} (${x.relation}) · ${x.phoneMasked}${x.hasSmartphone ? "" : " · feature phone"}` }))} />
        <ol className="space-y-3 text-sm">
          <li className="flex gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
            <div className="flex-1">Send the SMS with the result summary and a one-time code.
              <Button size="sm" className="mt-2 w-full" variant={sent ? "outline" : "default"} onClick={() => send.mutate(undefined)} disabled={!gid || send.isPending}>{sent ? "Send a new code" : "Send SMS code"}</Button>
              {sent ? <p className="mt-1 text-xs text-muted-foreground">Sent to {sent.sentTo}.</p> : null}
            </div>
          </li>
          <li className="flex gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
            <div className="flex-1">Call {g?.name} on the registered number <b>{g?.phoneMasked}</b> and ask them to read the code.
              {sent?.callNumber ? <Button size="sm" variant="outline" className="mt-2 w-full" render={<a href={`tel:${sent.callNumber}`} />}><Phone /> Call now</Button> : null}
            </div>
          </li>
          <li className="flex gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
            <div className="flex-1"><CodeInput id="sms-code" length={6} value={code} onChange={setCode} label="Code the guardian read out" /></div>
          </li>
        </ol>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!sent || code.length !== 6 || enter.isPending} onClick={() => enter.mutate(undefined)}>Record acknowledgment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InPersonDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const guardians = row.guardians.filter((g) => g.canAcknowledge);
  const [gid, setGid] = useState(guardians[0]?.userId ?? "");
  const [confirm, setConfirm] = useState(false);
  const rec = useAction(() => services.acks.recordInPerson({ resultVersionId: row.resultVersionId!, guardianUserId: gid }), { success: "In-person acknowledgment recorded", onSuccess: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardian came to school</DialogTitle>
          <DialogDescription>Record only when you met the guardian yourself and checked who they are.</DialogDescription>
        </DialogHeader>
        <NativeSelect label="Guardian" value={gid} onChange={setGid} options={guardians.map((g) => ({ value: g.userId, label: `${g.name} (${g.relation})` }))} />
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(Boolean(v))} /> I met this guardian in person and they reviewed {row.student.name}&apos;s result.</label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!confirm || !gid || rec.isPending} onClick={() => rec.mutate(undefined)}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AckTracker() {
  const secs = useCtSections();
  const [picked, setPicked] = useState("");
  const sectionId = picked || secs.data?.find((s) => s.isClassTeacher)?.id || "";
  const [examId, setExamId] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const q = useAppQuery(["tracker", examId, sectionId], async () => {
    const first = await services.acks.tracker(examId || "_", sectionId);
    if (!examId && first.exams[0]) return services.acks.tracker(first.exams[first.exams.length - 1].id, sectionId);
    return first;
  }, { enabled: Boolean(sectionId) });
  const [sms, setSms] = useState<Row | null>(null);
  const [inPerson, setInPerson] = useState<Row | null>(null);
  const [flag, setFlag] = useState<{ ackId: string; code: string } | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const currentExam = examId || q.data?.exams[q.data.exams.length - 1]?.id || "";
  const remind = useAction(() => services.acks.sendReminders(currentExam, sectionId), { success: (n) => `Reminder SMS sent for ${n} student(s)`, onSuccess: () => setRemindOpen(false) });
  const paper = useAction((i: { id: string; v: boolean }) => services.acks.markPaperReturned(i.id, i.v));
  const resolve = useAction((i: { ackId: string; code: string; note: string }) => services.acks.resolveFlag(i), { success: "Flag resolved", onSuccess: () => setFlag(null) });

  if (!sectionId) return <EmptyState title="You are not a class teacher" />;
  return (
    <>
      <PageHeader
        title="Result acknowledgments"
        description="Who reviewed each result, how, and whether anything looks suspicious. Flags are warnings to follow up — never automatic rejections."
        actions={
          <>
            {q.data ? <NativeSelect className="w-56" label="Exam" value={currentExam} onChange={setExamId} options={q.data.exams.map((e) => ({ value: e.id, label: e.name }))} /> : null}
            <CtSectionPicker value={sectionId} onChange={setPicked} />
          </>
        }
      />
      <Async query={q}>
        {(d) => {
          const rows = d.rows.filter((r) => r.resultVersionId).filter((r) =>
            filter === "all" ? true : filter === "flagged" ? r.acks.some((a) => a.followUp) : filter === "paper" ? r.paperMismatch : r.status === filter,
          );
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard label="Acknowledged" value={`${d.summary.acknowledged}/${d.summary.total}`} tone="success" icon={<Signature />} />
                <StatCard label="Pending" value={d.summary.pending} tone="warning" />
                <StatCard label="Overdue" value={d.summary.overdue} tone={d.summary.overdue ? "danger" : "default"} />
                <StatCard label="Need follow-up" value={d.summary.flagged} tone={d.summary.flagged ? "danger" : "default"} icon={<ShieldAlert />} />
                <StatCard label="Paper signed, no digital" value={d.summary.paperMismatch} tone={d.summary.paperMismatch ? "danger" : "default"} icon={<FileWarning />} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1">
                  {FILTERS.map((f) => (
                    <Button key={f} role="tab" aria-selected={filter === f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)}>
                      {{ all: "All", pending: "Pending", overdue: "Overdue", acknowledged: "Acknowledged", flagged: "Flagged", paper: "Paper mismatch" }[f]}
                    </Button>
                  ))}
                </div>
                <Button size="sm" className="ml-auto" onClick={() => setRemindOpen(true)} disabled={d.summary.pending + d.summary.overdue === 0}><BellRing /> Remind pending</Button>
              </div>
              {rows.length === 0 ? <EmptyState title="Nobody in this filter" /> : (
                <ul className="space-y-2">
                  {rows.map((r) => (
                    <li key={r.student.id}>
                      <Card className={cn(r.acks.some((a) => a.followUp) && "border-danger/40", r.paperMismatch && "border-danger/40")}>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-7 text-sm text-muted-foreground tabular-nums">{r.student.roll}</span>
                            <p className="font-medium">{r.student.name}</p>
                            <span className="text-xs text-muted-foreground">GPA {r.gpa?.toFixed(2)}{(r.version ?? 1) > 1 ? ` · v${r.version}` : ""}</span>
                            <StatusBadge tone={r.status === "acknowledged" ? "success" : r.status === "overdue" ? "danger" : "warning"}>{r.status}</StatusBadge>
                            {r.paperMismatch ? <StatusBadge tone="danger" icon={<FileWarning className="size-3" />}>Paper signed, no digital acknowledgment</StatusBadge> : null}
                            {r.guardians.some((g) => !g.hasSmartphone) ? <StatusBadge>Feature phone</StatusBadge> : null}
                            {r.guardians.some((g) => g.phoneChangedAt) ? <StatusBadge tone="warning">Phone changed {fmtDate(r.guardians.find((g) => g.phoneChangedAt)!.phoneChangedAt!)}</StatusBadge> : null}
                          </div>
                          {r.acks.map((a) => (
                            <div key={a.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                              <p className="flex flex-wrap items-center gap-2">
                                <UserCheck className="size-4 text-success" aria-hidden />
                                <b>{a.guardian}</b> ({a.relation}) · {fmtDateTime(a.at)} ·{" "}
                                <StatusBadge tone="info">{a.channel === "app" ? "App: PIN + OTP" : a.channel === "sms_code" ? `SMS code, by ${a.recordedBy}` : `In person, by ${a.recordedBy}`}</StatusBadge>
                                <span className="text-xs text-muted-foreground">{a.deviceLabel}</span>
                              </p>
                              {a.comment ? <p className="mt-1 flex items-start gap-1.5 text-muted-foreground"><MessageSquareText className="mt-0.5 size-3.5" />“{a.comment}”</p> : null}
                              {a.flags.map((f) => (
                                <div key={f.code} className={cn("mt-2 flex flex-wrap items-start gap-2 rounded-md border p-2 text-xs", f.resolvedBy ? "opacity-60" : f.severity === "high" ? "border-danger/40 bg-danger/5" : f.severity === "medium" ? "border-warning/40 bg-warning/10" : "")}>
                                  <Flag className={cn("mt-0.5 size-3.5", f.severity === "high" ? "text-danger" : f.severity === "medium" ? "text-warning" : "text-muted-foreground")} aria-hidden />
                                  <span className="flex-1"><b className="uppercase">{f.severity}</b> — {f.explanation}{f.resolvedNote ? ` · Resolved: ${f.resolvedNote}` : ""}</span>
                                  {!f.resolvedBy ? <Button size="xs" variant="outline" onClick={() => setFlag({ ackId: a.id, code: f.code })}>Resolve</Button> : null}
                                </div>
                              ))}
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            {r.status !== "acknowledged" ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setSms(r)}><Phone /> SMS code + call</Button>
                                <Button size="sm" variant="outline" onClick={() => setInPerson(r)}><UserCheck /> Guardian came in person</Button>
                              </>
                            ) : null}
                            <label className="ml-auto flex items-center gap-2 text-xs">
                              <Checkbox checked={Boolean(r.paperReturned)} onCheckedChange={(v) => r.resultVersionId && paper.mutate({ id: r.resultVersionId, v: Boolean(v) })} />
                              Paper card returned signed
                            </label>
                          </div>
                          {r.status !== "acknowledged" ? <p className="text-xs text-muted-foreground">Deadline {fmtDate(r.deadline)}</p> : null}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
      </Async>
      {sms ? <SmsCodeDialog row={sms} onClose={() => setSms(null)} /> : null}
      {inPerson ? <InPersonDialog row={inPerson} onClose={() => setInPerson(null)} /> : null}
      <ReasonDialog open={Boolean(flag)} onOpenChange={(o) => !o && setFlag(null)} title="Resolve this flag" description="What did you check? (e.g. called the father on the registered number, he confirmed)" minLength={3} confirmLabel="Resolve" pending={resolve.isPending} onConfirm={(note) => flag && resolve.mutate({ ...flag, note })} />
      <ReasonDialog open={remindOpen} onOpenChange={setRemindOpen} title="Send reminder SMS?" description="Every guardian of a student without an acknowledgment gets an SMS reminder." requireReason={false} confirmLabel="Send reminders" pending={remind.isPending} onConfirm={() => remind.mutate(undefined)} />
    </>
  );
}
