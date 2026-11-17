import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO } from "date-fns";
import type { ISODate, Weekday } from "@/types";

export const TZ = "Asia/Dhaka";

/** Dev-panel clock override (milliseconds added to the real clock). */
let clockOffsetMs = 0;
export function setClockOffset(ms: number) {
  clockOffsetMs = ms;
}
export function getClockOffset() {
  return clockOffsetMs;
}

/** Clock offset that makes "now" read as HH:mm today in Dhaka (dev panel time travel). */
export function offsetToDhakaTime(hm: string): number {
  return new Date(dhakaDateTime(today(), hm)).getTime() - Date.now();
}

export function now(): Date {
  return new Date(Date.now() + clockOffsetMs);
}
export function nowISO(): string {
  return now().toISOString();
}

export function dhaka(d: Date | string | number): TZDate {
  const ms = typeof d === "string" ? parseISO(d).getTime() : typeof d === "number" ? d : d.getTime();
  return new TZDate(ms, TZ);
}

/** Calendar date in Dhaka, yyyy-MM-dd. */
export function dhakaDate(d: Date | string | number = now()): ISODate {
  return format(dhaka(d), "yyyy-MM-dd");
}
export function today(): ISODate {
  return dhakaDate(now());
}

/** Minutes since midnight, Dhaka time. */
export function dhakaMinutes(d: Date | string | number = now()): number {
  const t = dhaka(d);
  return t.getHours() * 60 + t.getMinutes();
}

export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** Build an ISO timestamp from a Dhaka calendar date + HH:mm. */
export function dhakaDateTime(date: ISODate, hm: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  return new TZDate(y, mo - 1, d, h, mi, 0, TZ).toISOString();
}

const WEEKDAYS: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function weekdayOf(date: ISODate): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addDaysISO(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  return format(addDays(new Date(y, m - 1, d), n), "yyyy-MM-dd");
}

export function isSchoolDay(date: ISODate, weeklyHolidays: Weekday[], holidayDates: Set<string>): boolean {
  return !weeklyHolidays.includes(weekdayOf(date)) && !holidayDates.has(date);
}

/** Previous `count` school days ending at `end` (inclusive), newest first. */
export function recentSchoolDays(end: ISODate, count: number, weeklyHolidays: Weekday[], holidayDates: Set<string>): ISODate[] {
  const out: ISODate[] = [];
  let d = end;
  let guard = 0;
  while (out.length < count && guard < count * 3 + 30) {
    if (isSchoolDay(d, weeklyHolidays, holidayDates)) out.push(d);
    d = addDaysISO(d, -1);
    guard++;
  }
  return out;
}

export function fmtDate(d: string, pattern = "d MMM yyyy"): string {
  return format(d.length === 10 ? parseISO(d) : dhaka(d), pattern);
}
export function fmtDateTime(d: string): string {
  return format(dhaka(d), "d MMM yyyy, h:mm a");
}
export function fmtTime(d: string): string {
  return format(dhaka(d), "h:mm a");
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBanglaDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (c) => BN_DIGITS[Number(c)]);
}
