"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, CircleDashed, CreditCard, DoorOpen, Megaphone, Signature, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, EmptyState, LoadingBlock, StatusBadge } from "@/components/shared";
import { ChildSwitcher, useChildren } from "@/features/parent/child";
import { services } from "@/lib/services";
import { useAppQuery, useMe, useNum } from "@/lib/hooks";
import { fmtDate, fmtTime } from "@/lib/time";

function TodayCard({ studentId, name }: { studentId: string; name: string }) {
  const t = useTranslations("parent");
  const ts = useTranslations("status");
  const q = useAppQuery(["today", studentId], () => services.attendance.todayStatus(studentId), { refetchInterval: 20_000 });
  return (
    <Async query={q} rows={1}>
      {(s) => {
        let tone: "success" | "warning" | "danger" | "neutral" = "neutral";
        let icon = <CircleDashed className="size-7" />;
        let title = t("notArrived");
        let sub = "";
        if (!s.schoolDay) {
          icon = <Sun className="size-7" />;
          title = ts("holiday");
        } else if (s.classStatus === "A") {
          tone = "danger";
          icon = <AlertTriangle className="size-7" />;
          title = t("absentToday");
          if (s.gateIn) sub = `But checked in at the gate at ${fmtTime(s.gateIn.at)} — the class teacher has been alerted.`;
        } else if (s.gateOut) {
          tone = "success";
          icon = <DoorOpen className="size-7" />;
          title = t("leftAt", { time: fmtTime(s.gateOut.at) });
          sub = s.gateOut.reason ? `Reason: ${s.gateOut.reason}${s.gateOut.pickedUpBy ? ` · picked up by ${s.gateOut.pickedUpBy}` : ""}` : "";
        } else if (s.gateIn) {
          tone = s.gateIn.late ? "warning" : "success";
          icon = <CheckCircle2 className="size-7" />;
          title = t("arrivedAt", { time: fmtTime(s.gateIn.at) });
          sub = s.gateIn.late ? "Arrived late." : "";
        } else if (s.classStatus === "P" || s.classStatus === "L") {
          tone = "success";
          icon = <CheckCircle2 className="size-7" />;
          title = ts(s.classStatus);
        } else if (s.classStatus === "LV") {
          title = ts("LV");
        }
        const toneCls = { success: "bg-success/10 text-success", warning: "bg-warning/15 text-warning", danger: "bg-danger/10 text-danger", neutral: "bg-muted text-muted-foreground" }[tone];
        return (
          <div className="flex items-center gap-4">
            <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${toneCls}`} aria-hidden>{icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("todayAt")} · {name.split(" ")[0]}</p>
              <p className="font-heading text-lg font-semibold">{title}</p>
              {sub ? <p className="text-sm text-muted-foreground">{sub}</p> : null}
              {s.classStatus ? <p className="mt-0.5 text-xs text-muted-foreground">Class register: {ts(s.classStatus)}</p> : null}
            </div>
          </div>
        );
      }}
    </Async>
  );
}

function PendingResults({ ids }: { ids: { id: string; name: string }[] }) {
  const t = useTranslations("parent");
  const q = useAppQuery(["pending-results", ids.map((c) => c.id).join(",")], async () => {
    const all = await Promise.all(ids.map((c) => services.results.studentResults(c.id).then((rs) => rs.map((r) => ({ ...r, childName: c.name })))));
    return all.flat().filter((r) => !r.acknowledgedByMe && !r.acknowledged);
  });
  if (!q.data || q.data.length === 0) return null;
  return (
    <div className="space-y-2">
      {q.data.map((r) => (
        <Link key={r.id} href={`/parent/results/${r.id}`} className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/8 p-4 transition-colors hover:bg-primary/12">
          <Signature className="size-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("newResult")}</p>
            <p className="text-sm text-muted-foreground">{t("newResultBody", { exam: r.examName, name: r.childName.split(" ")[0] })} · by {fmtDate(r.deadline)}</p>
          </div>
          <ArrowRight className="size-5 text-primary" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

export default function ParentHome() {
  const t = useTranslations("parent");
  const n = useNum();
  const me = useMe();
  const { query, children, selected } = useChildren();
  const hw = useAppQuery(["homework", selected?.id], () => services.homework.forStudent(selected!.id), { enabled: Boolean(selected) });
  const notices = useAppQuery(["notices"], () => services.notices.list());
  const fees = useAppQuery(["invoices", selected?.id], () => services.fees.studentInvoices(selected!.id), { enabled: Boolean(selected) });

  if (query.isPending) return <LoadingBlock />;
  if (children.length === 0) return <EmptyState title="No children linked" description="Ask the school office to link your account to your child." />;
  const due = (fees.data ?? []).filter((i) => i.status !== "paid");
  const todaysHw = (hw.data ?? []).filter((h) => h.isToday || h.dueDate >= new Date().toISOString().slice(0, 10)).slice(0, 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-semibold sm:text-2xl">{t("greeting", { name: me.data?.name.replace(/^Md\.\s*/, "").split(" ")[0] ?? "" })}</h1>
      </div>
      <ChildSwitcher className="mb-0" />
      <PendingResults ids={children.map((c) => ({ id: c.id, name: c.name }))} />
      {selected ? (
        <Card>
          <CardContent><TodayCard studentId={selected.id} name={selected.name} /></CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" /> {t("todaysDiary")}</CardTitle>
            <Button variant="link" size="sm" render={<Link href="/parent/homework" />}>All</Button>
          </CardHeader>
          <CardContent>
            {todaysHw.length === 0 ? <p className="text-sm text-muted-foreground">No homework due.</p> : (
              <ul className="space-y-2.5">
                {todaysHw.map((h) => (
                  <li key={h.id} className="text-sm">
                    <span className="font-medium">{h.subjectName}:</span> {h.title}
                    <span className="block text-xs text-muted-foreground">Due {fmtDate(h.dueDate)} {h.done ? "· marked done ✓" : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="size-4" /> {t("latestNotice")}</CardTitle>
            <Button variant="link" size="sm" render={<Link href="/parent/notices" />}>All</Button>
          </CardHeader>
          <CardContent>
            {notices.data?.[0] ? (
              <div className="text-sm">
                <p className="font-medium">{notices.data[0].urgent ? <StatusBadge tone="danger" className="mr-1.5">Urgent</StatusBadge> : null}{notices.data[0].title}</p>
                <p className="mt-1 line-clamp-3 text-muted-foreground">{notices.data[0].body}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">No notices.</p>}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4" /> {t("dues")}</CardTitle>
            {due.length > 0 ? <Button size="sm" render={<Link href="/parent/fees" />}>Pay now</Button> : null}
          </CardHeader>
          <CardContent>
            {due.length === 0 ? <p className="text-sm text-muted-foreground">{t("noDues")}</p> : (
              <ul className="space-y-1.5 text-sm">
                {due.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span>{i.title} {i.overdue ? <StatusBadge tone="danger" className="ml-1">Overdue</StatusBadge> : null}</span>
                    <span className="font-medium tabular-nums">৳{n(i.due)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
