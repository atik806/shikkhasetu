"use client";
import type { ID } from "@/types";
import { audit, command, deliveryTime, notify, query, userName } from "@/lib/services/runtime";
import { assert, canAccessSection, childIds, isAdminRole } from "@/lib/auth/scope";
import { uid } from "@/lib/codes";
import { fmtDateTime, nowISO } from "@/lib/time";
import { sectionLabel, subjectName } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

/**
 * Messaging rules (child safety): threads are always teacher ↔ guardian about one student.
 * No private student ↔ teacher messages. Admin can read any thread (complaints).
 */
function canSeeThread(db: MockDB, t: MockDB["threads"][number], userId: ID, role: string) {
  if (role === "school_admin" || role === "super_admin") return true;
  return t.teacherId === userId || t.guardianUserId === userId;
}

export const mockMessagingService = {
  async threads() {
    return query(({ db, actor }) =>
      db.threads
        .filter((t) => canSeeThread(db, t, actor.userId, actor.role))
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
        .map((t) => {
          const msgs = db.messages.filter((m) => m.threadId === t.id);
          const visible = msgs.filter((m) => m.fromUserId === actor.userId || m.deliverAt <= nowISO());
          const st = db.students.find((s) => s.id === t.studentId)!;
          return {
            ...t,
            studentName: st.name,
            sectionLabel: sectionLabel(db, st.sectionId),
            teacherName: userName(db, t.teacherId),
            guardianName: userName(db, t.guardianUserId),
            last: visible[visible.length - 1],
            unread: visible.filter((m) => m.fromUserId !== actor.userId && !m.readAt && (t.teacherId === actor.userId || t.guardianUserId === actor.userId)).length,
          };
        }),
    );
  },
  async thread(threadId: ID) {
    return query(({ db, actor }) => {
      const t = db.threads.find((x) => x.id === threadId)!;
      assert(canSeeThread(db, t, actor.userId, actor.role));
      const st = db.students.find((s) => s.id === t.studentId)!;
      return {
        thread: { ...t, studentName: st.name, teacherName: userName(db, t.teacherId), guardianName: userName(db, t.guardianUserId) },
        messages: db.messages
          .filter((m) => m.threadId === threadId && (m.fromUserId === actor.userId || m.deliverAt <= nowISO() || isAdminRole(actor.role)))
          .map((m) => ({ ...m, from: userName(db, m.fromUserId), mine: m.fromUserId === actor.userId, scheduled: m.deliverAt > nowISO() })),
        canSend: t.teacherId === actor.userId || t.guardianUserId === actor.userId,
        officeHours: db.school.settings.officeHours,
      };
    });
  },
  async markThreadRead(threadId: ID) {
    return command(({ db, actor }) => {
      db.messages.filter((m) => m.threadId === threadId && m.fromUserId !== actor.userId && !m.readAt && m.deliverAt <= nowISO()).forEach((m) => (m.readAt = nowISO()));
    });
  },
  async send(threadId: ID, body: string) {
    return command(({ db, actor }) => {
      const t = db.threads.find((x) => x.id === threadId)!;
      assert(t.teacherId === actor.userId || t.guardianUserId === actor.userId, "You are not part of this conversation.");
      assert(body.trim().length > 0 && body.length <= 2000, "Write a message (max 2000 characters).");
      const deliverAt = actor.role === "parent" ? deliveryTime(db) : nowISO();
      db.messages.push({ id: uid("m"), threadId, fromUserId: actor.userId, body: body.trim(), at: nowISO(), deliverAt });
      t.lastAt = nowISO();
      const to = actor.userId === t.teacherId ? t.guardianUserId : t.teacherId;
      notify(db, { userIds: [to], type: "message", title: `Message from ${userName(db, actor.userId)}`, body: body.slice(0, 100), studentId: t.studentId });
      return { deliverAt, delayed: deliverAt > nowISO(), deliverLabel: fmtDateTime(deliverAt) };
    });
  },
  /** Who can I start a conversation with? Parent → their children's teachers. Teacher → guardians of their students. */
  async contacts() {
    return query(({ db, actor }) => {
      if (actor.role === "parent") {
        return childIds(actor.userId, db).flatMap((cid) => {
          const st = db.students.find((s) => s.id === cid)!;
          const sec = db.sections.find((s) => s.id === st.sectionId)!;
          const teachers = new Map<ID, string>([[sec.classTeacherId, "Class teacher"]]);
          db.assignments.filter((a) => a.sectionId === sec.id).forEach((a) => !teachers.has(a.teacherId) && teachers.set(a.teacherId, subjectName(db, a.subjectId)));
          return [...teachers].map(([teacherId, role]) => ({ key: `${cid}:${teacherId}`, studentId: cid, studentName: st.name, teacherId, guardianUserId: actor.userId, label: `${userName(db, teacherId)} — ${role} (${st.name.split(" ")[0]})` }));
        });
      }
      if (actor.role === "teacher") {
        return db.students
          .filter((s) => s.status === "active" && canAccessSection(actor, s.sectionId, db))
          .flatMap((s) => s.guardians.filter((g) => db.users.find((u) => u.id === g.guardianUserId)?.status === "active").map((g) => ({ key: `${s.id}:${g.guardianUserId}`, studentId: s.id, studentName: s.name, teacherId: actor.userId, guardianUserId: g.guardianUserId, label: `${userName(db, g.guardianUserId)} (${g.relation} of ${s.name}, ${sectionLabel(db, s.sectionId)})` })));
      }
      return [];
    });
  },
  async start(input: { studentId: ID; teacherId: ID; guardianUserId: ID; subject: string; body: string; complaint?: boolean }) {
    return command(({ db, actor }) => {
      const st = db.students.find((s) => s.id === input.studentId)!;
      if (actor.role === "parent") assert(input.guardianUserId === actor.userId && st.guardians.some((g) => g.guardianUserId === actor.userId));
      else if (actor.role === "teacher") assert(input.teacherId === actor.userId && canAccessSection(actor, st.sectionId, db));
      else assert(false, "Only teachers and guardians can start conversations.");
      let t = db.threads.find((x) => x.studentId === input.studentId && x.teacherId === input.teacherId && x.guardianUserId === input.guardianUserId && x.subject === input.subject);
      if (!t) {
        t = { id: uid("th"), studentId: input.studentId, teacherId: input.teacherId, guardianUserId: input.guardianUserId, subject: input.subject, complaint: Boolean(input.complaint), lastAt: nowISO() };
        db.threads.push(t);
      }
      const deliverAt = actor.role === "parent" ? deliveryTime(db) : nowISO();
      db.messages.push({ id: uid("m"), threadId: t.id, fromUserId: actor.userId, body: input.body, at: nowISO(), deliverAt });
      t.lastAt = nowISO();
      const to = actor.role === "parent" ? input.teacherId : input.guardianUserId;
      notify(db, { userIds: [to], type: "message", title: `New message: ${input.subject}`, body: input.body.slice(0, 100), studentId: st.id });
      if (input.complaint) {
        const admins = db.users.filter((u) => u.roles.includes("school_admin")).map((u) => u.id);
        notify(db, { userIds: admins, type: "message", title: `Complaint raised by ${userName(db, actor.userId)}`, body: input.subject, studentId: st.id, link: "/admin/messages" });
        audit(db, actor.userId, "message.complaint", "thread", t.id);
      }
      return t.id;
    });
  },

  // ---------- meetings ----------
  async mySlots() {
    return query(({ db, actor }) => {
      assert(actor.role === "teacher");
      return db.meetings
        .filter((m) => m.teacherId === actor.userId && m.start >= nowISO().slice(0, 10))
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((m) => ({ ...m, bookedByName: userName(db, m.bookedBy), studentName: db.students.find((s) => s.id === m.studentId)?.name }));
    });
  },
  async addSlots(input: { startISO: string[]; minutes: number }) {
    return command(({ db, actor }) => {
      assert(actor.role === "teacher");
      input.startISO.forEach((start) => db.meetings.push({ id: uid("mt"), teacherId: actor.userId, start, minutes: input.minutes }));
    });
  },
  async removeSlot(id: ID) {
    return command(({ db, actor }) => {
      const m = db.meetings.find((x) => x.id === id)!;
      assert(m.teacherId === actor.userId);
      if (m.bookedBy) notify(db, { userIds: [m.bookedBy], type: "meeting", title: "Meeting cancelled", body: `${userName(db, m.teacherId)} cancelled the meeting on ${fmtDateTime(m.start)}.`, sms: true });
      db.meetings = db.meetings.filter((x) => x.id !== id);
    });
  },
  async slotsForParent() {
    return query(({ db, actor }) => {
      assert(actor.role === "parent");
      const kids = childIds(actor.userId, db).map((id) => db.students.find((s) => s.id === id)!);
      const teacherIds = new Set(kids.flatMap((k) => [db.sections.find((s) => s.id === k.sectionId)!.classTeacherId, ...db.assignments.filter((a) => a.sectionId === k.sectionId).map((a) => a.teacherId)]));
      return {
        children: kids.map((k) => ({ id: k.id, name: k.name })),
        slots: db.meetings
          .filter((m) => teacherIds.has(m.teacherId) && m.start >= nowISO() && (!m.bookedBy || m.bookedBy === actor.userId))
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((m) => ({ ...m, teacherName: userName(db, m.teacherId), mine: m.bookedBy === actor.userId, studentName: db.students.find((s) => s.id === m.studentId)?.name })),
      };
    });
  },
  async book(input: { slotId: ID; studentId: ID; note: string }) {
    return command(({ db, actor }) => {
      assert(actor.role === "parent" && childIds(actor.userId, db).includes(input.studentId));
      const m = db.meetings.find((x) => x.id === input.slotId)!;
      assert(!m.bookedBy, "This slot was just booked by someone else.");
      m.bookedBy = actor.userId;
      m.studentId = input.studentId;
      m.note = input.note;
      notify(db, { userIds: [m.teacherId], type: "meeting", title: `Meeting booked: ${fmtDateTime(m.start)}`, body: `${userName(db, actor.userId)} — ${input.note || "no note"}`, studentId: input.studentId, link: "/teacher/meetings" });
    });
  },
  async cancelBooking(slotId: ID) {
    return command(({ db, actor }) => {
      const m = db.meetings.find((x) => x.id === slotId)!;
      assert(m.bookedBy === actor.userId);
      notify(db, { userIds: [m.teacherId], type: "meeting", title: "Meeting cancelled by guardian", body: fmtDateTime(m.start) });
      m.bookedBy = undefined;
      m.studentId = undefined;
      m.note = undefined;
    });
  },
};

export type MessagingService = typeof mockMessagingService;
