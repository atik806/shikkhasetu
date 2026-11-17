/**
 * Scope helpers: a permission says WHAT a user may do, scope says ON WHICH records.
 * Pure functions over plain data so the backend can reuse them.
 */
import type { ID, Role, Section, Student, TeachingAssignment } from "@/types";
import { permissionsFor, type Permission } from "./permissions";

export interface Actor {
  userId: ID;
  role: Role;
}

export interface ScopeData {
  sections: Section[];
  assignments: TeachingAssignment[];
  students: Student[];
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function classTeacherSectionIds(userId: ID, data: Pick<ScopeData, "sections">): ID[] {
  return data.sections.filter((s) => s.classTeacherId === userId).map((s) => s.id);
}

export function teachingSectionIds(userId: ID, data: Pick<ScopeData, "assignments">): ID[] {
  return [...new Set(data.assignments.filter((a) => a.teacherId === userId).map((a) => a.sectionId))];
}

export function isAdminRole(role: Role) {
  return role === "school_admin" || role === "super_admin";
}

export function can(actor: Actor, permission: Permission, data: Pick<ScopeData, "sections">): boolean {
  const isCT = actor.role === "teacher" && classTeacherSectionIds(actor.userId, data).length > 0;
  return permissionsFor(actor.role, isCT).has(permission);
}

export function childIds(userId: ID, data: Pick<ScopeData, "students">): ID[] {
  return data.students.filter((s) => s.guardians.some((g) => g.guardianUserId === userId)).map((s) => s.id);
}

/** Sections the actor can see in a teaching capacity (admin: all). */
export function accessibleSectionIds(actor: Actor, data: ScopeData): ID[] {
  if (isAdminRole(actor.role)) return data.sections.map((s) => s.id);
  if (actor.role === "teacher")
    return [...new Set([...teachingSectionIds(actor.userId, data), ...classTeacherSectionIds(actor.userId, data)])];
  return [];
}

export function canAccessSection(actor: Actor, sectionId: ID, data: ScopeData): boolean {
  return accessibleSectionIds(actor, data).includes(sectionId);
}

export function isClassTeacherOf(actor: Actor, sectionId: ID, data: Pick<ScopeData, "sections">): boolean {
  return actor.role === "teacher" && data.sections.some((s) => s.id === sectionId && s.classTeacherId === actor.userId);
}

export function canTeach(actor: Actor, sectionId: ID, subjectId: ID, data: Pick<ScopeData, "assignments">): boolean {
  return data.assignments.some((a) => a.teacherId === actor.userId && a.sectionId === sectionId && a.subjectId === subjectId);
}

export function canViewStudent(actor: Actor, studentId: ID, data: ScopeData): boolean {
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return false;
  switch (actor.role) {
    case "super_admin":
    case "school_admin":
      return true;
    case "teacher":
      return canAccessSection(actor, student.sectionId, data);
    case "parent":
      return student.guardians.some((g) => g.guardianUserId === actor.userId);
    case "student":
      return student.userId === actor.userId;
    case "gate_staff":
      return true; // gate needs name + photo to verify identity; nothing else is exposed to this role
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
