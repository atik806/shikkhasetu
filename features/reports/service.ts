"use client";
import type { ID } from "@/types";
import { query, userName } from "@/lib/services/runtime";
import { accessibleSectionIds, assert, childIds, isAdminRole } from "@/lib/auth/scope";
import { attendancePercent } from "@/features/attendance/lib/attendance";
import { needsFollowUp } from "@/features/acknowledgments/lib/anomaly";
import { sectionLabel, studentBrief, subjectName } from "@/lib/services/lookups";
import { today, dhakaDate } from "@/lib/time";

export const mockReportService = {
  async sectionsForReports() {
    return query(({ db, actor }) => {
      const ids = isAdminRole(actor.role) ? db.sections.map((s) => s.id) : accessibleSectionIds(actor, db);
      return ids.map((id) => ({ id, label: sectionLabel(db, id) }));
    });
  },
  /** Class result analysis for one exam and one section. */
  async resultAnalysis(examId: ID, sectionId: ID) {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role) || accessibleSectionIds(actor, db).includes(sectionId));
      const rows = db.results.filter((r) => r.examId === examId && r.sectionId === sectionId && r.state === "PUBLISHED");
      const grades = ["A+", "A", "A-", "B", "C", "D", "F"].map((g) => ({ grade: g, count: rows.filter((r) => r.letter === g).length }));
      const subjectIds = [...new Set(rows.flatMap((r) => r.subjectResults.map((s) => s.subjectId)))];
      const subjects = subjectIds.map((id) => {
        const list = rows.map((r) => r.subjectResults.find((s) => s.subjectId === id)!).filter(Boolean);
        return { subject: subjectName(db, id), average: list.length ? Math.round(list.reduce((s, x) => s + x.percent, 0) / list.length) : 0, failed: list.filter((x) => x.gp === 0 && !x.isOptional).length };
      });
      return {
        total: rows.length,
        passRate: rows.length ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : 0,
        averageGpa: rows.length ? Math.round((rows.reduce((s, r) => s + r.gpa, 0) / rows.length) * 100) / 100 : 0,
        grades,
        subjects,
        top: [...rows].sort((a, b) => (a.sectionPosition ?? 99) - (b.sectionPosition ?? 99)).slice(0, 5).map((r) => ({ name: db.students.find((s) => s.id === r.studentId)!.name, gpa: r.gpa, position: r.sectionPosition })),
        exams: db.exams.filter((e) => db.sectionResults.some((x) => x.examId === e.id && x.sectionId === sectionId && x.state === "PUBLISHED")).map((e) => ({ id: e.id, name: e.name })),
      };
    });
  },
  async attendanceReport(sectionId: ID, month: string) {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role) || accessibleSectionIds(actor, db).includes(sectionId));
      const sheets = db.attendance.filter((a) => a.sectionId === sectionId && a.date.startsWith(month));
      return db.students
        .filter((s) => s.sectionId === sectionId && s.status === "active")
        .sort((a, b) => a.roll - b.roll)
        .map((s) => {
          const st = sheets.map((x) => x.entries[s.id]).filter(Boolean);
          return { ...studentBrief(db, s), days: st.length, present: st.filter((x) => x === "P").length, late: st.filter((x) => x === "L").length, absent: st.filter((x) => x === "A").length, leave: st.filter((x) => x === "LV").length, percent: attendancePercent(st) };
        });
    });
  },
  /** Admin dashboard numbers. */
  async adminDashboard() {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      const t = today();
      const todays = db.attendance.filter((a) => a.date === t);
      const statuses = todays.flatMap((a) => Object.values(a.entries));
      const pendingPublish = db.sectionResults.filter((r) => r.state === "LOCKED").map((r) => ({ id: r.id, examId: r.examId, exam: db.exams.find((e) => e.id === r.examId)!.name, section: sectionLabel(db, r.sectionId) }));
      const month = t.slice(0, 7);
      const collected = db.payments.filter((p) => p.at.slice(0, 7) === month).reduce((s, p) => s + p.amount, 0);
      const latestExam = [...db.exams].filter((e) => db.sectionResults.some((r) => r.examId === e.id && r.state === "PUBLISHED")).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
      const rvs = latestExam ? db.results.filter((r) => r.examId === latestExam.id && r.state === "PUBLISHED") : [];
      const acked = rvs.filter((r) => db.acks.some((a) => a.resultVersionId === r.id)).length;
      const flagged = db.acks.filter((a) => rvs.some((r) => r.id === a.resultVersionId) && needsFollowUp(a)).length;
      const gateToday = db.gateEvents.filter((g) => dhakaDate(g.at) === t && g.type === "IN");
      return {
        attendanceToday: statuses.length ? attendancePercent(statuses) : null,
        registersSubmitted: todays.length,
        sections: db.sections.length,
        gateInToday: gateToday.length,
        pendingPublish,
        ackRate: rvs.length ? Math.round((acked / rvs.length) * 100) : null,
        ackExam: latestExam?.name,
        flagged,
        collected,
        students: db.students.filter((s) => s.status === "active").length,
        teachers: db.users.filter((u) => u.roles.includes("teacher")).length,
        pendingLeaves: db.leaves.filter((l) => l.status === "pending").length,
        recentAudit: [...db.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6).map((a) => ({ ...a, actor: userName(db, a.actorId) })),
      };
    });
  },
  async audit(filter: { q?: string; action?: string }) {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role), "Only admin can view the audit log.");
      const q = filter.q?.toLowerCase().trim();
      return [...db.audit]
        .filter((a) => (filter.action && filter.action !== "all" ? a.action.startsWith(filter.action) : true))
        .map((a) => ({ ...a, actor: userName(db, a.actorId) }))
        .filter((a) => (q ? `${a.action} ${a.actor} ${a.entityId} ${a.reason ?? ""}`.toLowerCase().includes(q) : true))
        .sort((a, b) => b.at.localeCompare(a.at));
    });
  },
  async myChildren() {
    return query(({ db, actor }) => {
      assert(actor.role === "parent");
      return childIds(actor.userId, db).map((id) => {
        const s = db.students.find((x) => x.id === id)!;
        const sec = db.sections.find((x) => x.id === s.sectionId)!;
        return { ...studentBrief(db, s), classTeacher: userName(db, sec.classTeacherId), relation: s.guardians.find((g) => g.guardianUserId === actor.userId)!.relation };
      });
    });
  },
  async myStudent() {
    return query(({ db, actor }) => {
      assert(actor.role === "student");
      const s = db.students.find((x) => x.userId === actor.userId)!;
      const sec = db.sections.find((x) => x.id === s.sectionId)!;
      return { ...studentBrief(db, s), classTeacher: userName(db, sec.classTeacherId), dob: s.dob, bloodGroup: s.bloodGroup, school: db.school.name, schoolBn: db.school.nameBn, address: db.school.address, phone: db.school.phone, year: db.school.academicYear, shift: db.school.shifts.find((x) => x.id === sec.shiftId)!.name };
    });
  },
};

export type ReportService = typeof mockReportService;
