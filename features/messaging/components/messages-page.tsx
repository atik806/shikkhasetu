"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Clock, MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Async, EmptyState, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useCan } from "@/lib/hooks";
import { useSession } from "@/lib/auth/session";
import { fmtDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

function NewThread({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const role = useSession((s) => s.role);
  const contacts = useAppQuery(["contacts"], () => services.messaging.contacts(), { enabled: open });
  const [key, setKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [complaint, setComplaint] = useState(false);
  const start = useAction((i: Parameters<typeof services.messaging.start>[0]) => services.messaging.start(i), { success: "Message sent", onSuccess: (id) => { onOpenChange(false); onCreated(id); setSubject(""); setBody(""); } });
  const list = contacts.data ?? [];
  const chosen = list.find((c) => c.key === (key || list[0]?.key));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New conversation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <NativeSelect label={role === "parent" ? "Teacher" : "Guardian"} value={chosen?.key ?? ""} onChange={setKey} options={list.map((c) => ({ value: c.key, label: c.label }))} />
          <Field label="Subject" htmlFor="th-sub"><Input id="th-sub" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} /></Field>
          <Field label="Message" htmlFor="th-body"><Textarea id="th-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} /></Field>
          {role === "parent" ? (
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={complaint} onCheckedChange={(v) => setComplaint(Boolean(v))} /> This is a complaint (the head teacher can read it)</label>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!chosen || !subject.trim() || !body.trim() || start.isPending} onClick={() => chosen && start.mutate({ studentId: chosen.studentId, teacherId: chosen.teacherId, guardianUserId: chosen.guardianUserId, subject: subject.trim(), body: body.trim(), complaint })}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThreadView({ id, onBack }: { id: string; onBack: () => void }) {
  const q = useAppQuery(["thread", id], () => services.messaging.thread(id), { refetchInterval: 10_000 });
  const markRead = useAction((tid: string) => services.messaging.markThreadRead(tid));
  const [body, setBody] = useState("");
  const send = useAction((b: string) => services.messaging.send(id, b), {
    onSuccess: (r) => {
      setBody("");
      if (r.delayed) toast.info(`Outside office hours — the teacher will receive it on ${r.deliverLabel}.`);
    },
  });
  const endRef = useRef<HTMLDivElement>(null);
  const markReadMutate = markRead.mutate;
  useEffect(() => {
    markReadMutate(id);
  }, [id, markReadMutate]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [q.data?.messages.length]);
  return (
    <Async query={q}>
      {(d) => (
        <div className="flex h-full min-h-[60vh] flex-col">
          <div className="flex items-center gap-2 border-b p-3">
            <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack} aria-label="Back to conversations"><ArrowLeft /></Button>
            <div className="min-w-0">
              <p className="truncate font-medium">{d.thread.subject}</p>
              <p className="truncate text-xs text-muted-foreground">{d.thread.teacherName} ↔ {d.thread.guardianName} · about {d.thread.studentName}</p>
            </div>
            {d.thread.complaint ? <StatusBadge tone="danger" className="ml-auto">Complaint</StatusBadge> : null}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
            {d.messages.map((m) => (
              <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                {!m.mine ? <p className="text-[11px] font-medium opacity-80">{m.from}</p> : null}
                <p className="whitespace-pre-line">{m.body}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] opacity-75">
                  {m.scheduled ? <><Clock className="size-3" /> delivers {fmtDateTime(m.deliverAt)}</> : fmtDateTime(m.at)}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {d.canSend ? (
            <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(body); }}>
              <label htmlFor="msg" className="sr-only">Message</label>
              <Input id="msg" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" maxLength={2000} />
              <Button type="submit" disabled={!body.trim() || send.isPending} aria-label="Send"><Send /></Button>
            </form>
          ) : <p className="border-t p-3 text-xs text-muted-foreground">Read-only: you are viewing this conversation as admin.</p>}
          <p className="px-3 pb-2 text-[11px] text-muted-foreground">Office hours {d.officeHours.start}–{d.officeHours.end}. Parent messages sent outside these hours reach the teacher next morning.</p>
        </div>
      )}
    </Async>
  );
}

export function MessagesPage() {
  const t = useTranslations("nav");
  const can = useCan();
  const role = useSession((s) => s.role);
  const [active, setActive] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const q = useAppQuery(["threads"], () => services.messaging.threads(), { refetchInterval: 15_000 });
  const canStart = role === "parent" || role === "teacher";
  return (
    <>
      <PageHeader
        title={t("messages")}
        description={can("messages.view_all") ? "All teacher–guardian conversations. Complaints are marked." : role === "parent" ? "Talk to your child's teachers." : "Conversations with guardians of your students."}
        actions={canStart ? <Button onClick={() => setNewOpen(true)}><MessageSquarePlus /> New</Button> : null}
      />
      <Card className="grid overflow-hidden p-0 md:grid-cols-[320px_1fr]">
        <div className={cn("border-r", active && "hidden md:block")}>
          <Async query={q}>
            {(threads) =>
              threads.length === 0 ? <div className="p-4"><EmptyState title="No conversations yet" /></div> : (
                <ul className="max-h-[70vh] overflow-y-auto">
                  {threads.map((th) => (
                    <li key={th.id}>
                      <button type="button" onClick={() => setActive(th.id)} className={cn("w-full border-b px-3 py-3 text-left hover:bg-muted/50", active === th.id && "bg-muted")}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{role === "parent" ? th.teacherName : role === "teacher" ? th.guardianName : `${th.teacherName} ↔ ${th.guardianName}`}</p>
                          {th.unread > 0 ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{th.unread}</span> : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{th.subject} · {th.studentName}</p>
                        {th.last ? <p className="mt-0.5 truncate text-xs">{th.last.body}</p> : null}
                        {th.complaint ? <StatusBadge tone="danger" className="mt-1">Complaint</StatusBadge> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            }
          </Async>
        </div>
        <div className={cn(!active && "hidden md:block")}>
          {active ? <ThreadView key={active} id={active} onBack={() => setActive(null)} /> : <div className="flex h-full min-h-60 items-center justify-center p-6 text-sm text-muted-foreground">Choose a conversation.</div>}
        </div>
      </Card>
      {canStart ? <NewThread open={newOpen} onOpenChange={setNewOpen} onCreated={setActive} /> : null}
    </>
  );
}
