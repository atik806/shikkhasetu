"use client";

import { AlertTriangle } from "lucide-react";
import { DAYS, PERIODS } from "@/features/timetable/service";
import { cn } from "@/lib/utils";
import { weekdayOf, today } from "@/lib/time";
import type { Weekday } from "@/types";

export interface Slot {
  id: string;
  day: Weekday;
  period: number;
  subjectName: string;
  teacherName: string;
  sectionLabel: string;
  conflict?: boolean;
}

/** Sat–Thu × 6 periods. `mode` decides what the second line shows. */
export function TimetableGrid({ slots, mode, onCellClick }: { slots: Slot[]; mode: "section" | "teacher"; onCellClick?: (day: Weekday, period: number) => void }) {
  const map = new Map(slots.map((s) => [`${s.day}:${s.period}`, s]));
  const todayDay = weekdayOf(today());
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] table-fixed text-xs sm:text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th scope="col" className="w-16 px-2 py-2 text-left font-medium">Day</th>
            {PERIODS.map((p) => <th key={p} scope="col" className="px-2 py-2 text-left font-medium">Period {p}</th>)}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d) => (
            <tr key={d} className={cn("border-t", d === todayDay && "bg-primary/5")}>
              <th scope="row" className="px-2 py-2 text-left font-medium">{d}{d === todayDay ? <span className="block text-[10px] text-primary">Today</span> : null}</th>
              {PERIODS.map((p) => {
                const s = map.get(`${d}:${p}`);
                const content = s ? (
                  <>
                    <span className="block truncate font-medium">{s.subjectName}</span>
                    <span className="block truncate text-muted-foreground">{mode === "section" ? s.teacherName : s.sectionLabel}</span>
                    {s.conflict ? <span className="mt-0.5 flex items-center gap-1 text-[10px] text-danger"><AlertTriangle className="size-3" /> conflict</span> : null}
                  </>
                ) : <span className="text-muted-foreground">—</span>;
                return (
                  <td key={p} className={cn("px-1.5 py-1.5 align-top", s?.conflict && "bg-danger/8")}>
                    {onCellClick ? (
                      <button type="button" onClick={() => onCellClick(d, p)} className="w-full rounded-md p-1 text-left hover:bg-muted" aria-label={`Edit ${d} period ${p}`}>{content}</button>
                    ) : <div className="p-1">{content}</div>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
