"use client";
import type { ID, Weekday } from "@/types";
import { audit, command, query, userName } from "@/lib/services/runtime";
import { assert, canViewStudent, isAdminRole } from "@/lib/auth/scope";
import { sectionLabel, subjectName } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

export const DAYS: Weekday[] = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
export const PERIODS = [1, 2, 3, 4, 5, 6];

/** A teacher in two places at once, or one room booked twice in the same shift. */
export function findConflicts(db: Pick<MockDB, "timetable" | "sections">) {
  const out: { day: Weekday; period: number; kind: "teacher" | "room"; ids: ID[]; key: string }[] = [];
  const byTeacher = new Map<string, ID[]>();
  const byRoom = new Map<string, ID[]>();
  for (const s of db.timetable) {
    const sec = db.sections.find((x) => x.id === s.sectionId)!;
    const tk = `${s.day}:${s.period}:${sec.shiftId}:${s.teacherId}`;
    byTeacher.set(tk, [...(byTeacher.get(tk) ?? []), s.id]);
    const rk = `${s.day}:${s.period}:${sec.shiftId}:${sec.room}`;
    byRoom.set(rk, [...(byRoom.get(rk) ?? []), s.id]);
  }
  for (const [k, ids] of byTeacher) if (ids.length > 1) out.push({ day: k.split(":")[0] as Weekday, period: Number(k.split(":")[1]), kind: "teacher", ids, key: k });
  for (const [k, ids] of byRoom) if (ids.length > 1) out.push({ day: k.split(":")[0] as Weekday, period: Number(k.split(":")[1]), kind: "room", ids, key: k });
  return out;
}

function grid(db: MockDB, slots: MockDB["timetable"]) {
  return slots.map((s) => ({ ...s, subjectName: subjectName(db, s.subjectId), teacherName: userName(db, s.teacherId), sectionLabel: sectionLabel(db, s.sectionId) }));
}

export const mockTimetableService = {
  async section(sectionId: ID) {
    return query(({ db, actor }) => {
      if (actor.role === "parent" || actor.role === "student") {
        assert(db.students.some((s) => s.sectionId === sectionId && canViewStudent(actor, s.id, db)));
      }
      const conflicts = isAdminRole(actor.role) ? findConflicts(db) : [];
      const conflictIds = new Set(conflicts.flatMap((c) => c.ids));
      return {
        label: sectionLabel(db, sectionId),
        shift: db.school.shifts.find((x) => x.id === db.sections.find((s) => s.id === sectionId)?.shiftId),
        slots: grid(db, db.timetable.filter((t) => t.sectionId === sectionId)).map((s) => ({ ...s, conflict: conflictIds.has(s.id) })),
        options: db.assignments.filter((a) => a.sectionId === sectionId).map((a) => ({ subjectId: a.subjectId, teacherId: a.teacherId, label: `${subjectName(db, a.subjectId)} — ${userName(db, a.teacherId)}` })),
        conflicts: conflicts.filter((c) => c.ids.some((id) => id.startsWith(`${sectionId}:`))).map((c) => ({ ...c, sections: c.ids.map((id) => sectionLabel(db, id.split(":")[0])) })),
      };
    });
  },
  async teacher(teacherId?: ID) {
    return query(({ db, actor }) => {
      const id = teacherId ?? actor.userId;
      assert(isAdminRole(actor.role) || id === actor.userId);
      return grid(db, db.timetable.filter((t) => t.teacherId === id));
    });
  },
  async setSlot(input: { sectionId: ID; day: Weekday; period: number; subjectId: ID; teacherId: ID }) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role), "Only admin can edit the timetable.");
      const id = `${input.sectionId}:${input.day}:${input.period}`;
      const existing = db.timetable.find((t) => t.id === id);
      const before = existing ? { subjectId: existing.subjectId, teacherId: existing.teacherId } : undefined;
      if (existing) Object.assign(existing, input);
      else db.timetable.push({ id, ...input });
      audit(db, actor.userId, "timetable.set", "timetable", id, { before, after: input });
      return findConflicts(db).filter((c) => c.ids.includes(id)).length;
    });
  },
};

export type TimetableService = typeof mockTimetableService;
