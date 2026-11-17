"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Info, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, PageHeader, StatusBadge } from "@/components/shared";
import { AckFlow } from "@/features/acknowledgments/components/ack-flow";
import { AckStatusPanel, PrintableCard, PrintButton, ResultSummary, SubjectTable, VersionHistory } from "./result-view";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";
import { useSession } from "@/lib/auth/session";
import { fmtDate } from "@/lib/time";

export function ResultPage({ id, backHref }: { id: string; backHref: string }) {
  const t = useTranslations();
  const role = useSession((s) => s.role);
  // keep the acknowledgment dialog mounted after success so the "thank you" step stays visible
  const [ackStarted, setAckStarted] = useState(false);
  const q = useAppQuery(["result", id], () => services.results.resultDetail(id));
  return (
    <Async query={q}>
      {(d) => (
        <>
          <div className="print:hidden">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href={backHref} />}><ArrowLeft /> {t("common.back")}</Button>
            <PageHeader
              title={`${d.result.examName}`}
              description={`${d.student.name} · ${d.student.sectionLabel} · Roll ${d.student.roll} · Published ${fmtDate(d.result.publishedAt)}`}
              actions={
                <>
                  {d.result.state === "SUPERSEDED" ? <StatusBadge tone="neutral">Superseded</StatusBadge> : null}
                  {d.result.version > 1 ? <StatusBadge tone="warning">{t("result.version", { v: d.result.version })} · corrected</StatusBadge> : null}
                  <PrintButton disabled={d.holdForDues && role === "parent"} title={d.holdForDues ? "The printed card is on hold until dues are cleared. You can still see the result here." : undefined} />
                  <Button variant="outline" render={<Link href={`/verify/${d.result.verificationCode}`} target="_blank" />}><QrCode /> {t("result.verify")}</Button>
                </>
              }
            />
            {d.result.correctionReason && role === "parent" && d.canAcknowledge ? (
              <div className="mb-4 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"><Info className="size-5 shrink-0 text-warning" />{t("ack.corrected")} ({d.result.correctionReason})</div>
            ) : null}
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-5">
                <ResultSummary d={d} />
                <SubjectTable d={d} />
                {d.result.teacherRemark ? (
                  <Card>
                    <CardHeader><CardTitle className="text-base">{t("result.remark")}</CardTitle></CardHeader>
                    <CardContent className="text-sm">{d.result.teacherRemark} <span className="text-muted-foreground">— {d.classTeacher}</span></CardContent>
                  </Card>
                ) : null}
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Guardian acknowledgment</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <AckStatusPanel d={d} />
                    {d.canAcknowledge || ackStarted ? <AckFlow resultVersionId={d.result.id} childName={d.student.name} hideTrigger={!d.canAcknowledge} onStart={() => setAckStarted(true)} /> : null}
                    {role === "student" ? <p className="text-xs text-muted-foreground">{t("ack.studentOnly")}</p> : null}
                  </CardContent>
                </Card>
                <VersionHistory d={d} />
              </div>
            </div>
          </div>
          <PrintableCard d={d} />
        </>
      )}
    </Async>
  );
}
