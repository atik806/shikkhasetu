import type { AttendanceSheet, AttendanceStatus, GateEvent, ID, ISODate, MismatchKind } from "@/types";

export interface Mismatch {
  studentId: ID;
  date: ISODate;
  kind: MismatchKind;
  gateInAt?: string;
}

/**
 * Compare gate check-ins with the class register for one day.
 * - gate IN but marked absent in class → possible bunking
 * - present/late in class but no gate IN → missed scan or entered another way
 * Students on approved leave are ignored.
 */
export function detectMismatches(
  date: ISODate,
  sheet: AttendanceSheet | undefined,
  gateEvents: GateEvent[],
  studentIds: ID[],
): Mismatch[] {
  if (!sheet) return [];
  const firstIn = new Map<ID, string>();
  for (const e of gateEvents) {
    if (e.type !== "IN") continue;
    const prev = firstIn.get(e.studentId);
    if (!prev || e.at < prev) firstIn.set(e.studentId, e.at);
  }
  const out: Mismatch[] = [];
  for (const id of studentIds) {
    const status = sheet.entries[id];
    if (!status || status === "LV") continue;
    const gateIn = firstIn.get(id);
    if (gateIn && status === "A") out.push({ studentId: id, date, kind: "gate_in_class_absent", gateInAt: gateIn });
    if (!gateIn && (status === "P" || status === "L")) out.push({ studentId: id, date, kind: "class_present_no_gate" });
  }
  return out;
}

/** Consecutive absences ending at the most recent school day. `sheets` newest first, school days only. */
export function absenceStreak(studentId: ID, sheetsNewestFirst: (AttendanceSheet | undefined)[]): number {
  let n = 0;
  for (const s of sheetsNewestFirst) {
    if (!s) break;
    const st = s.entries[studentId];
    if (st === "A") n++;
    else break;
  }
  return n;
}

export function attendancePercent(statuses: AttendanceStatus[]): number {
  const counted = statuses.filter((s) => s !== "LV");
  if (counted.length === 0) return 100;
  const present = counted.filter((s) => s === "P" || s === "L").length;
  return Math.round((present / counted.length) * 1000) / 10;
}

/** Gate: ignore a repeat scan of the same type within `windowMs`. */
export function isDuplicateScan(events: GateEvent[], studentId: ID, type: GateEvent["type"], at: string, windowMs = 120_000): boolean {
  const t = new Date(at).getTime();
  return events.some((e) => e.studentId === studentId && e.type === type && Math.abs(new Date(e.at).getTime() - t) < windowMs);
}

export function isLate(arrivalMinutes: number, shiftStartMinutes: number, graceMinutes: number): boolean {
  return arrivalMinutes > shiftStartMinutes + graceMinutes;
}

/** Register is editable by the subject/class teacher until lock time on the same day. */
export function isRegisterLocked(sheetDate: ISODate, todayDate: ISODate, nowMinutes: number, lockMinutes: number): boolean {
  if (sheetDate < todayDate) return true;
  if (sheetDate > todayDate) return false;
  return nowMinutes >= lockMinutes;
}
