// Domain types — single source of truth. Shared later with the backend.

export type ID = string;
export type ISODate = string; // yyyy-MM-dd (Asia/Dhaka calendar date)
export type ISODateTime = string; // full ISO timestamp

export type Role = "super_admin" | "school_admin" | "teacher" | "parent" | "student" | "gate_staff";
export type Weekday = "Sat" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export interface User {
  id: ID;
  schoolId: ID;
  name: string;
  nameBn?: string;
  phone?: string; // normalized +8801XXXXXXXXX
  email?: string;
  loginId?: string; // student ID for students
  roles: Role[];
  status: "active" | "invited" | "disabled";
  passwordHash: string; // mock only
  pinHash?: string; // parents only
  activation?: { method: "in_person" | "remote"; at: ISODateTime };
  activationSlip?: { code: string; issuedAt: ISODateTime; issuedBy: ID };
  hasSmartphone?: boolean; // guardians; false → sms_code channel
  notificationPrefs?: Partial<Record<NotificationType, { inApp: boolean; sms: boolean }>>;
  language?: "en" | "bn";
}

export interface Shift {
  id: ID;
  name: "Morning" | "Day";
  startTime: string; // HH:mm
  endTime: string;
  graceMinutes: number;
}

export interface GradeBand {
  min: number; // inclusive percentage
  letter: string;
  gp: number;
}

export interface GradingScale {
  id: ID;
  name: string;
  passPercent: number;
  bands: GradeBand[];
}

export interface SchoolSettings {
  weeklyHolidays: Weekday[];
  gateModuleEnabled: boolean;
  periodAttendanceEnabled: boolean;
  attendanceLockTime: string; // HH:mm — register locks after this time on the same day
  consecutiveAbsenceAlert: number;
  ackDeadlineDays: number;
  remoteActivationAllowed: boolean;
  holdResultCardForDues: boolean;
  phoneChangeFlagDays: number;
  officeHours: { start: string; end: string };
  studentAccountFromClass: number; // students below this class get no account
}

export interface School {
  id: ID;
  name: string;
  nameBn: string;
  eiin?: string;
  address: string;
  phone: string;
  shifts: Shift[];
  versions: ("bangla" | "english")[];
  academicYear: number;
  settings: SchoolSettings;
}

export interface ClassLevel {
  id: ID;
  schoolId: ID;
  name: string; // "1".."10"
  order: number;
}

export interface Section {
  id: ID;
  schoolId: ID;
  classId: ID;
  name: string; // "A" | "B"
  shiftId: ID;
  version: "bangla" | "english";
  classTeacherId: ID; // teacher userId → derived class_teacher scope
  academicYear: number;
  room: string;
}

export interface MarkComponent {
  key: string; // "written" | "mcq" | "practical" | "ct"
  label: string;
}

export interface Subject {
  id: ID;
  schoolId: ID;
  classId: ID;
  name: string;
  nameBn: string;
  code: string;
  isOptional: boolean;
}

export interface TeachingAssignment {
  teacherId: ID;
  sectionId: ID;
  subjectId: ID;
}

export interface GuardianLink {
  guardianUserId: ID;
  relation: "father" | "mother" | "guardian";
  isPrimary: boolean;
  canAcknowledge: boolean;
  verifiedAt?: ISODateTime;
  phoneChangedAt?: ISODateTime;
}

export interface Student {
  id: ID;
  schoolId: ID;
  userId?: ID;
  studentId: string; // school ID printed on the card, e.g. DMHS-26-0801
  roll: number;
  sectionId: ID;
  name: string;
  nameBn?: string;
  gender: "male" | "female";
  dob: ISODate;
  bloodGroup?: string;
  guardians: GuardianLink[];
  status: "active" | "transferred" | "left";
  admittedOn: ISODate;
  remarks: { id: ID; text: string; byUserId: ID; at: ISODateTime; shareable: boolean }[];
}

export type GateType = "IN" | "OUT";
export interface GateEvent {
  id: ID;
  schoolId: ID;
  studentId: ID;
  type: GateType;
  at: ISODateTime;
  byUserId: ID;
  late?: boolean;
  reason?: string;
  pickedUpBy?: string;
  syncedAt?: ISODateTime;
  correctedBy?: ID;
  correctionReason?: string;
}

export type AttendanceStatus = "P" | "A" | "L" | "LV"; // present, absent, late, approved leave

/**
 * Stored per section per day (not per student) to keep the browser database small.
 * Documented in DECISIONS.md.
 */
export interface AttendanceSheet {
  id: ID; // `${sectionId}:${date}`
  schoolId: ID;
  sectionId: ID;
  date: ISODate;
  entries: Record<ID, AttendanceStatus>;
  markedBy: ID;
  submittedAt: ISODateTime;
  edits: { studentId: ID; from: AttendanceStatus; to: AttendanceStatus; byUserId: ID; at: ISODateTime; reason: string }[];
}

export interface MismatchResolution {
  id: ID; // `${studentId}:${date}`
  studentId: ID;
  date: ISODate;
  kind: MismatchKind;
  resolvedBy: ID;
  note: string;
  at: ISODateTime;
}
export type MismatchKind = "gate_in_class_absent" | "class_present_no_gate";

export type ExamStatus = "DRAFT" | "SUBMITTED" | "LOCKED" | "PUBLISHED";

export interface ExamSubjectConfig {
  subjectId: ID;
  components: { key: string; label: string; fullMarks: number; mustPassSeparately: boolean }[];
}

export interface Exam {
  id: ID;
  schoolId: ID;
  name: string;
  nameBn: string;
  kind: "class_test" | "half_yearly" | "annual" | "pre_test" | "test";
  classIds: ID[];
  startDate: ISODate;
  endDate: ISODate;
  gradingScaleId: ID;
  /** subject configs keyed by classId */
  subjectsByClass: Record<ID, ExamSubjectConfig[]>;
}

export type MarkValue = number | "AB";

/** One subject's marks for a whole section — the unit a subject teacher submits. */
export interface MarkSheet {
  id: ID; // `${examId}:${sectionId}:${subjectId}`
  examId: ID;
  sectionId: ID;
  subjectId: ID;
  entries: Record<ID, Record<string, MarkValue>>; // studentId → component → value
  status: "DRAFT" | "SUBMITTED";
  enteredBy: ID;
  updatedAt: ISODateTime;
  submittedAt?: ISODateTime;
}

/** Workflow state for a section's result sheet in one exam. */
export interface SectionResultState {
  id: ID; // `${examId}:${sectionId}`
  examId: ID;
  sectionId: ID;
  state: "OPEN" | "LOCKED" | "PUBLISHED";
  lockedBy?: ID;
  lockedAt?: ISODateTime;
  publishedBy?: ID;
  publishedAt?: ISODateTime;
}

export interface SubjectResult {
  subjectId: ID;
  isOptional: boolean;
  obtained: number;
  fullMarks: number;
  percent: number;
  letter: string;
  gp: number;
  absent: boolean;
  componentFail: boolean;
  highest?: number;
}

export interface ResultVersion {
  id: ID;
  examId: ID;
  studentId: ID;
  sectionId: ID;
  version: number;
  subjectResults: SubjectResult[];
  totalObtained: number;
  totalFull: number;
  gpa: number;
  letter: string;
  passed: boolean;
  sectionPosition?: number;
  classPosition?: number;
  attendancePercent?: number;
  teacherRemark?: string;
  verificationCode: string;
  state: "PUBLISHED" | "SUPERSEDED";
  publishedAt: ISODateTime;
  publishedBy: ID;
  correctionReason?: string;
  paperReturned?: { at: ISODateTime; byUserId: ID };
}

export type AckChannel = "app" | "sms_code" | "in_person";

export type AnomalyCode =
  | "same_device_as_student"
  | "phone_recently_changed"
  | "multi_student_device"
  | "failed_attempts"
  | "remote_activation_first_ack";

export interface AnomalyFlag {
  code: AnomalyCode;
  severity: "low" | "medium" | "high";
  explanation: string;
  resolvedBy?: ID;
  resolvedNote?: string;
}

export interface Acknowledgment {
  id: ID;
  resultVersionId: ID;
  studentId: ID;
  guardianUserId: ID;
  channel: AckChannel;
  at: ISODateTime;
  pinVerified: boolean;
  otpVerified: boolean;
  deviceLabel: string;
  deviceId: string;
  userAgent: string;
  comment?: string;
  recordedByTeacherId?: ID;
  failedAttempts: number;
  anomalyFlags: AnomalyFlag[];
}

export type NotificationType =
  | "gate_in"
  | "gate_out"
  | "absent"
  | "late"
  | "left_early"
  | "mismatch"
  | "absence_streak"
  | "result_published"
  | "result_corrected"
  | "result_acknowledged"
  | "ack_reminder"
  | "notice"
  | "homework"
  | "leave_update"
  | "fee_due"
  | "payment"
  | "message"
  | "meeting"
  | "security";

/** Parents cannot switch these off (prompt §4.2). */
export const MANDATORY_NOTIFICATIONS: NotificationType[] = ["absent", "mismatch", "security", "result_published", "result_corrected"];

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  studentId?: ID;
  link?: string;
  channels: ("in_app" | "sms")[];
  createdAt: ISODateTime;
  readAt?: ISODateTime;
}

export interface SmsMessage {
  id: ID;
  to: string;
  userId?: ID;
  body: string;
  at: ISODateTime;
  kind: "notification" | "otp" | "sms_code";
}

export interface OtpRecord {
  id: ID;
  userId: ID;
  purpose: "ack" | "activation" | "pin_change" | "login";
  code: string; // mock only — a real backend stores a hash
  expiresAt: ISODateTime;
  attempts: number;
  consumed: boolean;
}

export interface OtpLock {
  key: string; // `${userId}:${purpose}`
  until: ISODateTime;
}

export interface SmsAckCode {
  id: ID;
  resultVersionId: ID;
  guardianUserId: ID;
  code: string;
  expiresAt: ISODateTime;
  used: boolean;
}

export interface AuditEvent {
  id: ID;
  schoolId: ID;
  actorId: ID;
  action: string;
  entity: string;
  entityId: ID;
  before?: unknown;
  after?: unknown;
  reason?: string;
  at: ISODateTime;
}

export interface Notice {
  id: ID;
  schoolId: ID;
  title: string;
  body: string;
  audience: { kind: "school" } | { kind: "class"; classId: ID } | { kind: "section"; sectionId: ID } | { kind: "role"; role: Role };
  pinned: boolean;
  urgent: boolean;
  expiresOn?: ISODate;
  attachmentName?: string;
  createdBy: ID;
  createdAt: ISODateTime;
  readBy: ID[];
}

export interface Homework {
  id: ID;
  sectionId: ID;
  subjectId?: ID; // undefined → section-wide diary note by class teacher
  title: string;
  details: string;
  dueDate: ISODate;
  assignedOn: ISODate;
  attachmentName?: string;
  createdBy: ID;
  doneBy: ID[]; // student ids
}

export interface TimetableSlot {
  id: ID; // `${sectionId}:${day}:${period}`
  sectionId: ID;
  day: Weekday;
  period: number;
  subjectId: ID;
  teacherId: ID;
}

export interface Holiday {
  id: ID;
  date: ISODate;
  title: string;
  kind: "government" | "school" | "exam" | "event";
}

export interface LeaveRequest {
  id: ID;
  studentId: ID;
  requestedBy: ID;
  from: ISODate;
  to: ISODate;
  reason: string;
  attachmentName?: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: ID;
  decidedAt?: ISODateTime;
  decisionNote?: string;
  createdAt: ISODateTime;
}

export interface FeeHead {
  id: ID;
  name: string;
  nameBn: string;
  frequency: "monthly" | "yearly" | "one_time" | "per_exam";
}

export interface FeeStructure {
  id: ID;
  classId: ID;
  feeHeadId: ID;
  amount: number;
}

export interface Invoice {
  id: ID;
  studentId: ID;
  title: string;
  items: { feeHeadId: ID; amount: number }[];
  discount: number;
  dueDate: ISODate;
  status: "unpaid" | "paid" | "partial";
  paid: number;
  createdAt: ISODateTime;
}

export interface Payment {
  id: ID;
  invoiceId: ID;
  studentId: ID;
  amount: number;
  method: "bkash" | "nagad" | "rocket" | "card" | "cash";
  trxId: string;
  paidBy: ID;
  at: ISODateTime;
}

export interface MessageThread {
  id: ID;
  studentId: ID;
  teacherId: ID;
  guardianUserId: ID;
  subject: string;
  complaint: boolean;
  lastAt: ISODateTime;
}

export interface Message {
  id: ID;
  threadId: ID;
  fromUserId: ID;
  body: string;
  at: ISODateTime;
  deliverAt: ISODateTime; // outside office hours → next morning
  readAt?: ISODateTime;
}

export interface MeetingSlot {
  id: ID;
  teacherId: ID;
  start: ISODateTime;
  minutes: number;
  bookedBy?: ID;
  studentId?: ID;
  note?: string;
}

export interface DeviceSession {
  id: ID;
  userId: ID;
  deviceId: string;
  deviceLabel: string;
  lastSeen: ISODateTime;
  revoked: boolean;
}

export interface PendingGateScan {
  id: ID;
  event: GateEvent;
}
