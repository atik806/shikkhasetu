import { describe, expect, it } from "vitest";
import { buildSeed, DEMO_ACCOUNTS, RAHIM } from "@/lib/mock/seed";
import { needsFollowUp } from "@/features/acknowledgments/lib/anomaly";

describe("demo seed", () => {
  const db = buildSeed();

  it("has the expected school shape", () => {
    expect(db.classes).toHaveLength(10);
    expect(db.sections).toHaveLength(20);
    expect(db.students.length).toBe(360);
    expect(db.users.filter((u) => u.roles.includes("teacher")).length).toBe(25);
  });

  it("every phone is a valid normalized BD mobile and unique", () => {
    const phones = db.users.map((u) => u.phone).filter(Boolean) as string[];
    phones.forEach((p) => expect(p).toMatch(/^\+8801[3-9]\d{8}$/));
    expect(new Set(phones).size).toBe(phones.length);
  });

  it("demo accounts exist and are linked correctly", () => {
    const rahim = db.students.find((s) => s.id === RAHIM)!;
    expect(rahim.userId).toBe(DEMO_ACCOUNTS.student);
    expect(rahim.guardians.map((g) => g.guardianUserId)).toEqual([DEMO_ACCOUNTS.parentTwoKids, DEMO_ACCOUNTS.parentMother]);
    expect(db.students.filter((s) => s.guardians.some((g) => g.guardianUserId === DEMO_ACCOUNTS.parentTwoKids))).toHaveLength(2);
    expect(db.sections.find((s) => s.id === "sec_8A")!.classTeacherId).toBe(DEMO_ACCOUNTS.classTeacher);
    expect(db.users.find((u) => u.id === DEMO_ACCOUNTS.teacherParent)!.roles).toEqual(["teacher", "parent"]);
  });

  it("covers every acknowledgment case for the demo", () => {
    const codes = new Set(db.acks.flatMap((a) => a.anomalyFlags.map((f) => f.code)));
    expect([...codes].sort()).toEqual(["failed_attempts", "multi_student_device", "phone_recently_changed", "remote_activation_first_ack", "same_device_as_student"]);
    expect(db.acks.some((a) => a.channel === "in_person")).toBe(true);
    expect(db.acks.some((a) => a.channel === "sms_code")).toBe(true);
    expect(db.results.some((r) => r.paperReturned && !db.acks.some((a) => a.resultVersionId === r.id))).toBe(true);
    expect(db.acks.some((a) => needsFollowUp(a))).toBe(true);
    // Rahim's Class Test 3 is pending for the golden path
    const rv = db.results.find((r) => r.examId === "ex_ct3" && r.studentId === RAHIM)!;
    expect(db.acks.some((a) => a.resultVersionId === rv.id)).toBe(false);
  });

  it("annual exam is mid-workflow: 8-A open with a draft Math sheet, some sections locked", () => {
    expect(db.sectionResults.find((r) => r.id === "ex_annual:sec_8A")!.state).toBe("OPEN");
    expect(db.markSheets.find((m) => m.id === "ex_annual:sec_8A:sub_8_math")!.status).toBe("DRAFT");
    expect(db.sectionResults.filter((r) => r.examId === "ex_annual" && r.state === "LOCKED").length).toBeGreaterThan(0);
  });

  it("fits comfortably in browser storage", () => {
    const bytes = JSON.stringify(db).length;
    expect(bytes).toBeLessThan(12_000_000);
    console.info(`seed size ≈ ${(bytes / 1_000_000).toFixed(2)} MB`);
  });
});
