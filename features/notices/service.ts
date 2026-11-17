"use client";
import type { ID, Notice, Role } from "@/types";
import { audit, command, notify, query, userName } from "@/lib/services/runtime";
import { accessibleSectionIds, assert, childIds, isAdminRole } from "@/lib/auth/scope";
import { uid } from "@/lib/codes";
import { nowISO, today } from "@/lib/time";
import { sectionLabel } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

/** Which sections/classes/roles a user belongs to, for notice targeting. */
function audienceFor(db: MockDB, userId: ID, role: Role) {
  const sectionIds = new Set<ID>();
  if (role === "parent") childIds(userId, db).forEach((c) => sectionIds.add(db.students.find((s) => s.id === c)!.sectionId));
  if (role === "student") {
    const s = db.students.find((x) => x.userId === userId);
    if (s) sectionIds.add(s.sectionId);
  }
  if (role === "teacher") accessibleSectionIds({ userId, role }, db).forEach((id) => sectionIds.add(id));
  const classIds = new Set([...sectionIds].map((id) => db.sections.find((s) => s.id === id)!.classId));
  return { sectionIds, classIds };
}

function visible(db: MockDB, n: Notice, userId: ID, role: Role) {
  if (isAdminRole(role)) return true;
  const a = n.audience;
  if (a.kind === "school") return true;
  if (a.kind === "role") return a.role === role;
  const { sectionIds, classIds } = audienceFor(db, userId, role);
  if (a.kind === "class") return classIds.has(a.classId);
  return sectionIds.has(a.sectionId);
}

function audienceLabel(db: MockDB, n: Notice) {
  const a = n.audience;
  if (a.kind === "school") return "Whole school";
  if (a.kind === "role") return `All ${a.role}s`;
  if (a.kind === "class") return `Class ${db.classes.find((c) => c.id === a.classId)?.name}`;
  return sectionLabel(db, a.sectionId);
}

export const mockNoticeService = {
  async list(includeExpired = false) {
    return query(({ db, actor }) => {
      const t = today();
      const parentCount = db.users.filter((u) => u.roles.includes("parent") && u.status === "active").length;
      return db.notices
        .filter((n) => visible(db, n, actor.userId, actor.role))
        .filter((n) => includeExpired || !n.expiresOn || n.expiresOn >= t)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
        .map((n) => ({
          ...n,
          readBy: undefined,
          read: n.readBy.includes(actor.userId),
          by: userName(db, n.createdBy),
          audienceLabel: audienceLabel(db, n),
          readPercent: isAdminRole(actor.role) ? Math.round((n.readBy.filter((id) => db.users.find((u) => u.id === id)?.roles.includes("parent")).length / Math.max(1, parentCount)) * 100) : undefined,
          expired: Boolean(n.expiresOn && n.expiresOn < t),
          canDelete: isAdminRole(actor.role) || n.createdBy === actor.userId,
        }));
    });
  },
  async markRead(id: ID) {
    return command(({ db, user }) => {
      const n = db.notices.find((x) => x.id === id);
      if (n && !n.readBy.includes(user.id)) n.readBy.push(user.id);
    });
  },
  async post(input: { title: string; body: string; audience: Notice["audience"]; pinned: boolean; urgent: boolean; expiresOn?: string; attachmentName?: string }) {
    return command(({ db, actor }) => {
      const admin = isAdminRole(actor.role);
      assert(admin || actor.role === "teacher", "You cannot post notices.");
      if (!admin) {
        assert(input.audience.kind === "section" && accessibleSectionIds(actor, db).includes(input.audience.sectionId), "Teachers can post only to their own sections.");
        assert(!input.pinned, "Only admin can pin notices.");
      }
      const n: Notice = { id: uid("nt"), schoolId: db.school.id, ...input, createdBy: actor.userId, createdAt: nowISO(), readBy: [] };
      db.notices.push(n);
      // notify recipients (guardians + students of the audience)
      const recipients = db.users
        .filter((u) => u.status === "active" && (u.roles.includes("parent") || u.roles.includes("student") || u.roles.includes("teacher")))
        .filter((u) => u.roles.some((r) => (r === "parent" || r === "student" || r === "teacher") && visible(db, n, u.id, r)))
        .map((u) => u.id);
      notify(db, { userIds: recipients, type: "notice", title: input.urgent ? `URGENT: ${input.title}` : input.title, body: input.body.slice(0, 140), sms: input.urgent, link: "/notices" });
      audit(db, actor.userId, "notice.post", "notice", n.id, { after: { title: n.title, audience: audienceLabel(db, n) } });
    });
  },
  async remove(id: ID) {
    return command(({ db, actor }) => {
      const n = db.notices.find((x) => x.id === id)!;
      assert(isAdminRole(actor.role) || n.createdBy === actor.userId);
      db.notices = db.notices.filter((x) => x.id !== id);
      audit(db, actor.userId, "notice.delete", "notice", id, { before: { title: n.title } });
    });
  },
};

export type NoticeService = typeof mockNoticeService;
