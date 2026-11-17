"use client";
import type { GuardianLink, ID, Role, SchoolSettings, Student, User } from "@/types";
import { audit, command, notify, publicCommand, query, sendSms, userName } from "@/lib/services/runtime";
import { assert, accessibleSectionIds, canViewStudent, isAdminRole, isClassTeacherOf } from "@/lib/auth/scope";
import { mockHash, otpCode, slipCode, uid } from "@/lib/codes";
import { maskPhone, normalizeBdPhone } from "@/lib/phone";
import { nowISO, today } from "@/lib/time";
import { guardianBriefs, sectionLabel, studentBrief, subjectName } from "@/lib/services/lookups";
import { attendancePercent } from "@/features/attendance/lib/attendance";
import { OTP_TTL_MS, checkOtp } from "@/lib/otp";
import type { MockDB } from "@/lib/mock/schema";

function requireAdmin(role: Role) {
  assert(isAdminRole(role), "Only the school admin can do this.");
}

export function sectionsView(db: MockDB) {
  return db.sections.map((s) => ({
    ...s,
    label: sectionLabel(db, s.id),
    className: db.classes.find((c) => c.id === s.classId)?.name ?? "",
    classOrder: db.classes.find((c) => c.id === s.classId)?.order ?? 0,
    shiftName: db.school.shifts.find((x) => x.id === s.shiftId)?.name ?? "",
    classTeacherName: userName(db, s.classTeacherId),
    studentCount: db.students.filter((x) => x.sectionId === s.id && x.status === "active").length,
  }));
}

function studentAttendance(db: MockDB, s: Student) {
  const statuses = db.attendance.filter((a) => a.sectionId === s.sectionId).map((a) => a.entries[s.id]).filter(Boolean);
  return attendancePercent(statuses);
}

export const mockSchoolService = {
  async overview() {
    return query(({ db }) => ({
      school: db.school,
      classes: db.classes,
      sections: sectionsView(db).sort((a, b) => a.classOrder - b.classOrder || a.name.localeCompare(b.name)),
      subjects: db.subjects,
      gradingScales: db.gradingScales,
      holidays: db.holidays,
    }));
  },

  async updateSettings(patch: Partial<SchoolSettings>) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const before = { ...db.school.settings };
      Object.assign(db.school.settings, patch);
      audit(db, actor.userId, "settings.update", "school", db.school.id, { before, after: patch });
    });
  },

  async updateGradingBands(scaleId: ID, bands: { min: number; letter: string; gp: number }[], passPercent: number) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const scale = db.gradingScales.find((g) => g.id === scaleId);
      assert(Boolean(scale), "Scale not found");
      const before = { bands: scale!.bands, passPercent: scale!.passPercent };
      scale!.bands = [...bands].sort((a, b) => b.min - a.min);
      scale!.passPercent = passPercent;
      audit(db, actor.userId, "grading.update", "grading_scale", scaleId, { before, after: { bands, passPercent } });
    });
  },

  async addHoliday(input: { date: string; title: string; kind: "government" | "school" | "exam" | "event" }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      db.holidays.push({ id: uid("hol"), ...input });
      audit(db, actor.userId, "calendar.add", "holiday", input.date, { after: input });
    });
  },

  async removeHoliday(id: ID) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      db.holidays = db.holidays.filter((h) => h.id !== id);
      audit(db, actor.userId, "calendar.remove", "holiday", id);
    });
  },

  async teachers() {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role) || actor.role === "teacher");
      return db.users
        .filter((u) => u.roles.includes("teacher"))
        .map((u) => ({
          id: u.id,
          name: u.name,
          phoneMasked: maskPhone(u.phone),
          email: u.email,
          status: u.status,
          roles: u.roles,
          classTeacherOf: db.sections.filter((s) => s.classTeacherId === u.id).map((s) => sectionLabel(db, s.id)),
          assignments: db.assignments
            .filter((a) => a.teacherId === u.id)
            .map((a) => ({ ...a, sectionLabel: sectionLabel(db, a.sectionId), subjectName: subjectName(db, a.subjectId) })),
        }));
    });
  },

  async assignments(sectionId: ID) {
    return query(({ db, actor }) => {
      requireAdmin(actor.role);
      return db.subjects
        .filter((s) => s.classId === db.sections.find((x) => x.id === sectionId)?.classId)
        .map((sub) => {
          const a = db.assignments.find((x) => x.sectionId === sectionId && x.subjectId === sub.id);
          return { subject: sub, teacherId: a?.teacherId ?? null, teacherName: userName(db, a?.teacherId) };
        });
    });
  },

  async setAssignment(sectionId: ID, subjectId: ID, teacherId: ID) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const existing = db.assignments.find((a) => a.sectionId === sectionId && a.subjectId === subjectId);
      const before = existing?.teacherId;
      if (existing) existing.teacherId = teacherId;
      else db.assignments.push({ sectionId, subjectId, teacherId });
      audit(db, actor.userId, "assignment.set", "section", sectionId, { before: { subjectId, teacherId: before }, after: { subjectId, teacherId } });
    });
  },

  async setClassTeacher(sectionId: ID, teacherId: ID) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const sec = db.sections.find((s) => s.id === sectionId)!;
      const before = sec.classTeacherId;
      sec.classTeacherId = teacherId;
      audit(db, actor.userId, "section.class_teacher", "section", sectionId, { before, after: teacherId });
    });
  },

  async createStaff(input: { name: string; phone: string; email?: string; role: "teacher" | "gate_staff" | "school_admin" }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const phone = normalizeBdPhone(input.phone);
      assert(!db.users.some((u) => u.phone === phone), "A user with this phone already exists.");
      const temp = `Tmp-${otpCode()}`;
      const user: User = { id: uid("u"), schoolId: db.school.id, name: input.name, phone, email: input.email, roles: [input.role], status: "active", passwordHash: mockHash(temp) };
      db.users.push(user);
      audit(db, actor.userId, "user.create", "user", user.id, { after: { name: user.name, role: input.role } });
      return { userId: user.id, tempPassword: temp };
    });
  },

  async users(filter: { q?: string; role?: Role | "all" }) {
    return query(({ db, actor }) => {
      requireAdmin(actor.role);
      const q = filter.q?.toLowerCase().trim();
      return db.users
        .filter((u) => (filter.role && filter.role !== "all" ? u.roles.includes(filter.role) : true))
        .filter((u) => (q ? u.name.toLowerCase().includes(q) || u.phone?.includes(q) || u.loginId?.toLowerCase().includes(q) : true))
        .map((u) => ({ id: u.id, name: u.name, roles: u.roles, status: u.status, phoneMasked: maskPhone(u.phone), loginId: u.loginId }));
    });
  },

  async setUserStatus(userId: ID, status: User["status"], reason: string) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      assert(userId !== actor.userId, "You cannot change your own status.");
      const u = db.users.find((x) => x.id === userId)!;
      const before = u.status;
      u.status = status;
      audit(db, actor.userId, "user.status", "user", userId, { before, after: status, reason });
    });
  },

  async resetPassword(userId: ID) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const u = db.users.find((x) => x.id === userId)!;
      const temp = `Tmp-${otpCode()}`;
      u.passwordHash = mockHash(temp);
      db.devices.filter((d) => d.userId === userId).forEach((d) => (d.revoked = true));
      audit(db, actor.userId, "user.reset_password", "user", userId);
      return { tempPassword: temp };
    });
  },

  async setRoles(userId: ID, roles: Role[], reason: string) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      assert(roles.length > 0, "A user needs at least one role.");
      const u = db.users.find((x) => x.id === userId)!;
      const before = u.roles;
      u.roles = roles;
      audit(db, actor.userId, "user.roles", "user", userId, { before, after: roles, reason });
    });
  },

  async students(filter: { sectionId?: ID | "all"; q?: string; status?: Student["status"] | "all" }) {
    return query(({ db, actor }) => {
      const allowed = new Set(accessibleSectionIds(actor, db));
      const q = filter.q?.toLowerCase().trim();
      return db.students
        .filter((s) => allowed.has(s.sectionId))
        .filter((s) => (filter.sectionId && filter.sectionId !== "all" ? s.sectionId === filter.sectionId : true))
        .filter((s) => (filter.status && filter.status !== "all" ? s.status === filter.status : s.status === "active"))
        .filter((s) => (q ? s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) : true))
        .map((s) => ({ ...studentBrief(db, s), status: s.status, attendance: studentAttendance(db, s), guardians: guardianBriefs(db, s) }));
    });
  },

  async student(studentId: ID) {
    return query(({ db, actor }) => {
      assert(canViewStudent(actor, studentId, db) && actor.role !== "gate_staff");
      const s = db.students.find((x) => x.id === studentId)!;
      const isStaff = isAdminRole(actor.role) || actor.role === "teacher";
      const results = db.results
        .filter((r) => r.studentId === studentId && r.state === "PUBLISHED")
        .map((r) => ({ ...r, examName: db.exams.find((e) => e.id === r.examId)?.name ?? "", acknowledged: db.acks.some((a) => a.resultVersionId === r.id) }));
      return {
        student: { ...studentBrief(db, s), dob: s.dob, bloodGroup: s.bloodGroup, admittedOn: s.admittedOn, status: s.status, userId: s.userId },
        guardians: guardianBriefs(db, s),
        attendance: studentAttendance(db, s),
        results,
        invoices: db.invoices.filter((i) => i.studentId === studentId),
        remarks: s.remarks.filter((r) => isStaff || r.shareable).map((r) => ({ ...r, by: userName(db, r.byUserId) })),
        canEdit: isAdminRole(actor.role),
        canRemark: isAdminRole(actor.role) || isClassTeacherOf(actor, s.sectionId, db),
        canRequestPhoneChange: isClassTeacherOf(actor, s.sectionId, db),
      };
    });
  },

  async admitStudent(input: {
    name: string;
    gender: "male" | "female";
    dob: string;
    sectionId: ID;
    guardians: { name: string; phone: string; relation: GuardianLink["relation"]; hasSmartphone: boolean }[];
  }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      assert(input.guardians.length >= 1 && input.guardians.length <= 3, "A student needs 1–3 guardians.");
      const sec = db.sections.find((s) => s.id === input.sectionId)!;
      const cls = db.classes.find((c) => c.id === sec.classId)!;
      const roll = Math.max(0, ...db.students.filter((s) => s.sectionId === sec.id).map((s) => s.roll)) + 1;
      const studentCode = `DMHS-${String(db.school.academicYear).slice(2)}-${String(cls.order).padStart(2, "0")}${sec.name === "A" ? "1" : "2"}${String(roll).padStart(2, "0")}`;
      const id = uid("stu");
      const links: GuardianLink[] = input.guardians.map((g, i) => {
        const phone = normalizeBdPhone(g.phone);
        let user = db.users.find((u) => u.phone === phone && u.roles.includes("parent"));
        if (!user) {
          user = { id: uid("u_g"), schoolId: db.school.id, name: g.name, phone, roles: ["parent"], status: "invited", passwordHash: "", hasSmartphone: g.hasSmartphone, activationSlip: { code: slipCode(), issuedAt: nowISO(), issuedBy: actor.userId } };
          db.users.push(user);
        }
        return { guardianUserId: user.id, relation: g.relation, isPrimary: i === 0, canAcknowledge: true };
      });
      let userId: ID | undefined;
      if (cls.order >= db.school.settings.studentAccountFromClass) {
        userId = uid("u_s");
        db.users.push({ id: userId, schoolId: db.school.id, name: input.name, loginId: studentCode, roles: ["student"], status: "active", passwordHash: mockHash("demo1234") });
      }
      db.students.push({ id, schoolId: db.school.id, userId, studentId: studentCode, roll, sectionId: sec.id, name: input.name, gender: input.gender, dob: input.dob, guardians: links, status: "active", admittedOn: today(), remarks: [] });
      audit(db, actor.userId, "student.admit", "student", id, { after: { name: input.name, section: sectionLabel(db, sec.id) } });
      return { studentId: id, studentCode };
    });
  },

  async transferStudent(studentId: ID, toSectionId: ID, reason: string) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const s = db.students.find((x) => x.id === studentId)!;
      const before = s.sectionId;
      s.sectionId = toSectionId;
      audit(db, actor.userId, "student.transfer", "student", studentId, { before: sectionLabel(db, before), after: sectionLabel(db, toSectionId), reason });
    });
  },

  async setStudentStatus(studentId: ID, status: Student["status"], reason: string) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const s = db.students.find((x) => x.id === studentId)!;
      const before = s.status;
      s.status = status;
      audit(db, actor.userId, "student.status", "student", studentId, { before, after: status, reason });
    });
  },

  async addRemark(studentId: ID, text: string, shareable: boolean) {
    return command(({ db, actor }) => {
      const s = db.students.find((x) => x.id === studentId)!;
      assert(isAdminRole(actor.role) || isClassTeacherOf(actor, s.sectionId, db), "Only the class teacher can add remarks.");
      s.remarks.unshift({ id: uid("rm"), text, byUserId: actor.userId, at: nowISO(), shareable });
    });
  },

  // ---------- guardians ----------
  async guardians(q?: string) {
    return query(({ db, actor }) => {
      requireAdmin(actor.role);
      const term = q?.toLowerCase().trim();
      return db.users
        .filter((u) => u.roles.includes("parent"))
        .filter((u) => (term ? u.name.toLowerCase().includes(term) || (u.phone ?? "").includes(term) : true))
        .slice(0, 200)
        .map((u) => {
          const kids = db.students.filter((s) => s.guardians.some((g) => g.guardianUserId === u.id));
          return {
            id: u.id,
            name: u.name,
            phoneMasked: maskPhone(u.phone),
            status: u.status,
            hasSmartphone: u.hasSmartphone !== false,
            activation: u.activation,
            slip: u.activationSlip,
            hasPin: Boolean(u.pinHash),
            children: kids.map((k) => ({ id: k.id, name: k.name, section: sectionLabel(db, k.sectionId), relation: k.guardians.find((g) => g.guardianUserId === u.id)!.relation })),
            phoneChangedAt: kids.flatMap((k) => k.guardians).find((g) => g.guardianUserId === u.id && g.phoneChangedAt)?.phoneChangedAt,
          };
        });
    });
  },

  async issueSlip(guardianUserId: ID) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const u = db.users.find((x) => x.id === guardianUserId)!;
      u.activationSlip = { code: slipCode(), issuedAt: nowISO(), issuedBy: actor.userId };
      audit(db, actor.userId, "guardian.slip_issued", "user", guardianUserId);
      const kids = db.students.filter((s) => s.guardians.some((g) => g.guardianUserId === u.id));
      return { code: u.activationSlip.code, name: u.name, phoneMasked: maskPhone(u.phone), children: kids.map((k) => `${k.name} (${sectionLabel(db, k.sectionId)})`), school: db.school.name };
    });
  },

  /** Office flow: the guardian is physically at school and types their own password + PIN. */
  async activateInPerson(input: { guardianUserId: ID; slipCode: string; password: string; pin: string }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const u = db.users.find((x) => x.id === input.guardianUserId)!;
      assert(u.activationSlip?.code === input.slipCode.trim().toUpperCase(), "The slip code does not match.");
      assert(/^\d{4,6}$/.test(input.pin), "PIN must be 4–6 digits.");
      assert(input.password.length >= 8, "Password must be at least 8 characters.");
      u.passwordHash = mockHash(input.password);
      u.pinHash = mockHash(input.pin);
      u.status = "active";
      u.activation = { method: "in_person", at: nowISO() };
      u.activationSlip = undefined;
      db.students.forEach((s) => s.guardians.forEach((g) => g.guardianUserId === u.id && (g.verifiedAt = nowISO())));
      audit(db, actor.userId, "guardian.activate", "user", u.id, { after: { method: "in_person" } });
      sendSms(db, u.phone, `${db.school.name}: your parent account is now active. Never share your PIN with your child.`, "notification", u.id);
    });
  },

  /** Only admin may change a guardian phone. Old number is notified; acknowledgments get flagged for N days. */
  async changeGuardianPhone(input: { guardianUserId: ID; newPhone: string; reason: string; method: "in_person_nid" | "call_old_number" }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      assert(input.reason.trim().length >= 5, "A reason is required.");
      const u = db.users.find((x) => x.id === input.guardianUserId)!;
      const phone = normalizeBdPhone(input.newPhone);
      assert(phone !== u.phone, "This is already the registered number.");
      assert(!db.users.some((x) => x.phone === phone && x.id !== u.id), "This number belongs to another account.");
      const old = u.phone;
      sendSms(db, old, `${db.school.name}: the guardian phone on your account was changed to ${maskPhone(phone)}. If you did not ask for this, call the school at ${db.school.phone.replace("+88", "")} immediately.`, "notification", u.id);
      u.phone = phone;
      const at = nowISO();
      db.students.forEach((s) => s.guardians.forEach((g) => g.guardianUserId === u.id && (g.phoneChangedAt = at)));
      db.devices.filter((d) => d.userId === u.id).forEach((d) => (d.revoked = true));
      audit(db, actor.userId, "guardian.phone_change", "user", u.id, { before: { phone: maskPhone(old) }, after: { phone: maskPhone(phone), method: input.method }, reason: input.reason });
      // tell the other guardians of the same children
      const kids = db.students.filter((s) => s.guardians.some((g) => g.guardianUserId === u.id));
      const others = kids.flatMap((k) => k.guardians.map((g) => g.guardianUserId)).filter((id) => id !== u.id);
      notify(db, { userIds: others, type: "security", title: "Guardian contact changed", body: `The phone number of ${u.name} was changed by the school office.`, sms: true });
    });
  },

  async requestPhoneChange(studentId: ID, guardianUserId: ID, note: string) {
    return command(({ db, actor }) => {
      const s = db.students.find((x) => x.id === studentId)!;
      assert(isClassTeacherOf(actor, s.sectionId, db), "Only the class teacher can request this.");
      audit(db, actor.userId, "guardian.phone_change_request", "user", guardianUserId, { reason: note });
      const admins = db.users.filter((u) => u.roles.includes("school_admin")).map((u) => u.id);
      notify(db, { userIds: admins, type: "security", title: "Guardian phone change requested", body: `${userName(db, actor.userId)} requested a phone change for ${userName(db, guardianUserId)} (${s.name}). Verify in person before changing.`, link: "/admin/guardians" });
    });
  },

  async resetPin(input: { guardianUserId: ID; newPin: string; reason: string }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      assert(/^\d{4,6}$/.test(input.newPin), "PIN must be 4–6 digits.");
      const u = db.users.find((x) => x.id === input.guardianUserId)!;
      u.pinHash = mockHash(input.newPin);
      audit(db, actor.userId, "guardian.pin_reset", "user", u.id, { reason: input.reason });
      const kids = db.students.filter((s) => s.guardians.some((g) => g.guardianUserId === u.id));
      const all = kids.flatMap((k) => k.guardians.map((g) => g.guardianUserId));
      notify(db, { userIds: all, type: "security", title: "Parent PIN was reset", body: `The PIN of ${u.name} was reset at the school office.`, sms: true });
    });
  },

  async linkGuardian(input: { studentId: ID; name: string; phone: string; relation: GuardianLink["relation"]; hasSmartphone: boolean }) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const s = db.students.find((x) => x.id === input.studentId)!;
      assert(s.guardians.length < 3, "A student can have at most 3 guardians.");
      const phone = normalizeBdPhone(input.phone);
      let u = db.users.find((x) => x.phone === phone);
      if (u && !u.roles.includes("parent")) u.roles = [...u.roles, "parent"];
      if (!u) {
        u = { id: uid("u_g"), schoolId: db.school.id, name: input.name, phone, roles: ["parent"], status: "invited", passwordHash: "", hasSmartphone: input.hasSmartphone, activationSlip: { code: slipCode(), issuedAt: nowISO(), issuedBy: actor.userId } };
        db.users.push(u);
      }
      assert(!s.guardians.some((g) => g.guardianUserId === u!.id), "Already linked.");
      s.guardians.push({ guardianUserId: u.id, relation: input.relation, isPrimary: s.guardians.length === 0, canAcknowledge: true });
      audit(db, actor.userId, "guardian.link", "student", s.id, { after: { guardian: u.name, relation: input.relation } });
    });
  },

  async unlinkGuardian(studentId: ID, guardianUserId: ID, reason: string) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const s = db.students.find((x) => x.id === studentId)!;
      assert(s.guardians.length > 1, "A student must keep at least one guardian.");
      s.guardians = s.guardians.filter((g) => g.guardianUserId !== guardianUserId);
      if (!s.guardians.some((g) => g.isPrimary)) s.guardians[0].isPrimary = true;
      audit(db, actor.userId, "guardian.unlink", "student", s.id, { before: { guardian: userName(db, guardianUserId) }, reason });
    });
  },

  // ---------- remote activation (public; off by default) ----------
  async remoteActivationStart(input: { phone: string; slipCode: string }) {
    return publicCommand((db) => {
      if (!db.school.settings.remoteActivationAllowed) throw new Error("Remote activation is turned off. Please activate your account at the school office.");
      const phone = normalizeBdPhone(input.phone);
      const u = db.users.find((x) => x.phone === phone && x.activationSlip?.code === input.slipCode.trim().toUpperCase());
      if (!u) throw new Error("Phone number and slip code do not match.");
      const code = otpCode();
      db.otps.push({ id: uid("otp"), userId: u.id, purpose: "activation", code, expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(), attempts: 0, consumed: false });
      sendSms(db, u.phone, `${db.school.name} activation code: ${code}. Valid 5 minutes. Do not share it with your child.`, "otp", u.id);
      return { userId: u.id };
    });
  },

  async remoteActivationComplete(input: { userId: ID; code: string; password: string; pin: string }) {
    return publicCommand((db) => {
      const u = db.users.find((x) => x.id === input.userId)!;
      const rec = [...db.otps].reverse().find((o) => o.userId === u.id && o.purpose === "activation" && !o.consumed);
      const lock = db.otpLocks.find((l) => l.key === `${u.id}:activation`);
      const res = checkOtp(rec, lock, input.code, Date.now());
      if (res.record) Object.assign(rec!, res.record);
      if (res.lock) db.otpLocks.push(res.lock);
      if (!res.result.ok) throw new Error(res.result.reason === "locked" ? "Too many wrong codes. Try again in 15 minutes." : res.result.reason === "expired" ? "Code expired. Request a new one." : `Wrong code. ${res.result.attemptsLeft ?? 0} attempt(s) left.`);
      if (!/^\d{4,6}$/.test(input.pin)) throw new Error("PIN must be 4–6 digits.");
      if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
      u.passwordHash = mockHash(input.password);
      u.pinHash = mockHash(input.pin);
      u.status = "active";
      u.activation = { method: "remote", at: nowISO() };
      u.activationSlip = undefined;
      audit(db, u.id, "guardian.activate", "user", u.id, { after: { method: "remote" } });
    });
  },

  // ---------- promotion ----------
  async promotionPreview(sectionId: ID) {
    return query(({ db, actor }) => {
      requireAdmin(actor.role);
      const sec = db.sections.find((s) => s.id === sectionId)!;
      const cls = db.classes.find((c) => c.id === sec.classId)!;
      const next = db.classes.find((c) => c.order === cls.order + 1);
      const target = next ? db.sections.find((s) => s.classId === next.id && s.name === sec.name) : undefined;
      const latestExam = [...db.exams].filter((e) => db.sectionResults.some((r) => r.examId === e.id && r.sectionId === sectionId && r.state === "PUBLISHED")).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
      return {
        from: sectionLabel(db, sectionId),
        to: target ? sectionLabel(db, target.id) : "Graduated (left school)",
        targetSectionId: target?.id ?? null,
        basedOn: latestExam?.name ?? "No published exam",
        students: db.students
          .filter((s) => s.sectionId === sectionId && s.status === "active")
          .map((s) => {
            const r = latestExam ? db.results.find((x) => x.examId === latestExam.id && x.studentId === s.id && x.state === "PUBLISHED") : undefined;
            return { id: s.id, name: s.name, roll: s.roll, gpa: r?.gpa ?? null, passed: r?.passed ?? true };
          }),
      };
    });
  },

  async applyPromotion(sectionId: ID, promoteIds: ID[], reason: string) {
    return command(({ db, actor }) => {
      requireAdmin(actor.role);
      const sec = db.sections.find((s) => s.id === sectionId)!;
      const cls = db.classes.find((c) => c.id === sec.classId)!;
      const next = db.classes.find((c) => c.order === cls.order + 1);
      const target = next ? db.sections.find((s) => s.classId === next.id && s.name === sec.name) : undefined;
      for (const id of promoteIds) {
        const s = db.students.find((x) => x.id === id);
        if (!s || s.sectionId !== sectionId) continue;
        if (target) s.sectionId = target.id;
        else s.status = "left";
      }
      audit(db, actor.userId, "promotion.apply", "section", sectionId, { after: { promoted: promoteIds.length, to: target ? sectionLabel(db, target.id) : "graduated" }, reason });
    });
  },
};

export type SchoolService = typeof mockSchoolService;
