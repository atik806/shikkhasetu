"use client";
import type { Exam, ExamSubjectConfig, ID, MarkSheet, MarkValue, ResultVersion } from "@/types";
import { audit, command, guardiansOf, notify, publicQuery, query, userName } from "@/lib/services/runtime";
import { accessibleSectionIds, assert, canTeach, canViewStudent, isAdminRole, isClassTeacherOf } from "@/lib/auth/scope";
import { uid, verificationCode } from "@/lib/codes";
import { addDaysISO, dhakaDate, nowISO } from "@/lib/time";
import { computeResult, rankPositions } from "./lib/grading";
import { canLock, canPublish, sectionWorkflowState } from "./lib/workflow";
import { attendancePercent } from "@/features/attendance/lib/attendance";
import { relationLabel, sectionLabel, studentBrief, subjectName } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

function examConfig(db: MockDB, examId: ID, sectionId: ID): ExamSubjectConfig[] {
  const exam = db.exams.find((e) => e.id === examId)!;
  const sec = db.sections.find((s) => s.id === sectionId)!;
  return exam.subjectsByClass[sec.classId] ?? [];
}

function sheetsFor(db: MockDB, examId: ID, sectionId: ID) {
  return examConfig(db, examId, sectionId).map((cfg) => ({
    cfg,
    sheet: db.markSheets.find((m) => m.id === `${examId}:${sectionId}:${cfg.subjectId}`),
  }));
}

function sectionState(db: MockDB, examId: ID, sectionId: ID) {
  const id = `${examId}:${sectionId}`;
  let s = db.sectionResults.find((r) => r.id === id);
  if (!s) {
    s = { id, examId, sectionId, state: "OPEN" };
    db.sectionResults.push(s);
  }
  return s;
}

export function ackDeadline(db: MockDB, rv: Pick<ResultVersion, "publishedAt">) {
  return addDaysISO(dhakaDate(rv.publishedAt), db.school.settings.ackDeadlineDays);
}

/** Compute results for every active student in a section from its mark sheets. */
function computeSection(db: MockDB, examId: ID, sectionId: ID) {
  const exam = db.exams.find((e) => e.id === examId)!;
  const scale = db.gradingScales.find((g) => g.id === exam.gradingScaleId)!;
  const pairs = sheetsFor(db, examId, sectionId);
  const students = db.students.filter((s) => s.sectionId === sectionId && s.status === "active");
  const rows = students.map((st) => {
    const computed = computeResult(
      pairs.map(({ cfg, sheet }) => ({
        subjectId: cfg.subjectId,
        isOptional: db.subjects.find((s) => s.id === cfg.subjectId)?.isOptional ?? false,
        components: cfg.components.map((c) => ({ key: c.key, fullMarks: c.fullMarks, mustPassSeparately: c.mustPassSeparately, value: sheet?.entries[st.id]?.[c.key] })),
      })),
      scale,
    );
    return { id: st.id, studentId: st.id, ...computed };
  });
  const pos = rankPositions(rows);
  const highest = new Map<ID, number>();
  rows.forEach((r) => r.subjectResults.forEach((s) => highest.set(s.subjectId, Math.max(highest.get(s.subjectId) ?? 0, s.obtained))));
  return rows.map((r) => ({ ...r, sectionPosition: pos.get(r.id)!, subjectResults: r.subjectResults.map((s) => ({ ...s, highest: highest.get(s.subjectId) })) }));
}

function remarkFor(passed: boolean, gpa: number) {
  if (!passed) return "Needs special attention. Please meet the class teacher.";
  if (gpa >= 4.5) return "Excellent work. Keep it up.";
  if (gpa >= 3.5) return "Good progress. Practice regularly.";
  return "Needs more practice at home.";
}

function resultView(db: MockDB, rv: ResultVersion) {
  const exam = db.exams.find((e) => e.id === rv.examId)!;
  const cfg = examConfig(db, rv.examId, rv.sectionId);
  return {
    ...rv,
    examName: exam.name,
    examNameBn: exam.nameBn,
    examKind: exam.kind,
    sectionLabel: sectionLabel(db, rv.sectionId),
    subjects: rv.subjectResults.map((s) => ({
      ...s,
      name: subjectName(db, s.subjectId),
      nameBn: db.subjects.find((x) => x.id === s.subjectId)?.nameBn ?? "",
      components: cfg.find((c) => c.subjectId === s.subjectId)?.components ?? [],
    })),
    deadline: ackDeadline(db, rv),
  };
}

export const mockResultService = {
  async exams() {
    return query(({ db, actor }) => {
      const sectionIds = new Set(isAdminRole(actor.role) ? db.sections.map((s) => s.id) : accessibleSectionIds(actor, db));
      return db.exams
        .map((e) => {
          const states = db.sectionResults.filter((r) => r.examId === e.id && sectionIds.has(r.sectionId));
          return {
            ...e,
            counts: { open: states.filter((s) => s.state === "OPEN").length, locked: states.filter((s) => s.state === "LOCKED").length, published: states.filter((s) => s.state === "PUBLISHED").length, total: sectionIds.size },
          };
        })
        .sort((a, b) => b.startDate.localeCompare(a.startDate));
    });
  },

  async createExam(input: { name: string; nameBn: string; kind: Exam["kind"]; startDate: string; endDate: string; classIds: ID[]; fullMarks: number; mcqMarks: number }) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role), "Only admin can create exams.");
      assert(input.classIds.length > 0, "Choose at least one class.");
      assert(input.endDate >= input.startDate, "End date must be after start date.");
      const subjectsByClass: Exam["subjectsByClass"] = {};
      for (const classId of input.classIds) {
        subjectsByClass[classId] = db.subjects
          .filter((s) => s.classId === classId)
          .map((s) => ({
            subjectId: s.id,
            components:
              input.mcqMarks > 0
                ? [
                    { key: "written", label: "Written", fullMarks: input.fullMarks - input.mcqMarks, mustPassSeparately: true },
                    { key: "mcq", label: "MCQ", fullMarks: input.mcqMarks, mustPassSeparately: true },
                  ]
                : [{ key: "written", label: "Written", fullMarks: input.fullMarks, mustPassSeparately: false }],
          }));
      }
      const exam: Exam = { id: uid("ex"), schoolId: db.school.id, name: input.name, nameBn: input.nameBn, kind: input.kind, classIds: input.classIds, startDate: input.startDate, endDate: input.endDate, gradingScaleId: db.gradingScales[0].id, subjectsByClass };
      db.exams.push(exam);
      db.sections.filter((s) => input.classIds.includes(s.classId)).forEach((s) => sectionState(db, exam.id, s.id));
      audit(db, actor.userId, "exam.create", "exam", exam.id, { after: { name: exam.name } });
      return exam.id;
    });
  },

  /** Admin: per-section status for one exam. */
  async examStatus(examId: ID) {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      const exam = db.exams.find((e) => e.id === examId)!;
      return {
        exam,
        sections: db.sections
          .filter((s) => exam.classIds.includes(s.classId))
          .map((s) => {
            const pairs = sheetsFor(db, examId, s.id);
            const st = db.sectionResults.find((r) => r.id === `${examId}:${s.id}`);
            const rvs = db.results.filter((r) => r.examId === examId && r.sectionId === s.id && r.state === "PUBLISHED");
            const acked = rvs.filter((r) => db.acks.some((a) => a.resultVersionId === r.id)).length;
            return {
              sectionId: s.id,
              label: sectionLabel(db, s.id),
              classTeacher: userName(db, s.classTeacherId),
              state: st?.state ?? "OPEN",
              submitted: pairs.filter((p) => p.sheet?.status === "SUBMITTED").length,
              subjects: pairs.length,
              workflow: sectionWorkflowState(st?.state ?? "OPEN", pairs.map((p) => p.sheet?.status ?? "DRAFT")),
              publishedAt: st?.publishedAt,
              ackRate: rvs.length ? Math.round((acked / rvs.length) * 100) : null,
            };
          }),
      };
    });
  },

  /** Teacher: every (exam, section, subject) sheet they own. */
  async myMarkSheets() {
    return query(({ db, actor }) => {
      const mine = db.assignments.filter((a) => a.teacherId === actor.userId);
      return db.exams
        .flatMap((e) =>
          mine
            .filter((a) => e.classIds.includes(db.sections.find((s) => s.id === a.sectionId)!.classId))
            .map((a) => {
              const sheet = db.markSheets.find((m) => m.id === `${e.id}:${a.sectionId}:${a.subjectId}`);
              const st = db.sectionResults.find((r) => r.id === `${e.id}:${a.sectionId}`);
              const total = db.students.filter((s) => s.sectionId === a.sectionId && s.status === "active").length;
              return { examId: e.id, examName: e.name, sectionId: a.sectionId, sectionLabel: sectionLabel(db, a.sectionId), subjectId: a.subjectId, subjectName: subjectName(db, a.subjectId), status: sheet?.status ?? "DRAFT", entered: sheet ? Object.keys(sheet.entries).length : 0, total, sectionState: st?.state ?? "OPEN", startDate: e.startDate };
            }),
        )
        .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.sectionLabel.localeCompare(b.sectionLabel));
    });
  },

  async markSheet(examId: ID, sectionId: ID, subjectId: ID) {
    return query(({ db, actor }) => {
      const teaches = canTeach(actor, sectionId, subjectId, db);
      assert(teaches || isAdminRole(actor.role) || isClassTeacherOf(actor, sectionId, db));
      const cfg = examConfig(db, examId, sectionId).find((c) => c.subjectId === subjectId)!;
      const sheet = db.markSheets.find((m) => m.id === `${examId}:${sectionId}:${subjectId}`);
      const st = db.sectionResults.find((r) => r.id === `${examId}:${sectionId}`);
      const state = st?.state ?? "OPEN";
      return {
        examName: db.exams.find((e) => e.id === examId)!.name,
        sectionLabel: sectionLabel(db, sectionId),
        subjectName: subjectName(db, subjectId),
        components: cfg.components,
        status: sheet?.status ?? "DRAFT",
        sectionState: state,
        editable: state === "OPEN" && (teaches || isAdminRole(actor.role)) && (sheet?.status !== "SUBMITTED" || isAdminRole(actor.role)),
        canReopen: state === "OPEN" && sheet?.status === "SUBMITTED" && (isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role)),
        updatedAt: sheet?.updatedAt,
        students: db.students
          .filter((s) => s.sectionId === sectionId && s.status === "active")
          .sort((a, b) => a.roll - b.roll)
          .map((s) => ({ ...studentBrief(db, s), marks: sheet?.entries[s.id] ?? {} })),
      };
    });
  },

  async saveMarks(input: { examId: ID; sectionId: ID; subjectId: ID; entries: Record<ID, Record<string, MarkValue>>; submit: boolean }) {
    return command(({ db, actor }) => {
      const teaches = canTeach(actor, input.sectionId, input.subjectId, db);
      assert(teaches || isAdminRole(actor.role), "You do not teach this subject in this section.");
      const st = sectionState(db, input.examId, input.sectionId);
      assert(st.state === "OPEN", "This result sheet is locked. Ask the class teacher to unlock it.");
      const cfg = examConfig(db, input.examId, input.sectionId).find((c) => c.subjectId === input.subjectId)!;
      // validate
      for (const [sid, comps] of Object.entries(input.entries)) {
        for (const c of cfg.components) {
          const v = comps[c.key];
          if (v === undefined || v === "AB") continue;
          assert(typeof v === "number" && v >= 0 && v <= c.fullMarks, `Invalid mark for ${db.students.find((s) => s.id === sid)?.name}: ${c.label} max ${c.fullMarks}.`);
        }
      }
      const id = `${input.examId}:${input.sectionId}:${input.subjectId}`;
      let sheet = db.markSheets.find((m) => m.id === id);
      if (!sheet) {
        sheet = { id, examId: input.examId, sectionId: input.sectionId, subjectId: input.subjectId, entries: {}, status: "DRAFT", enteredBy: actor.userId, updatedAt: nowISO() } satisfies MarkSheet;
        db.markSheets.push(sheet);
      }
      assert(sheet.status !== "SUBMITTED" || isAdminRole(actor.role), "Already submitted. Ask the class teacher to reopen it.");
      const before = isAdminRole(actor.role) && !teaches ? JSON.parse(JSON.stringify(sheet.entries)) : undefined;
      sheet.entries = input.entries;
      sheet.updatedAt = nowISO();
      sheet.enteredBy = actor.userId;
      if (input.submit) {
        const students = db.students.filter((s) => s.sectionId === input.sectionId && s.status === "active");
        const missing = students.filter((s) => cfg.components.some((c) => input.entries[s.id]?.[c.key] === undefined));
        assert(missing.length === 0, `${missing.length} student(s) have empty marks. Enter a mark or AB for everyone.`);
        sheet.status = "SUBMITTED";
        sheet.submittedAt = nowISO();
        const sec = db.sections.find((s) => s.id === input.sectionId)!;
        notify(db, { userIds: [sec.classTeacherId], type: "notice", title: `Marks submitted: ${subjectName(db, input.subjectId)}`, body: `${sectionLabel(db, input.sectionId)} — ${db.exams.find((e) => e.id === input.examId)!.name}`, link: "/teacher/results" });
      }
      if (before) audit(db, actor.userId, "marks.override", "mark_sheet", id, { before, after: input.entries, reason: "Admin override before publish" });
    });
  },

  async reopenSheet(input: { examId: ID; sectionId: ID; subjectId: ID; reason: string }) {
    return command(({ db, actor }) => {
      assert(isClassTeacherOf(actor, input.sectionId, db) || isAdminRole(actor.role));
      const st = sectionState(db, input.examId, input.sectionId);
      assert(st.state === "OPEN", "Unlock the result sheet first.");
      const sheet = db.markSheets.find((m) => m.id === `${input.examId}:${input.sectionId}:${input.subjectId}`)!;
      sheet.status = "DRAFT";
      audit(db, actor.userId, "marks.reopen", "mark_sheet", sheet.id, { reason: input.reason });
      notify(db, { userIds: [sheet.enteredBy], type: "notice", title: `Marks sheet reopened: ${subjectName(db, input.subjectId)}`, body: `${sectionLabel(db, input.sectionId)}. Reason: ${input.reason}`, link: "/teacher/marks" });
    });
  },

  /** Class teacher review: whole-section preview before lock. */
  async sectionSheet(examId: ID, sectionId: ID) {
    return query(({ db, actor }) => {
      assert(isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role), "Only the class teacher can review the whole sheet.");
      const pairs = sheetsFor(db, examId, sectionId);
      const st = db.sectionResults.find((r) => r.id === `${examId}:${sectionId}`);
      const preview = computeSection(db, examId, sectionId);
      return {
        examName: db.exams.find((e) => e.id === examId)!.name,
        sectionLabel: sectionLabel(db, sectionId),
        state: st?.state ?? "OPEN",
        lockedBy: userName(db, st?.lockedBy),
        lockedAt: st?.lockedAt,
        canLock: canLock(st?.state ?? "OPEN", pairs.map((p) => p.sheet?.status ?? "DRAFT")),
        subjects: pairs.map(({ cfg, sheet }) => ({ subjectId: cfg.subjectId, name: subjectName(db, cfg.subjectId), status: sheet?.status ?? "DRAFT", teacher: userName(db, db.assignments.find((a) => a.sectionId === sectionId && a.subjectId === cfg.subjectId)?.teacherId), entered: sheet ? Object.keys(sheet.entries).length : 0 })),
        preview: preview.map((r) => ({ ...r, student: studentBrief(db, db.students.find((s) => s.id === r.studentId)!) })).sort((a, b) => a.student.roll - b.student.roll),
      };
    });
  },

  async lock(examId: ID, sectionId: ID) {
    return command(({ db, actor }) => {
      assert(isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role), "Only the class teacher can lock.");
      const st = sectionState(db, examId, sectionId);
      const pairs = sheetsFor(db, examId, sectionId);
      assert(canLock(st.state, pairs.map((p) => p.sheet?.status ?? "DRAFT")), "All subjects must be submitted before locking.");
      st.state = "LOCKED";
      st.lockedBy = actor.userId;
      st.lockedAt = nowISO();
      audit(db, actor.userId, "results.lock", "section_result", st.id);
      const admins = db.users.filter((u) => u.roles.includes("school_admin")).map((u) => u.id);
      notify(db, { userIds: admins, type: "notice", title: `Ready to publish: ${sectionLabel(db, sectionId)}`, body: db.exams.find((e) => e.id === examId)!.name, link: `/admin/exams/${examId}` });
    });
  },

  async unlock(examId: ID, sectionId: ID, reason: string) {
    return command(({ db, actor }) => {
      assert(isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role));
      const st = sectionState(db, examId, sectionId);
      assert(st.state === "LOCKED", "Only a locked sheet can be unlocked. Published results are changed with a correction.");
      st.state = "OPEN";
      audit(db, actor.userId, "results.unlock", "section_result", st.id, { reason });
    });
  },

  async publish(examId: ID, sectionIds: ID[]) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role), "Only admin can publish results.");
      const exam = db.exams.find((e) => e.id === examId)!;
      let count = 0;
      for (const sectionId of sectionIds) {
        const st = sectionState(db, examId, sectionId);
        assert(canPublish(st.state), `${sectionLabel(db, sectionId)} is not locked yet.`);
        const computed = computeSection(db, examId, sectionId);
        const sec = db.sections.find((s) => s.id === sectionId)!;
        const statusesBy = (sid: ID) => db.attendance.filter((a) => a.sectionId === sectionId).map((a) => a.entries[sid]).filter(Boolean);
        for (const r of computed) {
          db.results.filter((x) => x.examId === examId && x.studentId === r.studentId && x.state === "PUBLISHED").forEach((x) => (x.state = "SUPERSEDED"));
          const rv: ResultVersion = {
            id: uid("rv"),
            examId,
            studentId: r.studentId,
            sectionId,
            version: 1,
            subjectResults: r.subjectResults,
            totalObtained: r.totalObtained,
            totalFull: r.totalFull,
            gpa: r.gpa,
            letter: r.letter,
            passed: r.passed,
            sectionPosition: r.sectionPosition,
            attendancePercent: attendancePercent(statusesBy(r.studentId)),
            teacherRemark: remarkFor(r.passed, r.gpa),
            verificationCode: verificationCode(),
            state: "PUBLISHED",
            publishedAt: nowISO(),
            publishedBy: actor.userId,
          };
          db.results.push(rv);
          count++;
          const st2 = db.students.find((s) => s.id === r.studentId)!;
          notify(db, { userIds: guardiansOf(db, r.studentId), type: "result_published", title: `${exam.name} result published — ${st2.name.split(" ")[0]}`, body: `GPA ${r.gpa.toFixed(2)}. Please review and acknowledge in the app within ${db.school.settings.ackDeadlineDays} days.`, studentId: r.studentId, sms: true, link: `/parent/results/${rv.id}` });
          if (st2.userId) notify(db, { userIds: [st2.userId], type: "result_published", title: `${exam.name} result published`, body: "Your guardian has been asked to review it.", studentId: r.studentId, link: `/student/results/${rv.id}` });
        }
        st.state = "PUBLISHED";
        st.publishedAt = nowISO();
        st.publishedBy = actor.userId;
        notify(db, { userIds: [sec.classTeacherId], type: "result_published", title: `Published: ${sectionLabel(db, sectionId)}`, body: `${exam.name}. Track acknowledgments on your dashboard.`, link: "/teacher/acknowledgments" });
      }
      // class positions once every section of a class is published
      for (const classId of new Set(sectionIds.map((id) => db.sections.find((s) => s.id === id)!.classId))) {
        const secs = db.sections.filter((s) => s.classId === classId);
        const allPublished = secs.every((s) => db.sectionResults.find((r) => r.id === `${examId}:${s.id}`)?.state === "PUBLISHED");
        if (!allPublished) continue;
        const rows = db.results.filter((r) => r.examId === examId && r.state === "PUBLISHED" && secs.some((s) => s.id === r.sectionId));
        const pos = rankPositions(rows);
        rows.forEach((r) => (r.classPosition = pos.get(r.id)));
      }
      audit(db, actor.userId, "results.publish", "exam", examId, { after: { sections: sectionIds.map((id) => sectionLabel(db, id)), students: count } });
      return count;
    });
  },

  /**
   * Correction after publish: admin only, reason required. Creates a new version, supersedes the old one,
   * resets acknowledgment (acks belong to the old version) and notifies guardians again.
   * Positions are carried over from the previous version (documented in DECISIONS.md).
   */
  async correct(input: { resultVersionId: ID; subjectId: ID; component: string; value: MarkValue; reason: string }) {
    return command(({ db, actor }) => {
      assert(isAdminRole(actor.role), "Only admin can correct published results.");
      assert(input.reason.trim().length >= 10, "Write a clear reason (at least 10 characters).");
      const old = db.results.find((r) => r.id === input.resultVersionId)!;
      assert(old.state === "PUBLISHED", "Only the current version can be corrected.");
      const sheet = db.markSheets.find((m) => m.id === `${old.examId}:${old.sectionId}:${input.subjectId}`)!;
      const cfg = examConfig(db, old.examId, old.sectionId).find((c) => c.subjectId === input.subjectId)!;
      const comp = cfg.components.find((c) => c.key === input.component)!;
      assert(input.value === "AB" || (input.value >= 0 && input.value <= comp.fullMarks), `Mark must be 0–${comp.fullMarks} or AB.`);
      const beforeValue = sheet.entries[old.studentId]?.[input.component];
      sheet.entries[old.studentId] = { ...sheet.entries[old.studentId], [input.component]: input.value };
      const exam = db.exams.find((e) => e.id === old.examId)!;
      const scale = db.gradingScales.find((g) => g.id === exam.gradingScaleId)!;
      const recomputed = computeResult(
        examConfig(db, old.examId, old.sectionId).map((c) => {
          const sh = db.markSheets.find((m) => m.id === `${old.examId}:${old.sectionId}:${c.subjectId}`);
          return { subjectId: c.subjectId, isOptional: db.subjects.find((s) => s.id === c.subjectId)?.isOptional ?? false, components: c.components.map((k) => ({ key: k.key, fullMarks: k.fullMarks, mustPassSeparately: k.mustPassSeparately, value: sh?.entries[old.studentId]?.[k.key] })) };
        }),
        scale,
      );
      old.state = "SUPERSEDED";
      const next: ResultVersion = {
        ...old,
        id: uid("rv"),
        version: old.version + 1,
        ...recomputed,
        subjectResults: recomputed.subjectResults.map((s) => ({ ...s, highest: old.subjectResults.find((o) => o.subjectId === s.subjectId)?.highest })),
        teacherRemark: remarkFor(recomputed.passed, recomputed.gpa),
        verificationCode: verificationCode(),
        state: "PUBLISHED",
        publishedAt: nowISO(),
        publishedBy: actor.userId,
        correctionReason: input.reason,
        paperReturned: undefined,
      };
      db.results.push(next);
      audit(db, actor.userId, "results.correct", "result", next.id, { before: { version: old.version, gpa: old.gpa, [`${subjectName(db, input.subjectId)} ${comp.label}`]: beforeValue }, after: { version: next.version, gpa: next.gpa, value: input.value }, reason: input.reason });
      const st = db.students.find((s) => s.id === old.studentId)!;
      notify(db, { userIds: guardiansOf(db, st.id), type: "result_corrected", title: `Result corrected — ${st.name.split(" ")[0]}`, body: `${exam.name} result was corrected (new GPA ${next.gpa.toFixed(2)}). Please review and acknowledge again.`, studentId: st.id, sms: true, link: `/parent/results/${next.id}` });
      return next.id;
    });
  },

  async studentResults(studentId: ID) {
    return query(({ db, actor }) => {
      assert(canViewStudent(actor, studentId, db));
      return db.results
        .filter((r) => r.studentId === studentId && r.state === "PUBLISHED")
        .map((r) => {
          const acks = db.acks.filter((a) => a.resultVersionId === r.id);
          return { ...resultView(db, r), acknowledged: acks.length > 0, acknowledgedByMe: acks.some((a) => a.guardianUserId === actor.userId) };
        })
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    });
  },

  async resultDetail(resultVersionId: ID) {
    return query(({ db, actor }) => {
      const rv = db.results.find((r) => r.id === resultVersionId);
      assert(Boolean(rv), "Result not found.");
      assert(canViewStudent(actor, rv!.studentId, db) && actor.role !== "gate_staff");
      if (actor.role === "teacher") {
        // subject teachers who are not class teacher see results only for sections they teach (already scoped)
      }
      const st = db.students.find((s) => s.id === rv!.studentId)!;
      const acks = db.acks.filter((a) => a.resultVersionId === rv!.id);
      const isStudent = actor.role === "student";
      const link = st.guardians.find((g) => g.guardianUserId === actor.userId);
      const history = db.results.filter((r) => r.examId === rv!.examId && r.studentId === rv!.studentId).sort((a, b) => b.version - a.version).map((r) => ({ id: r.id, version: r.version, gpa: r.gpa, state: r.state, publishedAt: r.publishedAt, correctionReason: r.correctionReason }));
      return {
        result: resultView(db, rv!),
        student: { ...studentBrief(db, st), dob: st.dob },
        school: { name: db.school.name, nameBn: db.school.nameBn, address: db.school.address, eiin: db.school.eiin },
        classTeacher: userName(db, db.sections.find((s) => s.id === rv!.sectionId)?.classTeacherId),
        acknowledged: acks.length > 0,
        // students see only yes/no — never who, when or how (prompt §4.1)
        acks: isStudent
          ? []
          : acks.map((a) => ({ id: a.id, guardian: userName(db, a.guardianUserId), relation: relationLabel(db, st.id, a.guardianUserId), channel: a.channel, at: a.at, comment: a.comment, mine: a.guardianUserId === actor.userId })),
        canAcknowledge: actor.role === "parent" && rv!.state === "PUBLISHED" && Boolean(link?.canAcknowledge) && !acks.some((a) => a.guardianUserId === actor.userId),
        holdForDues: db.school.settings.holdResultCardForDues && db.invoices.some((i) => i.studentId === st.id && i.status !== "paid" && i.dueDate < dhakaDate(nowISO())),
        history: isStudent ? [] : history,
      };
    });
  },

  /** Public QR verification. Minimal data only. */
  async verify(code: string) {
    return publicQuery((db) => {
      const rv = db.results.find((r) => r.verificationCode === code.trim().toUpperCase());
      if (!rv) return null;
      const st = db.students.find((s) => s.id === rv.studentId)!;
      const exam = db.exams.find((e) => e.id === rv.examId)!;
      const masked = st.name
        .split(" ")
        .map((p, i) => (i === 0 ? p : `${p[0]}${"*".repeat(Math.max(2, p.length - 1))}`))
        .join(" ");
      const acks = db.acks.filter((a) => a.resultVersionId === rv.id).sort((a, b) => a.at.localeCompare(b.at));
      const newer = db.results.find((r) => r.examId === rv.examId && r.studentId === rv.studentId && r.version > rv.version);
      return {
        school: db.school.name,
        studentName: masked,
        section: sectionLabel(db, rv.sectionId),
        exam: exam.name,
        gpa: rv.gpa,
        letter: rv.letter,
        publishedAt: rv.publishedAt,
        superseded: rv.state === "SUPERSEDED" || Boolean(newer),
        acknowledgment: acks[0]
          ? { relation: relationLabel(db, st.id, acks[0].guardianUserId), name: userName(db, acks[0].guardianUserId).split(" ").slice(0, 2).join(" "), at: acks[0].at, channel: acks[0].channel }
          : null,
      };
    });
  },
};

export type ResultService = typeof mockResultService;
