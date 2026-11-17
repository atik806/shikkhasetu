import type {
  Acknowledgment,
  AttendanceSheet,
  AuditEvent,
  ClassLevel,
  DeviceSession,
  Exam,
  FeeHead,
  FeeStructure,
  GateEvent,
  GradingScale,
  Holiday,
  Homework,
  Invoice,
  LeaveRequest,
  MarkSheet,
  MeetingSlot,
  Message,
  MessageThread,
  MismatchResolution,
  Notice,
  Notification,
  OtpLock,
  OtpRecord,
  Payment,
  ResultVersion,
  School,
  Section,
  SectionResultState,
  SmsAckCode,
  SmsMessage,
  Student,
  Subject,
  TeachingAssignment,
  TimetableSlot,
  User,
} from "@/types";

export const DB_VERSION = 3;

/** The whole mock database. Lives in IndexedDB in the browser. */
export interface MockDB {
  version: number;
  seededAt: string;
  school: School;
  users: User[];
  classes: ClassLevel[];
  sections: Section[];
  subjects: Subject[];
  assignments: TeachingAssignment[];
  students: Student[];
  gateEvents: GateEvent[];
  attendance: AttendanceSheet[];
  mismatchResolutions: MismatchResolution[];
  gradingScales: GradingScale[];
  exams: Exam[];
  markSheets: MarkSheet[];
  sectionResults: SectionResultState[];
  results: ResultVersion[];
  acks: Acknowledgment[];
  notifications: Notification[];
  sms: SmsMessage[];
  otps: OtpRecord[];
  otpLocks: OtpLock[];
  pinAttempts: { userId: string; failures: number; lockedUntil?: string }[];
  smsAckCodes: SmsAckCode[];
  audit: AuditEvent[];
  notices: Notice[];
  homework: Homework[];
  timetable: TimetableSlot[];
  holidays: Holiday[];
  leaves: LeaveRequest[];
  feeHeads: FeeHead[];
  feeStructures: FeeStructure[];
  invoices: Invoice[];
  payments: Payment[];
  threads: MessageThread[];
  messages: Message[];
  meetings: MeetingSlot[];
  devices: DeviceSession[];
}
