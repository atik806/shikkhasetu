"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, getDaysInMonth, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Async, StatCard, StatusBadge } from "@/components/shared";
import { services } from "@/lib/services";
import { useAppQuery, useNum } from "@/lib/hooks";
import { fmtDate, fmtTime, today, weekdayOf } from "@/lib/time";
import { cn } from "@/lib/utils";

const CELL: Record<string, string> = {
  P: "bg-success/80 text-white",
  L: "bg-warning text-black",
  A: "bg-danger text-white",
  LV: "bg-primary/70 text-white",
};

export function MonthCalendar({ studentId }: { studentId: string }) {
  const t = useTranslations("status");
  const n = useNum();
  const [month, setMonth] = useState(today().slice(0, 7));
  const q = useAppQuery(["att-month", studentId, month], () => services.attendance.studentMonth(studentId, month));
  const first = parse(`${month}-01`, "yyyy-MM-dd", new Date());
  const days = getDaysInMonth(first);
  const lead = (first.getDay() + 1) % 7; // week starts Saturday
  const canNext = month < today().slice(0, 7);

  return (
    <Async query={q}>
      {(d) => {
        const byDate = new Map(d.days.map((x) => [x.date, x.status]));
        const gateByDate = new Map<string, typeof d.gate>();
        d.gate.forEach((g) => gateByDate.set(g.date, [...(gateByDate.get(g.date) ?? []), g]));
        const holidays = new Map(d.holidays.map((h) => [h.date, h.title]));
        const issues = d.days.filter((x) => x.status === "A" || x.status === "L").sort((a, b) => b.date.localeCompare(a.date));
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Term attendance" value={`${n(d.termPercent)}%`} tone={d.termPercent >= 90 ? "success" : d.termPercent >= 75 ? "warning" : "danger"} />
              <StatCard label={t("A")} value={n(d.counts.A)} tone={d.counts.A > 3 ? "danger" : "default"} />
              <StatCard label={t("L")} value={n(d.counts.L)} />
              <StatCard label={t("LV")} value={n(d.counts.LV)} />
            </div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{format(first, "MMMM yyyy")}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => setMonth(format(addMonths(first, -1), "yyyy-MM"))}><ChevronLeft /></Button>
                  <Button variant="outline" size="icon-sm" aria-label="Next month" disabled={!canNext} onClick={() => setMonth(format(addMonths(first, 1), "yyyy-MM"))}><ChevronRight /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground" aria-hidden>
                  {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((w) => <div key={w}>{w}</div>)}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Attendance calendar">
                  {Array.from({ length: lead }).map((_, i) => <div key={`l${i}`} />)}
                  {Array.from({ length: days }).map((_, i) => {
                    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                    const st = byDate.get(date);
                    const weekly = d.weeklyHolidays.includes(weekdayOf(date));
                    const hol = holidays.get(date);
                    const gate = gateByDate.get(date);
                    const label = st ? t(st as never) : weekly || hol ? `${t("holiday")}${hol ? `: ${hol}` : ""}` : date > today() ? "" : "No record";
                    return (
                      <div
                        key={date}
                        role="gridcell"
                        aria-label={`${fmtDate(date)}: ${label}`}
                        title={`${fmtDate(date)} — ${label}${gate ? ` · gate ${gate.map((g) => `${g.type} ${fmtTime(g.at)}`).join(", ")}` : ""}`}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-md text-xs font-medium sm:text-sm",
                          st ? CELL[st] : weekly || hol ? "bg-muted text-muted-foreground" : "border border-dashed text-muted-foreground",
                          date === today() && "ring-2 ring-ring",
                        )}
                      >
                        {n(i + 1)}
                        {st ? <span className="text-[9px] leading-none opacity-90 sm:text-[10px]">{st}</span> : null}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {(["P", "L", "A", "LV"] as const).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", CELL[k])} aria-hidden />{t(k)}</span>)}
                  <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-muted" aria-hidden />{t("holiday")}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Late & absent days</CardTitle></CardHeader>
              <CardContent>
                {issues.length === 0 ? <p className="text-sm text-muted-foreground">None this month. 🎉</p> : (
                  <ul className="divide-y text-sm">
                    {issues.map((x) => {
                      const g = gateByDate.get(x.date)?.find((e) => e.type === "IN");
                      return (
                        <li key={x.date} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span>{fmtDate(x.date, "EEE, d MMM")}</span>
                          <span className="flex items-center gap-2">
                            {g && x.status === "A" ? <span className="text-xs text-danger">Gate IN {fmtTime(g.at)} but absent in class</span> : g ? <span className="text-xs text-muted-foreground">Gate IN {fmtTime(g.at)}</span> : null}
                            <StatusBadge tone={x.status === "A" ? "danger" : "warning"}>{t(x.status as never)}</StatusBadge>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }}
    </Async>
  );
}
