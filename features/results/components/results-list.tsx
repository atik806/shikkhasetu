"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Async, EmptyState, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAppQuery, useNum } from "@/lib/hooks";
import { fmtDate, today } from "@/lib/time";

export function ResultsList({ studentId, hrefBase, showMine }: { studentId: string; hrefBase: string; showMine?: boolean }) {
  const t = useTranslations();
  const n = useNum();
  const q = useAppQuery(["results", studentId], () => services.results.studentResults(studentId));
  return (
    <Async query={q}>
      {(rows) =>
        rows.length === 0 ? (
          <EmptyState title="No published results yet" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const status = r.acknowledged ? "acknowledged" : today() > r.deadline ? "overdue" : "pending";
              return (
                <li key={r.id}>
                  <Link href={`${hrefBase}/${r.id}`} className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/40">
                    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <span className="font-heading text-lg leading-none font-semibold">{n(r.gpa.toFixed(2))}</span>
                      <span className="text-[10px]">GPA</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{r.examName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.letter} · Position {r.sectionPosition ?? "—"} · Published {fmtDate(r.publishedAt)}
                        {r.version > 1 ? " · corrected" : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <StatusBadge tone={status === "acknowledged" ? "success" : status === "overdue" ? "danger" : "warning"}>{t(`status.${status}` as never)}</StatusBadge>
                        {showMine && r.acknowledged && !r.acknowledgedByMe ? <StatusBadge tone="info">by another guardian</StatusBadge> : null}
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      }
    </Async>
  );
}
