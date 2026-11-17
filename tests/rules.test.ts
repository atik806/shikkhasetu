import { describe, expect, it } from "vitest";
import { CLASS_TEACHER_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS, permissionsFor, rolesForPath } from "@/lib/auth/permissions";
import { canAccessSection, canTeach, canViewStudent, type ScopeData } from "@/lib/auth/scope";
import { detectAnomalies, needsFollowUp, type AnomalyContext } from "@/features/acknowledgments/lib/anomaly";
import { absenceStreak, attendancePercent, detectMismatches, isDuplicateScan, isLate, isRegisterLocked } from "@/features/attendance/lib/attendance";
import { canLock, canPublish, sectionWorkflowState, ackStatus } from "@/features/results/lib/workflow";
import { checkOtp } from "@/lib/otp";
import { isValidBdPhone, maskPhone, normalizeBdPhone } from "@/lib/phone";
import type { AttendanceSheet, GateEvent, OtpRecord, Role, Section, Student } from "@/types";

describe("permission map", () => {
  const table: [Role, string, boolean][] = [
    ["school_admin", "results.publish", true],
    ["teacher", "results.publish", false],
    ["parent", "results.publish", false],
    ["parent", "results.acknowledge", true],
    ["student", "results.acknowledge", false],
    ["teacher", "results.acknowledge", false],
    ["school_admin", "results.acknowledge", false],
    ["gate_staff", "gate.scan", true],
    ["teacher", "gate.scan", false],
    ["student", "ack.view", false],
    ["student", "ack.status_only", true],
    ["teacher", "guardians.manage", false],
    ["school_admin", "guardians.manage", true],
    ["parent", "messages.use", true],
    ["student", "messages.use", false],
    ["teacher", "results.lock", false],
    ["gate_staff", "results.view", false],
  ];
  it.each(table)("%s / %s → %s", (role, perm, expected) => {
    expect(ROLE_PERMISSIONS[role].includes(perm as never)).toBe(expected);
  });

  it("class teacher extras apply only to teachers who are class teachers", () => {
    expect(permissionsFor("teacher", false).has("results.lock")).toBe(false);
    expect(permissionsFor("teacher", true).has("results.lock")).toBe(true);
    expect(permissionsFor("parent", true).has("results.lock")).toBe(false);
  });

  it("every role permission is a declared permission", () => {
    for (const perms of [...Object.values(ROLE_PERMISSIONS), CLASS_TEACHER_PERMISSIONS]) for (const p of perms) expect(PERMISSIONS).toContain(p);
  });

  it("maps route prefixes to roles", () => {
    expect(rolesForPath("/parent/results/x")).toEqual(["parent"]);
    expect(rolesForPath("/admin")).toEqual(["school_admin", "super_admin"]);
    expect(rolesForPath("/verify/abc")).toBeNull();
    expect(rolesForPath("/administrator")).toBeNull();
  });
});

describe("scope helpers", () => {
  const sections = [{ id: "s1", classTeacherId: "t1" }, { id: "s2", classTeacherId: "t2" }] as Section[];
  const students = [
    { id: "st1", sectionId: "s1", userId: "u_st1", guardians: [{ guardianUserId: "p1" }] },
    { id: "st2", sectionId: "s2", userId: "u_st2", guardians: [{ guardianUserId: "p2" }] },
  ] as Student[];
  const data: ScopeData = { sections, students, assignments: [{ teacherId: "t3", sectionId: "s2", subjectId: "math" }] };

  it("teachers reach only sections they teach or class-teach", () => {
    expect(canAccessSection({ userId: "t1", role: "teacher" }, "s1", data)).toBe(true);
    expect(canAccessSection({ userId: "t1", role: "teacher" }, "s2", data)).toBe(false);
    expect(canAccessSection({ userId: "t3", role: "teacher" }, "s2", data)).toBe(true);
    expect(canTeach({ userId: "t3", role: "teacher" }, "s2", "math", data)).toBe(true);
    expect(canTeach({ userId: "t3", role: "teacher" }, "s2", "bangla", data)).toBe(false);
  });

  it("parents see only their own children; students only themselves", () => {
    expect(canViewStudent({ userId: "p1", role: "parent" }, "st1", data)).toBe(true);
    expect(canViewStudent({ userId: "p1", role: "parent" }, "st2", data)).toBe(false);
    expect(canViewStudent({ userId: "u_st1", role: "student" }, "st1", data)).toBe(true);
    expect(canViewStudent({ userId: "u_st1", role: "student" }, "st2", data)).toBe(false);
  });
});

describe("anomaly rules", () => {
  const base: AnomalyContext = { studentDeviceIds: [], phoneChangeFlagDays: 7, sameDeviceAcks: [], siblingIds: [], studentId: "s1", failedAttempts: 0, remoteActivationFirstAck: false, deviceId: "d1", at: "2026-11-16T10:00:00.000Z" };

  it("no flags for a normal acknowledgment", () => {
    expect(detectAnomalies(base)).toEqual([]);
  });
  it("same device as student is LOW and alone does not need follow-up", () => {
    const f = detectAnomalies({ ...base, studentDeviceIds: ["d1"] });
    expect(f).toEqual([expect.objectContaining({ code: "same_device_as_student", severity: "low" })]);
    expect(needsFollowUp({ anomalyFlags: f })).toBe(false);
  });
  it("recent phone change is HIGH", () => {
    const f = detectAnomalies({ ...base, phoneChangedAt: "2026-11-13T10:00:00.000Z" });
    expect(f[0]).toMatchObject({ code: "phone_recently_changed", severity: "high" });
    expect(detectAnomalies({ ...base, phoneChangedAt: "2026-10-01T10:00:00.000Z" })).toEqual([]);
  });
  it("one device for non-sibling students is HIGH; siblings are fine", () => {
    expect(detectAnomalies({ ...base, sameDeviceAcks: [{ studentId: "s9" }] })[0]).toMatchObject({ code: "multi_student_device", severity: "high" });
    expect(detectAnomalies({ ...base, sameDeviceAcks: [{ studentId: "s2" }], siblingIds: ["s2"] })).toEqual([]);
  });
  it("failed attempts and remote activation are MEDIUM", () => {
    expect(detectAnomalies({ ...base, failedAttempts: 2 })[0].severity).toBe("medium");
    expect(detectAnomalies({ ...base, remoteActivationFirstAck: true })[0].severity).toBe("medium");
  });
  it("never flags late-night acknowledgments", () => {
    expect(detectAnomalies({ ...base, at: "2026-11-16T17:30:00.000Z" /* 11:30 PM Dhaka */ })).toEqual([]);
  });
});

describe("attendance rules", () => {
  const sheet = (entries: AttendanceSheet["entries"]): AttendanceSheet => ({ id: "x", schoolId: "s", sectionId: "s1", date: "2026-11-16", entries, markedBy: "t", submittedAt: "", edits: [] });
  const gate = (studentId: string): GateEvent => ({ id: studentId, schoolId: "s", studentId, type: "IN", at: "2026-11-16T01:20:00.000Z", byUserId: "g" });

  it("detects gate-in-but-absent and present-without-gate, ignoring leave", () => {
    const m = detectMismatches("2026-11-16", sheet({ a: "A", b: "P", c: "P", d: "LV" }), [gate("a"), gate("c"), gate("d")], ["a", "b", "c", "d"]);
    expect(m).toEqual([
      expect.objectContaining({ studentId: "a", kind: "gate_in_class_absent" }),
      expect.objectContaining({ studentId: "b", kind: "class_present_no_gate" }),
    ]);
  });
  it("counts consecutive absences", () => {
    expect(absenceStreak("a", [sheet({ a: "A" }), sheet({ a: "A" }), sheet({ a: "A" }), sheet({ a: "P" })])).toBe(3);
    expect(absenceStreak("a", [sheet({ a: "P" }), sheet({ a: "A" })])).toBe(0);
  });
  it("attendance % excludes approved leave, counts late as present", () => {
    expect(attendancePercent(["P", "L", "A", "LV"])).toBe(66.7);
  });
  it("duplicate scans of the same type within 2 minutes are ignored", () => {
    const ev = [gate("a")];
    expect(isDuplicateScan(ev, "a", "IN", "2026-11-16T01:21:00.000Z")).toBe(true);
    expect(isDuplicateScan(ev, "a", "OUT", "2026-11-16T01:21:00.000Z")).toBe(false);
    expect(isDuplicateScan(ev, "a", "IN", "2026-11-16T01:25:00.000Z")).toBe(false);
  });
  it("late after start + grace", () => {
    expect(isLate(7 * 60 + 40, 7 * 60 + 30, 10)).toBe(false);
    expect(isLate(7 * 60 + 41, 7 * 60 + 30, 10)).toBe(true);
  });
  it("register locks after lock time on the same day and for past days", () => {
    expect(isRegisterLocked("2026-11-16", "2026-11-16", 600, 630)).toBe(false);
    expect(isRegisterLocked("2026-11-16", "2026-11-16", 631, 630)).toBe(true);
    expect(isRegisterLocked("2026-11-15", "2026-11-16", 0, 630)).toBe(true);
  });
});

describe("result workflow", () => {
  it("locks only when every subject is submitted, publishes only when locked", () => {
    expect(canLock("OPEN", ["SUBMITTED", "DRAFT"])).toBe(false);
    expect(canLock("OPEN", ["SUBMITTED", "SUBMITTED"])).toBe(true);
    expect(canLock("LOCKED", ["SUBMITTED"])).toBe(false);
    expect(canPublish("OPEN")).toBe(false);
    expect(canPublish("LOCKED")).toBe(true);
    expect(sectionWorkflowState("OPEN", ["SUBMITTED", "SUBMITTED"])).toBe("SUBMITTED");
  });
  it("derives acknowledgment status from the deadline", () => {
    expect(ackStatus(true, "2026-11-10", "2026-11-16")).toBe("acknowledged");
    expect(ackStatus(false, "2026-11-20", "2026-11-16")).toBe("pending");
    expect(ackStatus(false, "2026-11-10", "2026-11-16")).toBe("overdue");
  });
});

describe("OTP", () => {
  const t0 = Date.parse("2026-11-16T10:00:00.000Z");
  const rec: OtpRecord = { id: "o", userId: "u", purpose: "ack", code: "123987", expiresAt: new Date(t0 + 300_000).toISOString(), attempts: 0, consumed: false };

  it("accepts the right code once", () => {
    const r = checkOtp(rec, undefined, "123987", t0 + 1000);
    expect(r.result.ok).toBe(true);
    expect(r.record?.consumed).toBe(true);
  });
  it("expires after 5 minutes", () => {
    expect(checkOtp(rec, undefined, "123987", t0 + 300_001).result).toMatchObject({ ok: false, reason: "expired" });
  });
  it("locks for 15 minutes after 3 wrong codes", () => {
    let r = rec;
    let out = checkOtp(r, undefined, "000000", t0);
    r = out.record!;
    out = checkOtp(r, undefined, "000000", t0);
    r = out.record!;
    out = checkOtp(r, undefined, "000000", t0);
    expect(out.result).toMatchObject({ ok: false, reason: "locked" });
    expect(new Date(out.lock!.until).getTime()).toBe(t0 + 15 * 60_000);
    expect(checkOtp({ ...rec, id: "new" }, out.lock, "123987", t0 + 60_000).result).toMatchObject({ reason: "locked" });
  });
});

describe("phone numbers", () => {
  it("validates and normalizes Bangladeshi mobiles", () => {
    expect(isValidBdPhone("01712345678")).toBe(true);
    expect(isValidBdPhone("+8801712345678")).toBe(true);
    expect(isValidBdPhone("8801712345678")).toBe(true);
    expect(isValidBdPhone("01212345678")).toBe(false);
    expect(isValidBdPhone("0171234567")).toBe(false);
    expect(normalizeBdPhone("017-1234-5678")).toBe("+8801712345678");
    expect(maskPhone("+8801712345678")).toBe("017****5678");
  });
});
