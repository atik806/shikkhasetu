"use client";
import type { ID } from "@/types";
import { audit, command, notify, query, userName } from "@/lib/services/runtime";
import { assert, canViewStudent, childIds, classTeacherSectionIds, isAdminRole, isClassTeacherOf } from "@/lib/auth/scope";
import { uid } from "@/lib/codes";
import { nowISO, today } from "@/lib/time";
import { sectionLabel } from "@/lib/services/lookups";

export const mockLeaveService = {
  async list() {
    return query(({ db, actor }) => {
      let ids: Set<ID>;
      if (isAdminRole(actor.role)) ids = new Set(db.students.map((s) => s.id));
      else if (actor.role === "teacher") {
        const secs = new Set(classTeacherSectionIds(actor.userId, db));
        ids = new Set(db.students.filter((s) => secs.has(s.sectionId)).map((s) => s.id));
      } else if (actor.role === "parent") ids = new Set(childIds(actor.userId, db));
      else if (actor.role === "student") ids = new Set(db.students.filter((s) => s.userId === actor.userId).map((s) => s.id));
      else ids = new Set();
      return db.leaves
        .filter((l) => ids.has(l.studentId))
        .sort((a, b) => Number(a.status !== "pending") - Number(b.status !== "pending") || b.createdAt.localeCompare(a.createdAt))
        .map((l) => {
          const s = db.students.find((x) => x.id === l.studentId)!;
          return { ...l, studentName: s.name, sectionLabel: sectionLabel(db, s.sectionId), requestedByName: userName(db, l.requestedBy), decidedByName: userName(db, l.decidedBy), canDecide: l.status === "pending" && (isAdminRole(actor.role) || isClassTeacherOf(actor, s.sectionId, db)) };
        });
    });
  },
  async submit(input: { studentId: ID; from: string; to: string; reason: string; attachmentName?: string }) {
    return command(({ db, actor }) => {
      assert(actor.role === "parent" && canViewStudent(actor, input.studentId, db), "Only a guardian can request leave.");
      assert(input.to >= input.from, "End date must be on or after the start date.");
      assert(input.from >= today(), "Leave cannot start in the past. Contact the class teacher for past absences.");
      assert(input.reason.trim().length >= 5, "Write a short reason.");
      db.leaves.push({ id: uid("lv"), ...input, requestedBy: actor.userId, status: "pending", createdAt: nowISO() });
      const s = db.students.find((x) => x.id === input.studentId)!;
      const sec = db.sections.find((x) => x.id === s.sectionId)!;
      notify(db, { userIds: [sec.classTeacherId], type: "leave_update", title: `Leave request: ${s.name}`, body: `${input.from} → ${input.to}: ${input.reason}`, studentId: s.id, link: "/teacher/leave" });
    });
  },
  async decide(input: { leaveId: ID; approve: boolean; note?: string }) {
    return command(({ db, actor }) => {
      const l = db.leaves.find((x) => x.id === input.leaveId)!;
      const s = db.students.find((x) => x.id === l.studentId)!;
      assert(isAdminRole(actor.role) || isClassTeacherOf(actor, s.sectionId, db), "Only the class teacher can decide.");
      assert(l.status === "pending", "Already decided.");
      l.status = input.approve ? "approved" : "rejected";
      l.decidedBy = actor.userId;
      l.decidedAt = nowISO();
      l.decisionNote = input.note;
      // approved leave marks any already-taken registers in the range as LV
      if (input.approve) db.attendance.filter((a) => a.sectionId === s.sectionId && a.date >= l.from && a.date <= l.to && a.entries[s.id] === "A").forEach((a) => (a.entries[s.id] = "LV"));
      audit(db, actor.userId, `leave.${l.status}`, "leave", l.id, { reason: input.note });
      notify(db, { userIds: s.guardians.map((g) => g.guardianUserId), type: "leave_update", title: `Leave ${l.status} for ${s.name.split(" ")[0]}`, body: `${l.from} → ${l.to}${input.note ? ` — ${input.note}` : ""}`, studentId: s.id, sms: true, link: "/parent/leave" });
    });
  },
};

export type LeaveService = typeof mockLeaveService;
