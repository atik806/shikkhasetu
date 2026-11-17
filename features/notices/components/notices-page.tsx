"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Paperclip, Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Async, EmptyState, Field, NativeSelect, PageHeader, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery, useCan } from "@/lib/hooks";
import { fmtDate, fmtDateTime } from "@/lib/time";
import type { Notice, Role } from "@/types";

function PostDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const can = useCan();
  const isAdmin = can("notices.post_school");
  const overview = useAppQuery(["overview"], () => services.school.overview(), { enabled: isAdmin });
  const mySections = useAppQuery(["my-sections"], () => services.attendance.mySections(), { enabled: !isAdmin });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aud, setAud] = useState(isAdmin ? "school" : "");
  const [urgent, setUrgent] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [expires, setExpires] = useState("");
  const [file, setFile] = useState("");
  const post = useAction(
    (input: Parameters<typeof services.notices.post>[0]) => services.notices.post(input),
    { success: "Notice posted", onSuccess: () => { onOpenChange(false); setTitle(""); setBody(""); } },
  );
  const options: { value: string; label: string }[] = isAdmin
    ? [
        { value: "school", label: "Whole school" },
        ...(["parent", "teacher", "student"] as Role[]).map((r) => ({ value: `role:${r}`, label: `All ${r}s` })),
        ...(overview.data?.classes ?? []).map((c) => ({ value: `class:${c.id}`, label: `Class ${c.name}` })),
        ...(overview.data?.sections ?? []).map((s) => ({ value: `section:${s.id}`, label: s.label })),
      ]
    : (mySections.data ?? []).map((s) => ({ value: `section:${s.id}`, label: s.label }));
  const audienceValue = aud || options[0]?.value || "";
  const toAudience = (v: string): Notice["audience"] => {
    const [kind, id] = v.split(":");
    if (kind === "role") return { kind: "role", role: id as Role };
    if (kind === "class") return { kind: "class", classId: id };
    if (kind === "section") return { kind: "section", sectionId: id };
    return { kind: "school" };
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Post a notice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Title" htmlFor="n-title"><Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
          <Field label="Message" htmlFor="n-body"><Textarea id="n-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <NativeSelect label="Who should see it" value={audienceValue} onChange={setAud} options={options} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Expires on (optional)" htmlFor="n-exp"><Input id="n-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
            <Field label="Attachment (optional)" htmlFor="n-file" hint="Simulated — only the file name is kept."><Input id="n-file" type="file" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} /></Field>
          </div>
          <label className="flex items-center justify-between gap-2 text-sm"><span>Urgent — also send SMS</span><Switch checked={urgent} onCheckedChange={setUrgent} /></label>
          {isAdmin ? <label className="flex items-center justify-between gap-2 text-sm"><span>Pin to top</span><Switch checked={pinned} onCheckedChange={setPinned} /></label> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!title.trim() || !body.trim() || !audienceValue || post.isPending} onClick={() => post.mutate({ title: title.trim(), body: body.trim(), audience: toAudience(audienceValue), urgent, pinned, expiresOn: expires || undefined, attachmentName: file || undefined })}>
            {post.isPending ? "Posting…" : "Post notice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NoticesPage() {
  const t = useTranslations("nav");
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const q = useAppQuery(["notices", showExpired], () => services.notices.list(showExpired));
  const read = useAction((id: string) => services.notices.markRead(id));
  const remove = useAction((id: string) => services.notices.remove(id), { success: "Notice deleted" });
  const canPost = can("notices.post");
  return (
    <>
      <PageHeader
        title={t("notices")}
        actions={
          <>
            {can("notices.post_school") ? <Button variant="outline" size="sm" onClick={() => setShowExpired((v) => !v)}>{showExpired ? "Hide expired" : "Show expired"}</Button> : null}
            {canPost ? <Button onClick={() => setOpen(true)}><Plus /> Post notice</Button> : null}
          </>
        }
      />
      <Async query={q}>
        {(rows) =>
          rows.length === 0 ? <EmptyState icon={<Megaphone />} title="No notices" /> : (
            <ul className="space-y-3">
              {rows.map((n) => (
                <li key={n.id}>
                  <Card className={n.read ? "" : "border-primary/40"} onClick={() => !n.read && read.mutate(n.id)}>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {n.pinned ? <StatusBadge tone="info" icon={<Pin className="size-3" />}>Pinned</StatusBadge> : null}
                        {n.urgent ? <StatusBadge tone="danger">Urgent</StatusBadge> : null}
                        {!n.read ? <StatusBadge tone="info">New</StatusBadge> : null}
                        {n.expired ? <StatusBadge>Expired</StatusBadge> : null}
                        <span className="text-xs text-muted-foreground">{n.audienceLabel} · {n.by} · {fmtDateTime(n.createdAt)}</span>
                      </div>
                      <h2 className="font-heading font-semibold">{n.title}</h2>
                      <p className="text-sm whitespace-pre-line text-muted-foreground">{n.body}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {n.attachmentName ? <span className="flex items-center gap-1"><Paperclip className="size-3" /> {n.attachmentName}</span> : null}
                        {n.expiresOn ? <span>Until {fmtDate(n.expiresOn)}</span> : null}
                        {n.readPercent !== undefined ? <span>Read by {n.readPercent}% of parents</span> : null}
                        {n.canDelete ? (
                          <Button variant="ghost" size="xs" className="ml-auto text-danger" onClick={(e) => { e.stopPropagation(); remove.mutate(n.id); }}><Trash2 /> Delete</Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </Async>
      {canPost ? <PostDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
