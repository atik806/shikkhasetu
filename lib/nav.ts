import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSearch,
  GraduationCap,
  Home,
  IdCard,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquare,
  NotebookPen,
  ScanLine,
  School,
  Settings,
  ShieldCheck,
  Signature,
  TrendingUp,
  UserCog,
  Users,
  UsersRound,
  CalendarClock,
  Plane,
  Radar,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string; // key in messages "nav"
  icon: LucideIcon;
  classTeacherOnly?: boolean;
}

export const NAV: Record<Role, NavItem[]> = {
  school_admin: [
    { href: "/admin", label: "dashboard", icon: LayoutDashboard },
    { href: "/admin/students", label: "students", icon: GraduationCap },
    { href: "/admin/guardians", label: "guardians", icon: UsersRound },
    { href: "/admin/teachers", label: "teachers", icon: Users },
    { href: "/admin/classes", label: "classes", icon: School },
    { href: "/admin/exams", label: "exams", icon: ClipboardCheck },
    { href: "/admin/attendance", label: "attendance", icon: CalendarCheck },
    { href: "/admin/timetable", label: "timetable", icon: CalendarDays },
    { href: "/admin/notices", label: "notices", icon: Megaphone },
    { href: "/admin/fees", label: "fees", icon: CreditCard },
    { href: "/admin/leave", label: "leave", icon: Plane },
    { href: "/admin/messages", label: "messages", icon: MessageSquare },
    { href: "/admin/reports", label: "reports", icon: BarChart3 },
    { href: "/admin/promotion", label: "promotion", icon: TrendingUp },
    { href: "/admin/audit", label: "audit", icon: FileSearch },
    { href: "/admin/users", label: "users", icon: UserCog },
    { href: "/admin/settings", label: "settings", icon: Settings },
  ],
  super_admin: [],
  teacher: [
    { href: "/teacher", label: "dashboard", icon: LayoutDashboard },
    { href: "/teacher/attendance", label: "takeAttendance", icon: CalendarCheck },
    { href: "/teacher/marks", label: "marks", icon: ClipboardList },
    { href: "/teacher/homework", label: "homework", icon: NotebookPen },
    { href: "/teacher/notices", label: "notices", icon: Megaphone },
    { href: "/teacher/messages", label: "messages", icon: MessageSquare },
    { href: "/teacher/meetings", label: "meetings", icon: CalendarClock },
    { href: "/teacher/timetable", label: "timetable", icon: CalendarDays },
    { href: "/teacher/section", label: "mySection", icon: Radar, classTeacherOnly: true },
    { href: "/teacher/results", label: "resultReview", icon: ListChecks, classTeacherOnly: true },
    { href: "/teacher/acknowledgments", label: "acknowledgments", icon: Signature, classTeacherOnly: true },
    { href: "/teacher/leave", label: "leave", icon: Plane, classTeacherOnly: true },
  ],
  parent: [
    { href: "/parent", label: "home", icon: Home },
    { href: "/parent/attendance", label: "attendance", icon: CalendarCheck },
    { href: "/parent/results", label: "results", icon: ClipboardCheck },
    { href: "/parent/homework", label: "homework", icon: BookOpen },
    { href: "/parent/notices", label: "notices", icon: Megaphone },
    { href: "/parent/fees", label: "fees", icon: CreditCard },
    { href: "/parent/leave", label: "leave", icon: Plane },
    { href: "/parent/messages", label: "messages", icon: MessageSquare },
    { href: "/parent/meetings", label: "meetings", icon: CalendarClock },
    { href: "/parent/settings", label: "notificationSettings", icon: Bell },
    { href: "/parent/security", label: "security", icon: ShieldCheck },
  ],
  student: [
    { href: "/student", label: "home", icon: Home },
    { href: "/student/timetable", label: "timetable", icon: CalendarDays },
    { href: "/student/homework", label: "homework", icon: BookOpen },
    { href: "/student/results", label: "results", icon: ClipboardCheck },
    { href: "/student/attendance", label: "attendance", icon: CalendarCheck },
    { href: "/student/notices", label: "notices", icon: Megaphone },
    { href: "/student/id-card", label: "idCard", icon: IdCard },
  ],
  gate_staff: [
    { href: "/gate", label: "gate", icon: ScanLine },
    { href: "/gate/log", label: "gateLog", icon: ListChecks },
  ],
};
NAV.super_admin = NAV.school_admin;

/** Parent/student mobile bottom bar: first 4 + "more". */
export const MOBILE_TABS: Partial<Record<Role, string[]>> = {
  parent: ["/parent", "/parent/attendance", "/parent/results", "/parent/messages"],
  student: ["/student", "/student/homework", "/student/results", "/student/timetable"],
  gate_staff: ["/gate", "/gate/log"],
};
