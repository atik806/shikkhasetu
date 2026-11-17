"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BadgeCheck, CircleAlert, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async } from "@/components/shared";
import { services } from "@/lib/services";
import { fmtDate, fmtDateTime } from "@/lib/time";

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations("verify");
  const q = useQuery({ queryKey: ["verify", code], queryFn: () => services.results.verify(decodeURIComponent(code)) });
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-8">
      <Link href="/" aria-label="ShikkhaSetu home"><Logo /></Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <p className="font-mono text-xs text-muted-foreground">{decodeURIComponent(code)}</p>
        </CardHeader>
        <CardContent>
          <Async query={q}>
            {(r) =>
              !r ? (
                <div role="alert" className="flex gap-3 rounded-lg bg-danger/10 p-4 text-sm">
                  <ShieldAlert className="size-5 shrink-0 text-danger" aria-hidden />
                  <p>{t("notFound")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">School</dt><dd>{r.school}</dd>
                    <dt className="text-muted-foreground">Student</dt><dd>{r.studentName}</dd>
                    <dt className="text-muted-foreground">Class</dt><dd>{r.section}</dd>
                    <dt className="text-muted-foreground">Exam</dt><dd>{r.exam}</dd>
                    <dt className="text-muted-foreground">GPA</dt><dd className="font-semibold">{r.gpa.toFixed(2)} ({r.letter})</dd>
                    <dt className="text-muted-foreground">Published</dt><dd>{fmtDate(r.publishedAt)}</dd>
                  </dl>
                  {r.superseded ? (
                    <div className="flex gap-3 rounded-lg bg-warning/15 p-4 text-sm"><CircleAlert className="size-5 shrink-0 text-warning" aria-hidden /><p>{t("superseded")}</p></div>
                  ) : null}
                  {r.acknowledgment ? (
                    <div className="flex gap-3 rounded-lg bg-success/10 p-4 text-sm">
                      <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden />
                      <p className="font-medium">{t("acknowledgedBy", { relation: r.acknowledgment.relation, name: r.acknowledgment.name, when: fmtDateTime(r.acknowledgment.at) })}</p>
                    </div>
                  ) : (
                    <div className="flex gap-3 rounded-lg bg-danger/10 p-4 text-sm">
                      <ShieldAlert className="size-5 shrink-0 text-danger" aria-hidden />
                      <div>
                        <p className="font-medium">{t("notAcknowledged")}</p>
                        <p className="mt-1 text-muted-foreground">{t("notAckHint")}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t("privacy")}</p>
                </div>
              )
            }
          </Async>
        </CardContent>
      </Card>
    </div>
  );
}
