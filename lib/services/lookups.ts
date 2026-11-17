import type { ID, Section, Student } from "@/types";
import type { MockDB } from "@/lib/mock/schema";
import { maskPhone } from "@/lib/phone";

export function sectionLabel(db: MockDB, sectionId: ID): string {
  const sec = db.sections.find((s) => s.id === sectionId);
  if (!sec) return "—";
  const cls = db.classes.find((c) => c.id === sec.classId);
  return `Class ${cls?.name ?? "?"}-${sec.name}`;
}

export function sectionOf(db: MockDB, studentId: ID): Section | undefined {
  const st = db.students.find((s) => s.id === studentId);
  return st ? db.sections.find((s) => s.id === st.sectionId) : undefined;
}

export function classOrder(db: MockDB, sectionId: ID): number {
  const sec = db.sections.find((s) => s.id === sectionId);
  return db.classes.find((c) => c.id === sec?.classId)?.order ?? 0;
}

export function subjectName(db: MockDB, subjectId?: ID): string {
  if (!subjectId) return "Diary";
  return db.subjects.find((s) => s.id === subjectId)?.name ?? "—";
}

export interface StudentBrief {
  id: ID;
  name: string;
  studentId: string;
  roll: number;
  sectionId: ID;
  sectionLabel: string;
  gender: Student["gender"];
}

export function studentBrief(db: MockDB, s: Student): StudentBrief {
  return { id: s.id, name: s.name, studentId: s.studentId, roll: s.roll, sectionId: s.sectionId, sectionLabel: sectionLabel(db, s.sectionId), gender: s.gender };
}

export interface GuardianBrief {
  userId: ID;
  name: string;
  relation: string;
  phoneMasked: string;
  isPrimary: boolean;
  canAcknowledge: boolean;
  status: string;
  hasSmartphone: boolean;
  activation?: string;
  phoneChangedAt?: string;
}

export function guardianBriefs(db: MockDB, s: Student): GuardianBrief[] {
  return s.guardians.map((g) => {
    const u = db.users.find((x) => x.id === g.guardianUserId);
    return {
      userId: g.guardianUserId,
      name: u?.name ?? "—",
      relation: g.relation,
      phoneMasked: maskPhone(u?.phone),
      isPrimary: g.isPrimary,
      canAcknowledge: g.canAcknowledge,
      status: u?.status ?? "—",
      hasSmartphone: u?.hasSmartphone !== false,
      activation: u?.activation?.method,
      phoneChangedAt: g.phoneChangedAt,
    };
  });
}

export function relationLabel(db: MockDB, studentId: ID, guardianUserId: ID): string {
  const st = db.students.find((s) => s.id === studentId);
  const rel = st?.guardians.find((g) => g.guardianUserId === guardianUserId)?.relation ?? "guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1);
}
