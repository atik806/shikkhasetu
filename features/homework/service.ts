"use client";
import type { ID } from "@/types";
import { command, notify, query, userName } from "@/lib/services/runtime";
import { assert, canTeach, canViewStudent, isClassTeacherOf } from "@/lib/auth/scope";
import { uid } from "@/lib/codes";
import { addDaysISO, today } from "@/lib/time";
import { sectionLabel, subjectName } from "@/lib/services/lookups";

export const mockHomeworkService = {
  /** Teacher: homework they posted, or everything for a section they class-teach. */
  async forTeacher() {
    return query(({ db, actor }) => {
      assert(actor.role === "teacher");
      return db.homework
        .filter((h) => h.createdBy === actor.userId || isClassTeacherOf(actor, h.sectionId, db))
        .sort((a, b) => b.assignedOn.localeCompare(a.assignedOn))
        .map((h) => {
          const total = db.students.filter((s) => s.sectionId === h.sectionId && s.status === "active").length;
          return { ...h, sectionLabel: sectionLabel(db, h.sectionId), subjectName: subjectName(db, h.subjectId), completion: total ? Math.round((h.doneBy.length / total) * 100) : 0, by: userName(db, h.createdBy) };
        });
    });
  },
  async forStudent(studentId: ID) {
    return query(({ db, actor }) => {
      assert(canViewStudent(actor, studentId, db));
      const st = db.students.find((s) => s.id === studentId)!;
      const from = addDaysISO(today(), -14);
      return db.homework
        .filter((h) => h.sectionId === st.sectionId && h.assignedOn >= from)
        .sort((a, b) => b.assignedOn.localeCompare(a.assignedOn))
        .map((h) => ({ ...h, doneBy: undefined, done: h.doneBy.includes(studentId), subjectName: subjectName(db, h.subjectId), by: userName(db, h.createdBy), isToday: h.assignedOn === today() }));
    });
  },
  async assign(input: { sectionId: ID; subjectId?: ID; title: string; details: string; dueDate: string; attachmentName?: string }) {
    return command(({ db, actor }) => {
      if (input.subjectId) assert(canTeach(actor, input.sectionId, input.subjectId, db), "You do not teach this subject in this section.");
      else assert(isClassTeacherOf(actor, input.sectionId, db), "Only the class teacher can post a section diary note.");
      assert(input.dueDate >= today(), "Due date cannot be in the past.");
      db.homework.push({ id: uid("hw"), ...input, assignedOn: today(), createdBy: actor.userId, doneBy: [] });
      const students = db.students.filter((s) => s.sectionId === input.sectionId && s.status === "active");
      notify(db, { userIds: students.map((s) => s.userId).filter((x): x is string => Boolean(x)), type: "homework", title: `New ${input.subjectId ? "homework" : "diary note"}: ${subjectName(db, input.subjectId)}`, body: input.title, link: "/student/homework" });
    });
  },
  async toggleDone(homeworkId: ID) {
    return command(({ db, actor }) => {
      assert(actor.role === "student", "Only the student marks homework as done.");
      const st = db.students.find((s) => s.userId === actor.userId)!;
      const h = db.homework.find((x) => x.id === homeworkId)!;
      assert(h.sectionId === st.sectionId);
      h.doneBy = h.doneBy.includes(st.id) ? h.doneBy.filter((x) => x !== st.id) : [...h.doneBy, st.id];
    });
  },
  async remove(homeworkId: ID) {
    return command(({ db, actor }) => {
      const h = db.homework.find((x) => x.id === homeworkId)!;
      assert(h.createdBy === actor.userId, "You can delete only your own posts.");
      db.homework = db.homework.filter((x) => x.id !== homeworkId);
    });
  },
};

export type HomeworkService = typeof mockHomeworkService;
