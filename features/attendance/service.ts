"use client";
import type { AttendanceStatus, GateEvent, ID, ISODate, MismatchKind } from "@/types";
import { audit, command, guardiansOf, notify, query, userName } from "@/lib/services/runtime";
import { accessibleSectionIds, assert, canAccessSection, canViewStudent, isAdminRole, isClassTeacherOf } from "@/lib/auth/scope";
import { uid } from "@/lib/codes";
import { dhakaMinutes, fmtTime, hmToMinutes, nowISO, recentSchoolDays, today, isSchoolDay, dhakaDate, addDaysISO } from "@/lib/time";
import { absenceStreak, attendancePercent, detectMismatches, isDuplicateScan, isLate, isRegisterLocked } from "./lib/attendance";
import { sectionLabel, studentBrief } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

function holidaySet(db: MockDB) {
  return new Set(db.holidays.filter((h) => h.kind === "government" || h.kind === "school").map((h) => h.date));
}
function firstName(name: string) {
  return name.split(" ")[0];
}
function gateEventsOn(db: MockDB, date: ISODate) {
  return db.gateEvents.filter((g) => dhakaDate(g.at) === date);
}

function sectionMismatches(db: MockDB, sectionId: ID, date: ISODate) {
  if (!db.school.settings.gateModuleEnabled) return [];
  const sheet = db.attendance.find((a) => a.id === `${sectionId}:${date}`);
  const ids = db.students.filter((s) => s.sectionId === sectionId && s.status === "active").map((s) => s.id);
  return detectMismatches(date, sheet, gateEventsOn(db, date), ids).map((m) => ({
    ...m,
    resolution: db.mismatchResolutions.find((r) => r.id === `${m.studentId}:${m.date}`),
  }));
}

/** After a register is saved: absent / late / mismatch / streak notifications. */
function notifyAfterRegister(db: MockDB, sectionId: ID, date: ISODate, changed: ID[]) {
  const sheet = db.attendance.find((a) => a.id === `${sectionId}:${date}`)!;
  const mismatches = sectionMismatches(db, sectionId, date);
  const days = recentSchoolDays(date, 10, db.school.settings.weeklyHolidays, holidaySet(db));
  for (const studentId of changed) {
    const st = db.students.find((s) => s.id === studentId)!;
    const status = sheet.entries[studentId];
    const g = guardiansOf(db, studentId);
    const n = firstName(st.name);
    if (status === "A") {
      notify(db, { userIds: g, type: "absent", title: `${n} was marked ABSENT in class today`, body: `${sectionLabel(db, sectionId)}, ${date}. If this is wrong, contact the class teacher.`, studentId, sms: true, link: "/parent/attendance" });
      const streak = absenceStreak(studentId, days.map((d) => db.attendance.find((a) => a.id === `${sectionId}:${d}`)));
      if (streak >= db.school.settings.consecutiveAbsenceAlert) {
        notify(db, { userIds: g, type: "absence_streak", title: `${n} has been absent ${streak} days in a row`, body: "Please contact the class teacher.", studentId, sms: true, link: "/parent/attendance" });
      }
    }
    if (status === "L" && !db.gateEvents.some((e) => e.studentId === studentId && e.late && dhakaDate(e.at) === date)) {
      notify(db, { userIds: g, type: "late", title: `${n} was marked LATE today`, body: sectionLabel(db, sectionId), studentId, sms: false });
    }
    const mm = mismatches.find((m) => m.studentId === studentId && m.kind === "gate_in_class_absent");
    if (mm) {
      notify(db, { userIds: g, type: "mismatch", title: `${n} checked in at the gate but was marked absent in class`, body: `Gate check-in at ${fmtTime(mm.gateInAt!)}. The class teacher has been alerted.`, studentId, sms: true, link: "/parent/attendance" });
      const sec = db.sections.find((s) => s.id === sectionId)!;
      notify(db, { userIds: [sec.classTeacherId], type: "mismatch", title: `Possible bunking: ${st.name}`, body: `Gate IN at ${fmtTime(mm.gateInAt!)} but absent in class.`, studentId, link: "/teacher/section" });
    }
  }
}

export const mockAttendanceService = {
  /** Sections the current teacher can take a register for. */
  async mySections() {
    return query(({ db, actor }) =>
      accessibleSectionIds(actor, db).map((id) => ({ id, label: sectionLabel(db, id), isClassTeacher: isClassTeacherOf(actor, id, db) })),
    );
  },

  async register(sectionId: ID, date: ISODate) {
    return query(({ db, actor }) => {
      assert(canAccessSection(actor, sectionId, db));
      const sheet = db.attendance.find((a) => a.id === `${sectionId}:${date}`);
      const sec = db.sections.find((s) => s.id === sectionId)!;
      const lockMin = hmToMinutes(db.school.settings.attendanceLockTime);
      const locked = isRegisterLocked(date, today(), dhakaMinutes(), lockMin);
      const gate = gateEventsOn(db, date);
      const approvedLeave = db.leaves.filter((l) => l.status === "approved" && l.from <= date && l.to >= date);
      const schoolDay = isSchoolDay(date, db.school.settings.weeklyHolidays, holidaySet(db));
      const students = db.students
        .filter((s) => s.sectionId === sectionId && s.status === "active")
        .sort((a, b) => a.roll - b.roll)
        .map((s) => {
          const gateIn = gate.filter((g) => g.studentId === s.id && g.type === "IN").sort((a, b) => a.at.localeCompare(b.at))[0];
          const onLeave = approvedLeave.some((l) => l.studentId === s.id);
          const suggested: AttendanceStatus = onLeave ? "LV" : db.school.settings.gateModuleEnabled && date === today() && gateIn ? (gateIn.late ? "L" : "P") : "P";
          return { ...studentBrief(db, s), gateInAt: gateIn?.at, gateLate: gateIn?.late ?? false, onLeave, status: sheet?.entries[s.id] ?? suggested };
        });
      const canOverride = isAdminRole(actor.role) || isClassTeacherOf(actor, sectionId, db);
      return {
        sectionLabel: sectionLabel(db, sectionId),
        shift: db.school.shifts.find((s) => s.id === sec.shiftId)!,
        date,
        schoolDay,
        submitted: Boolean(sheet),
        submittedAt: sheet?.submittedAt,
        markedBy: sheet ? userName(db, sheet.markedBy) : undefined,
        locked: Boolean(sheet) && locked,
        canEdit: !sheet || !locked || canOverride,
        needsReason: Boolean(sheet) && locked,
        edits: sheet?.edits.map((e) => ({ ...e, by: userName(db, e.byUserId) })) ?? [],
        lockTime: db.school.settings.attendanceLockTime,
        gateEnabled: db.school.settings.gateModuleEnabled,
        students,
      };
    });
  },

  async submitRegister(input: { sectionId: ID; date: ISODate; entries: Record<ID, AttendanceStatus>; reason?: string }) {
    return command(({ db, actor }) => {
      assert(canAccessSection(actor, input.sectionId, db), "You are not assigned to this section.");
      assert(actor.role === "teacher" || isAdminRole(actor.role));
      assert(isSchoolDay(input.date, db.school.settings.weeklyHolidays, holidaySet(db)), "This day is a holiday.");
      assert(input.date <= today(), "You cannot take attendance for a future date.");
      const id = `${input.sectionId}:${input.date}`;
      const sheet = db.attendance.find((a) => a.id === id);
      const locked = isRegisterLocked(input.date, today(), dhakaMinutes(), hmToMinutes(db.school.settings.attendanceLockTime));
      if (!sheet) {
        db.attendance.push({ id, schoolId: db.school.id, sectionId: input.sectionId, date: input.date, entries: input.entries, markedBy: actor.userId, submittedAt: nowISO(), edits: [] });
        notifyAfterRegister(db, input.sectionId, input.date, Object.keys(input.entries));
        return { created: true, changed: Object.keys(input.entries).length };
      }
      const changed = Object.entries(input.entries).filter(([sid, st]) => sheet.entries[sid] !== st);
      if (changed.length === 0) return { created: false, changed: 0 };
      if (locked) {
        assert(isAdminRole(actor.role) || isClassTeacherOf(actor, input.sectionId, db), "The register is locked. Ask the class teacher or admin to edit it.");
        assert(Boolean(input.reason && input.reason.trim().length >= 5), "A reason is required to edit a locked register.");
      }
      for (const [sid, st] of changed) {
        sheet.edits.push({ studentId: sid, from: sheet.entries[sid], to: st, byUserId: actor.userId, at: nowISO(), reason: input.reason ?? "Edited before lock" });
        sheet.entries[sid] = st;
      }
      if (locked) audit(db, actor.userId, "attendance.edit_after_lock", "attendance", id, { before: Object.fromEntries(changed.map(([sid]) => [sid, sheet.edits.find((e) => e.studentId === sid)?.from])), after: Object.fromEntries(changed), reason: input.reason });
      notifyAfterRegister(db, input.sectionId, input.date, changed.map(([sid]) => sid));
      return { created: false, changed: changed.length };
    });
  },

  // ---------- class teacher board ----------
  async sectionBoard(sectionId: ID) {
    return query(({ db, actor }) => {
      assert(isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role), "Only the class teacher can open this board.");
      const date = today();
      const gate = gateEventsOn(db, date);
      const sheet = db.attendance.find((a) => a.id === `${sectionId}:${date}`);
      const days = recentSchoolDays(date, 10, db.school.settings.weeklyHolidays, holidaySet(db));
      const sheetsNewest = days.map((d) => db.attendance.find((a) => a.id === `${sectionId}:${d}`));
      const past7 = recentSchoolDays(addDaysISO(date, -1), 7, db.school.settings.weeklyHolidays, holidaySet(db));
      const mismatches = [date, ...past7]
        .flatMap((d) => sectionMismatches(db, sectionId, d))
        .filter((m) => !m.resolution)
        .map((m) => ({ ...m, student: studentBrief(db, db.students.find((s) => s.id === m.studentId)!) }));
      const rows = db.students
        .filter((s) => s.sectionId === sectionId && s.status === "active")
        .sort((a, b) => a.roll - b.roll)
        .map((s) => {
          const ins = gate.filter((g) => g.studentId === s.id);
          const lastIn = ins.filter((g) => g.type === "IN").sort((a, b) => a.at.localeCompare(b.at))[0];
          const out = ins.filter((g) => g.type === "OUT").sort((a, b) => b.at.localeCompare(a.at))[0];
          const streakSheets = sheet ? sheetsNewest : sheetsNewest.slice(1);
          return {
            ...studentBrief(db, s),
            gateIn: lastIn?.at,
            gateLate: lastIn?.late ?? false,
            gateOut: out?.at,
            classStatus: sheet?.entries[s.id],
            streak: absenceStreak(s.id, streakSheets),
          };
        });
      return {
        sectionLabel: sectionLabel(db, sectionId),
        date,
        registerSubmitted: Boolean(sheet),
        gateEnabled: db.school.settings.gateModuleEnabled,
        rows,
        mismatches,
        chronic: rows.filter((r) => r.streak >= db.school.settings.consecutiveAbsenceAlert),
      };
    });
  },

  async resolveMismatch(input: { studentId: ID; date: ISODate; kind: MismatchKind; note: string }) {
    return command(({ db, actor }) => {
      const st = db.students.find((s) => s.id === input.studentId)!;
      assert(isAdminRole(actor.role) || isClassTeacherOf(actor, st.sectionId, db));
      assert(input.note.trim().length >= 3, "Write what happened.");
      db.mismatchResolutions.push({ id: `${input.studentId}:${input.date}`, studentId: input.studentId, date: input.date, kind: input.kind, resolvedBy: actor.userId, note: input.note, at: nowISO() });
      audit(db, actor.userId, "attendance.mismatch_resolve", "student", input.studentId, { reason: input.note, after: { date: input.date, kind: input.kind } });
    });
  },

  // ---------- gate ----------
  async gateLookup(q: string) {
    return query(({ db, actor }) => {
      assert(actor.role === "gate_staff" || isAdminRole(actor.role));
      const term = q.trim().toLowerCase();
      if (term.length < 2) return [];
      return db.students
        .filter((s) => s.status === "active" && (s.studentId.toLowerCase() === term || s.studentId.toLowerCase().includes(term) || s.name.toLowerCase().includes(term)))
        .slice(0, 8)
        .map((s) => gateCard(db, s.id));
    });
  },

  async gateCardFor(studentCode: string) {
    return query(({ db, actor }) => {
      assert(actor.role === "gate_staff" || isAdminRole(actor.role));
      const s = db.students.find((x) => x.studentId.toLowerCase() === studentCode.trim().toLowerCase());
      if (!s) throw new Error("No student with this ID.");
      return gateCard(db, s.id);
    });
  },

  /** Record a gate scan. `at` lets the offline queue replay scans with their original time. */
  async gateScan(input: { studentId: ID; type: GateEvent["type"]; at?: string; reason?: string; pickedUpBy?: string }) {
    return command(({ db, actor }) => {
      assert(actor.role === "gate_staff" || isAdminRole(actor.role));
      assert(db.school.settings.gateModuleEnabled, "The gate module is turned off for this school.");
      const st = db.students.find((s) => s.id === input.studentId)!;
      const at = input.at ?? nowISO();
      if (isDuplicateScan(db.gateEvents, st.id, input.type, at)) return { duplicate: true as const };
      const sec = db.sections.find((s) => s.id === st.sectionId)!;
      const shift = db.school.shifts.find((s) => s.id === sec.shiftId)!;
      const minutes = dhakaMinutes(at);
      const late = input.type === "IN" && isLate(minutes, hmToMinutes(shift.startTime), shift.graceMinutes);
      const early = input.type === "OUT" && minutes < hmToMinutes(shift.endTime);
      if (early) assert(Boolean(input.reason), "Early checkout needs a reason.");
      const ev: GateEvent = { id: uid("g"), schoolId: db.school.id, studentId: st.id, type: input.type, at, byUserId: actor.userId, late, reason: input.reason, pickedUpBy: input.pickedUpBy, syncedAt: nowISO() };
      db.gateEvents.push(ev);
      const g = guardiansOf(db, st.id);
      const n = firstName(st.name);
      if (input.type === "IN") {
        notify(db, late
          ? { userIds: g, type: "late", title: `${n} arrived LATE at ${fmtTime(at)}`, body: `School starts at ${shift.startTime}.`, studentId: st.id, sms: true, link: "/parent/attendance" }
          : { userIds: g, type: "gate_in", title: `${n} arrived at school at ${fmtTime(at)}`, body: "Checked in at the gate.", studentId: st.id, sms: true, link: "/parent/attendance" });
      } else if (early) {
        notify(db, { userIds: g, type: "left_early", title: `${n} left school at ${fmtTime(at)}`, body: `Reason: ${input.reason}${input.pickedUpBy ? `, picked up by: ${input.pickedUpBy}` : ""}.`, studentId: st.id, sms: true, link: "/parent/attendance" });
      } else {
        notify(db, { userIds: g, type: "gate_out", title: `${n} checked out at ${fmtTime(at)}`, body: "Left school after classes.", studentId: st.id, sms: false });
      }
      return { duplicate: false as const, late, early, event: ev };
    });
  },

  async gateLog(date?: ISODate) {
    return query(({ db, actor }) => {
      assert(actor.role === "gate_staff" || isAdminRole(actor.role));
      const d = date ?? today();
      return gateEventsOn(db, d)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((e) => {
          const s = db.students.find((x) => x.id === e.studentId)!;
          return { ...e, student: studentBrief(db, s), by: userName(db, e.byUserId) };
        });
    });
  },

  async correctGateEvent(input: { eventId: ID; action: "delete" | "flip"; reason: string }) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role), "Only admin can correct gate records.");
      assert(input.reason.trim().length >= 5, "A reason is required.");
      const ev = db.gateEvents.find((e) => e.id === input.eventId)!;
      const before = { ...ev };
      if (input.action === "delete") db.gateEvents = db.gateEvents.filter((e) => e.id !== input.eventId);
      else {
        ev.type = ev.type === "IN" ? "OUT" : "IN";
        ev.correctedBy = actor.userId;
        ev.correctionReason = input.reason;
      }
      audit(db, actor.userId, "gate.correct", "gate_event", input.eventId, { before, after: input.action, reason: input.reason });
    });
  },

  // ---------- parent / student views ----------
  async studentMonth(studentId: ID, month: string /* yyyy-MM */) {
    return query(({ db, actor }) => {
      assert(canViewStudent(actor, studentId, db));
      const st = db.students.find((s) => s.id === studentId)!;
      const sheets = db.attendance.filter((a) => a.sectionId === st.sectionId);
      const days = sheets
        .filter((a) => a.date.startsWith(month))
        .map((a) => ({ date: a.date, status: a.entries[studentId] }))
        .filter((d) => d.status);
      const gate = db.gateEvents.filter((g) => g.studentId === studentId && dhakaDate(g.at).startsWith(month));
      const termStatuses = sheets.map((a) => a.entries[studentId]).filter(Boolean);
      return {
        student: studentBrief(db, st),
        days,
        gate: gate.map((g) => ({ date: dhakaDate(g.at), type: g.type, at: g.at, late: g.late, reason: g.reason, pickedUpBy: g.pickedUpBy })),
        termPercent: attendancePercent(termStatuses),
        counts: { P: termStatuses.filter((s) => s === "P").length, A: termStatuses.filter((s) => s === "A").length, L: termStatuses.filter((s) => s === "L").length, LV: termStatuses.filter((s) => s === "LV").length },
        weeklyHolidays: db.school.settings.weeklyHolidays,
        holidays: db.holidays.filter((h) => h.date.startsWith(month)),
        gateEnabled: db.school.settings.gateModuleEnabled,
      };
    });
  },

  async todayStatus(studentId: ID) {
    return query(({ db, actor }) => {
      assert(canViewStudent(actor, studentId, db));
      const st = db.students.find((s) => s.id === studentId)!;
      const date = today();
      const ev = gateEventsOn(db, date).filter((g) => g.studentId === studentId).sort((a, b) => a.at.localeCompare(b.at));
      const sheet = db.attendance.find((a) => a.id === `${st.sectionId}:${date}`);
      const schoolDay = isSchoolDay(date, db.school.settings.weeklyHolidays, holidaySet(db));
      return { schoolDay, gateIn: ev.find((e) => e.type === "IN"), gateOut: [...ev].reverse().find((e) => e.type === "OUT"), classStatus: sheet?.entries[studentId], gateEnabled: db.school.settings.gateModuleEnabled };
    });
  },

  // ---------- admin overview ----------
  async overview(days = 14) {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      const list = recentSchoolDays(today(), days, db.school.settings.weeklyHolidays, holidaySet(db)).reverse();
      const trend = list.map((d) => {
        const sheets = db.attendance.filter((a) => a.date === d);
        const statuses = sheets.flatMap((s) => Object.values(s.entries));
        return { date: d, percent: statuses.length ? attendancePercent(statuses) : null, sections: sheets.length };
      });
      const date = today();
      const bySection = db.sections.map((s) => {
        const sheet = db.attendance.find((a) => a.id === `${s.id}:${date}`);
        const statuses = sheet ? Object.values(sheet.entries) : [];
        return {
          id: s.id,
          label: sectionLabel(db, s.id),
          shift: db.school.shifts.find((x) => x.id === s.shiftId)!.name,
          submitted: Boolean(sheet),
          percent: sheet ? attendancePercent(statuses) : null,
          absent: statuses.filter((x) => x === "A").length,
          late: statuses.filter((x) => x === "L").length,
          mismatches: sectionMismatches(db, s.id, date).filter((m) => !m.resolution).length,
        };
      });
      return { trend, bySection, date };
    });
  },
};

function gateCard(db: MockDB, studentId: ID) {
  const s = db.students.find((x) => x.id === studentId)!;
  const ev = gateEventsOn(db, today()).filter((g) => g.studentId === studentId).sort((a, b) => b.at.localeCompare(a.at));
  const sec = db.sections.find((x) => x.id === s.sectionId)!;
  const onLeave = db.leaves.some((l) => l.studentId === studentId && l.status === "approved" && l.from <= today() && l.to >= today());
  return { ...studentBrief(db, s), shift: db.school.shifts.find((x) => x.id === sec.shiftId)!, lastEvent: ev[0], onLeave };
}

export type AttendanceService = typeof mockAttendanceService;
