/**
 * Role → permission map.
 *
 * SECURITY NOTE: every check in the frontend is UX only. The future backend must import this
 * file (it has no UI dependencies) and re-enforce every rule plus every scope check server-side.
 *
 * Adding a role = add it to `Role` in /types and give it an entry here. No component changes.
 */
import type { Role } from "@/types";

export const PERMISSIONS = [
  "settings.manage",
  "users.manage",
  "students.manage",
  "guardians.manage",
  "guardians.change_request",
  "attendance.mark",
  "attendance.override",
  "attendance.view",
  "gate.scan",
  "gate.view",
  "gate.correct",
  "mismatch.resolve",
  "marks.enter",
  "marks.override",
  "results.lock",
  "results.publish",
  "results.correct",
  "results.view",
  "results.acknowledge",
  "ack.view",
  "ack.record",
  "ack.status_only",
  "notices.post",
  "notices.post_school",
  "notices.view",
  "homework.assign",
  "homework.diary",
  "homework.view",
  "homework.mark_done",
  "leave.submit",
  "leave.approve",
  "leave.view",
  "messages.use",
  "messages.view_all",
  "meetings.manage",
  "meetings.book",
  "timetable.manage",
  "timetable.view",
  "fees.manage",
  "fees.view",
  "fees.pay",
  "reports.view",
  "audit.view",
  "remarks.write",
  "idcard.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ADMIN: Permission[] = [
  "settings.manage",
  "users.manage",
  "students.manage",
  "guardians.manage",
  "attendance.override",
  "attendance.view",
  "gate.view",
  "gate.correct",
  "mismatch.resolve",
  "marks.override",
  "results.lock",
  "results.publish",
  "results.correct",
  "results.view",
  "ack.view",
  "ack.record",
  "notices.post",
  "notices.post_school",
  "notices.view",
  "leave.approve",
  "leave.view",
  "messages.use",
  "messages.view_all",
  "timetable.manage",
  "timetable.view",
  "fees.manage",
  "fees.view",
  "reports.view",
  "audit.view",
  "remarks.write",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ADMIN,
  school_admin: ADMIN,
  teacher: [
    "attendance.mark",
    "attendance.view",
    "marks.enter",
    "results.view",
    "notices.post",
    "notices.view",
    "homework.assign",
    "homework.view",
    "messages.use",
    "meetings.manage",
    "timetable.view",
    "reports.view",
  ],
  parent: [
    "attendance.view",
    "results.view",
    "results.acknowledge",
    "ack.view",
    "notices.view",
    "homework.view",
    "leave.submit",
    "leave.view",
    "messages.use",
    "meetings.book",
    "timetable.view",
    "fees.view",
    "fees.pay",
    "reports.view",
  ],
  student: [
    "attendance.view",
    "results.view",
    "ack.status_only",
    "notices.view",
    "homework.view",
    "homework.mark_done",
    "leave.view",
    "timetable.view",
    "fees.view",
    "idcard.view",
  ],
  gate_staff: ["gate.scan", "gate.view"],
};

/**
 * Extra permissions a teacher gets for the ONE section where they are class teacher.
 * Derived from Section.classTeacherId, never stored as a role.
 */
export const CLASS_TEACHER_PERMISSIONS: Permission[] = [
  "attendance.mark",
  "gate.view",
  "mismatch.resolve",
  "results.lock",
  "results.view",
  "ack.view",
  "ack.record",
  "homework.diary",
  "leave.approve",
  "leave.view",
  "guardians.change_request",
  "remarks.write",
];

/** Route prefix → roles allowed to open it. Used by proxy.ts (optimistic check). */
export const ROUTE_ROLES: Record<string, Role[]> = {
  "/admin": ["school_admin", "super_admin"],
  "/teacher": ["teacher"],
  "/parent": ["parent"],
  "/student": ["student"],
  "/gate": ["gate_staff"],
};

export const HOME_FOR_ROLE: Record<Role, string> = {
  super_admin: "/admin",
  school_admin: "/admin",
  teacher: "/teacher",
  parent: "/parent",
  student: "/student",
  gate_staff: "/gate",
};

export function roleHas(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role, isClassTeacher: boolean): Set<Permission> {
  const set = new Set(ROLE_PERMISSIONS[role]);
  if (role === "teacher" && isClassTeacher) CLASS_TEACHER_PERMISSIONS.forEach((p) => set.add(p));
  return set;
}

export function rolesForPath(pathname: string): Role[] | null {
  const prefix = Object.keys(ROUTE_ROLES).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  return prefix ? ROUTE_ROLES[prefix] : null;
}
