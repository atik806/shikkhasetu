"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Async, EmptyState, PageHeader, Status, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAppQuery } from "@/lib/hooks";

export default function MarksList() {
  const q = useAppQuery(["my-mark-sheets"], () => services.results.myMarkSheets());
  return (
    <>
      <PageHeader title="Marks entry" description="Enter marks for your subjects. Submit when every student has a mark or AB." />
      <Async query={q}>
        {(rows) => {
          if (rows.length === 0) return <EmptyState title="No subjects assigned" />;
          const byExam = new Map<string, typeof rows>();
          rows.forEach((r) => byExam.set(r.examName, [...(byExam.get(r.examName) ?? []), r]));
          return (
            <div className="space-y-6">
              {[...byExam].map(([exam, list]) => (
                <section key={exam}>
                  <h2 className="mb-2 font-heading font-semibold">{exam}</h2>
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {list.map((r) => (
                      <li key={`${r.examId}:${r.sectionId}:${r.subjectId}`}>
                        <Link href={`/teacher/marks/${r.examId}/${r.sectionId}/${r.subjectId}`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{r.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{r.sectionLabel} · {r.entered}/{r.total} entered</p>
                            <div className="mt-1 flex gap-1.5">
                              {r.sectionState === "PUBLISHED" ? <Status value="PUBLISHED" /> : r.sectionState === "LOCKED" ? <Status value="LOCKED" /> : <Status value={r.status} />}
                              {r.sectionState === "OPEN" && r.status === "DRAFT" ? <StatusBadge tone="warning">To do</StatusBadge> : null}
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          );
        }}
      </Async>
    </>
  );
}
