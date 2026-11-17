"use client";
/**
 * Single provider switch. To move to a real backend, write `apiXxxService` objects that satisfy
 * the same types (e.g. `export const apiResultService = {...} satisfies ResultService`) and swap them here.
 * No UI file imports a mock directly.
 */
import { mockAuthService, type AuthService } from "@/features/auth/service";
import { mockSchoolService, type SchoolService } from "@/features/school/service";
import { mockAttendanceService, type AttendanceService } from "@/features/attendance/service";
import { mockResultService, type ResultService } from "@/features/results/service";
import { mockAckService, type AckService } from "@/features/acknowledgments/service";
import { mockNotificationService, type NotificationService } from "@/features/notifications/service";
import { mockNoticeService, type NoticeService } from "@/features/notices/service";
import { mockHomeworkService, type HomeworkService } from "@/features/homework/service";
import { mockTimetableService, type TimetableService } from "@/features/timetable/service";
import { mockLeaveService, type LeaveService } from "@/features/leave/service";
import { mockFeeService, type FeeService } from "@/features/fees/service";
import { mockMessagingService, type MessagingService } from "@/features/messaging/service";
import { mockReportService, type ReportService } from "@/features/reports/service";

export interface Services {
  auth: AuthService;
  school: SchoolService;
  attendance: AttendanceService;
  results: ResultService;
  acks: AckService;
  notifications: NotificationService;
  notices: NoticeService;
  homework: HomeworkService;
  timetable: TimetableService;
  leave: LeaveService;
  fees: FeeService;
  messaging: MessagingService;
  reports: ReportService;
}

export const services: Services = {
  auth: mockAuthService,
  school: mockSchoolService,
  attendance: mockAttendanceService,
  results: mockResultService,
  acks: mockAckService,
  notifications: mockNotificationService,
  notices: mockNoticeService,
  homework: mockHomeworkService,
  timetable: mockTimetableService,
  leave: mockLeaveService,
  fees: mockFeeService,
  messaging: mockMessagingService,
  reports: mockReportService,
};
