"use client";

import { BookOpen, CheckCircle2, Circle, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Async, EmptyState, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAction, useAppQuery } from "@/lib/hooks";
import { fmtDate, today } from "@/lib/time";

export function HomeworkList({ studentId, canMarkDone }: { studentId: string; canMarkDone?: boolean }) {
  const q = useAppQuery(["homework", studentId], () => services.homework.forStudent(studentId));
  const toggle = useAction((id: string) => services.homework.toggleDone(id));
  return (
    <Async query={q}>
      {(rows) =>
        rows.length === 0 ? <EmptyState icon={<BookOpen />} title="No homework in the last two weeks" /> : (
          <ul className="space-y-2">
            {rows.map((h) => {
              const overdue = !h.done && h.dueDate < today();
              return (
                <li key={h.id}>
                  <Card>
                    <CardContent className="flex items-start gap-3">
                      {canMarkDone ? (
                        <Button variant="ghost" size="icon" onClick={() => toggle.mutate(h.id)} aria-pressed={h.done} aria-label={h.done ? "Mark as not done" : "Mark as done"}>
                          {h.done ? <CheckCircle2 className="text-success" /> : <Circle />}
                        </Button>
                      ) : h.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Not done" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone={h.subjectId ? "info" : "warning"}>{h.subjectName}</StatusBadge>
                          {h.isToday ? <StatusBadge tone="success">Today</StatusBadge> : null}
                          {overdue ? <StatusBadge tone="danger">Overdue</StatusBadge> : null}
                        </div>
                        <p className={`mt-1 font-medium ${h.done ? "text-muted-foreground line-through" : ""}`}>{h.title}</p>
                        <p className="text-sm text-muted-foreground">{h.details}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {h.by} · given {fmtDate(h.assignedOn)} · due {fmtDate(h.dueDate)}
                          {h.attachmentName ? <span className="ml-2 inline-flex items-center gap-1"><Paperclip className="size-3" />{h.attachmentName}</span> : null}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )
      }
    </Async>
  );
}
