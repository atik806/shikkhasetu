/**
 * Deterministic demo data for "Dhaka Model High School".
 * Dates are generated relative to the day the database is seeded, so the demo always looks current.
 */
import type {
  Acknowledgment,
  AttendanceSheet,
  AttendanceStatus,
  AuditEvent,
  ClassLevel,
  Exam,
  ExamSubjectConfig,
  GateEvent,
  GradingScale,
  Holiday,
  Homework,
  Invoice,
  LeaveRequest,
  MarkSheet,
  MarkValue,
  MeetingSlot,
  Message,
  MessageThread,
  Notice,
  Notification,
  Payment,
  ResultVersion,
  School,
  Section,
  SectionResultState,
  Student,
  Subject,
  TeachingAssignment,
  TimetableSlot,
  User,
  Weekday,
} from "@/types";
import { BD_BOARD_BANDS, computeResult, rankPositions } from "@/features/results/lib/grading";
import { detectAnomalies } from "@/features/acknowledgments/lib/anomaly";
import { attendancePercent } from "@/features/attendance/lib/attendance";
import { mockHash } from "@/lib/codes";
import { addDaysISO, dhakaDateTime, recentSchoolDays, today, weekdayOf, isSchoolDay } from "@/lib/time";
import { DB_VERSION, type MockDB } from "./schema";

// ---------- deterministic PRNG ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(2026);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
// Seed-time codes are deterministic so a reseed is reproducible. Live codes use crypto (lib/codes.ts).
const B32 = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const seedCode = (n: number) => Array.from({ length: n }, () => pick(B32.split(""))).join("");
const seedVerification = () => {
  const c = seedCode(10);
  return `SS-${c.slice(0, 5)}-${c.slice(5)}`;
};

// ---------- name pools ----------
const BOY = ["Rahim", "Karim", "Tanvir", "Arif", "Sakib", "Nayeem", "Fahim", "Rafi", "Imran", "Shuvo", "Tamim", "Rakib", "Mahin", "Ayaan", "Zarif", "Siam", "Rifat", "Nabil", "Sabbir", "Ashik", "Fardin", "Tahmid", "Raihan", "Mehedi", "Adnan", "Sadman", "Ishraq", "Labib"];
const GIRL = ["Nusrat", "Fatema", "Ayesha", "Sumaiya", "Tasnim", "Mim", "Raisa", "Lamia", "Anika", "Jannat", "Sadia", "Tahsin", "Nafisa", "Maliha", "Samiha", "Orin", "Prova", "Tanha", "Ishrat", "Rumana", "Afrin", "Nowshin", "Mehjabin", "Zara", "Rafa", "Labiba"];
const SURNAME = ["Hossain", "Rahman", "Islam", "Ahmed", "Chowdhury", "Khan", "Uddin", "Sarker", "Talukder", "Mia", "Akter", "Haque", "Siddique", "Karim", "Bhuiyan", "Molla", "Sheikh", "Das", "Roy", "Barua"];
const FATHER = ["Md. Abdul", "Md. Rafiqul", "Md. Shahidul", "Md. Mizanur", "Md. Jahangir", "Md. Anwar", "Md. Kamrul", "Md. Nurul", "Md. Mostafa", "Md. Habibur", "Md. Saiful", "Md. Aminul", "Md. Delwar", "Md. Faruk", "Md. Golam", "Md. Shafiqul", "Md. Liton", "Md. Masud"];
const MOTHER = ["Rokeya", "Shirin", "Nasima", "Salma", "Rehana", "Shahnaz", "Jesmin", "Monowara", "Laila", "Parvin", "Hasina", "Sharmin", "Rubina", "Nazma", "Dilruba", "Kohinoor"];
const TEACHERS: { name: string; subject: string }[] = [
  { name: "Mahmudul Hasan", subject: "math" },
  { name: "Farhana Yasmin", subject: "english" },
  { name: "Abul Kalam Azad", subject: "bangla" },
  { name: "Shamima Nasrin", subject: "bangla" },
  { name: "Tariqul Islam", subject: "math" },
  { name: "Nazmul Huda", subject: "math" },
  { name: "Sultana Razia", subject: "english" },
  { name: "Kamal Uddin", subject: "english" },
  { name: "Dilara Begum", subject: "science" },
  { name: "Mosharraf Hossain", subject: "science" },
  { name: "Aminul Haque", subject: "physics" },
  { name: "Rina Das", subject: "chemistry" },
  { name: "Sohel Rana", subject: "biology" },
  { name: "Jasim Uddin", subject: "bgs" },
  { name: "Moushumi Akter", subject: "bgs" },
  { name: "Rezaul Karim", subject: "ict" },
  { name: "Sabina Yeasmin", subject: "ict" },
  { name: "Maulana Abdur Rauf", subject: "religion" },
  { name: "Hafiza Khatun", subject: "religion" },
  { name: "Bimal Chandra Roy", subject: "agriculture" },
  { name: "Selina Parvin", subject: "science" },
  { name: "Zahid Hasan", subject: "higher_math" },
  { name: "Nasreen Sultana", subject: "bangla" },
  { name: "Habibur Rahman", subject: "english" },
  { name: "Tahmina Ferdous", subject: "math" },
];

const SUBJECTS_PRIMARY = [
  ["bangla", "Bangla", "বাংলা"],
  ["english", "English", "ইংরেজি"],
  ["math", "Mathematics", "গণিত"],
  ["science", "Elementary Science", "প্রাথমিক বিজ্ঞান"],
  ["bgs", "Bangladesh & Global Studies", "বাংলাদেশ ও বিশ্বপরিচয়"],
  ["religion", "Religion & Moral Education", "ধর্ম ও নৈতিক শিক্ষা"],
] as const;
const SUBJECTS_JUNIOR = [
  ["bangla", "Bangla", "বাংলা"],
  ["english", "English", "ইংরেজি"],
  ["math", "Mathematics", "গণিত"],
  ["science", "Science", "বিজ্ঞান"],
  ["bgs", "Bangladesh & Global Studies", "বাংলাদেশ ও বিশ্বপরিচয়"],
  ["ict", "ICT", "তথ্য ও যোগাযোগ প্রযুক্তি"],
  ["religion", "Religion & Moral Education", "ধর্ম ও নৈতিক শিক্ষা"],
  ["agriculture", "Agriculture Studies", "কৃষিশিক্ষা"],
] as const;
const SUBJECTS_SECONDARY = [
  ["bangla", "Bangla", "বাংলা"],
  ["english", "English", "ইংরেজি"],
  ["math", "General Mathematics", "সাধারণ গণিত"],
  ["physics", "Physics", "পদার্থবিজ্ঞান"],
  ["chemistry", "Chemistry", "রসায়ন"],
  ["biology", "Biology", "জীববিজ্ঞান"],
  ["bgs", "Bangladesh & Global Studies", "বাংলাদেশ ও বিশ্বপরিচয়"],
  ["ict", "ICT", "তথ্য ও যোগাযোগ প্রযুক্তি"],
  ["religion", "Religion & Moral Education", "ধর্ম ও নৈতিক শিক্ষা"],
  ["higher_math", "Higher Mathematics", "উচ্চতর গণিত"],
] as const;
const OPTIONAL_KEYS = ["agriculture", "higher_math"];

export const DEMO_PASSWORD = "demo1234";
export const DEMO_PIN = "2580";

export const DEMO_ACCOUNTS = {
  admin: "u_admin",
  superAdmin: "u_super",
  classTeacher: "u_t_mahmud",
  teacherParent: "u_t_farhana",
  parentTwoKids: "u_g_karim",
  parentMother: "u_g_rokeya",
  student: "u_s_rahim",
  gate: "u_gate",
} as const;

const SCHOOL_ID = "sch_dmhs";
/** Student record id of the demo student (his login user id is DEMO_ACCOUNTS.student). */
export const RAHIM = "stu_8A_01";
const WEEKLY: Weekday[] = ["Fri"];

let phoneCounter = 0;
function phone(): string {
  phoneCounter++;
  const op = pick(["3", "4", "5", "6", "7", "8", "9"]);
  return `+8801${op}${pad(between(10, 99))}${pad(phoneCounter % 10000, 4)}${between(10, 99)}`.slice(0, 14);
}

export function buildSeed(): MockDB {
  rand = mulberry32(2026);
  phoneCounter = 0;
  const base = today();
  const year = Number(base.slice(0, 4));
  const at = (date: string, hm: string) => dhakaDateTime(date, hm);
  const pw = mockHash(DEMO_PASSWORD);
  const pin = mockHash(DEMO_PIN);

  // ---------- holidays (approximate dates for the demo; admin edits them) ----------
  const holidays: Holiday[] = [
    [`${year}-02-21`, "International Mother Language Day", "government"],
    [`${year}-03-17`, "Birthday of the Father of the Nation", "government"],
    [`${year}-03-26`, "Independence Day", "government"],
    [`${year}-04-14`, "Pohela Boishakh", "government"],
    [`${year}-05-01`, "May Day", "government"],
    [`${year}-08-05`, "July Mass Uprising Day", "government"],
    [`${year}-12-16`, "Victory Day", "government"],
    [`${year}-12-25`, "Christmas Day", "government"],
    [`${year}-11-27`, "Annual sports day", "event"],
  ].map(([date, title, kind], i) => ({ id: `hol_${i}`, date, title, kind: kind as Holiday["kind"] }));
  const holidaySet = new Set(holidays.filter((h) => h.kind === "government").map((h) => h.date));

  // ---------- school ----------
  const school: School = {
    id: SCHOOL_ID,
    name: "Dhaka Model High School",
    nameBn: "ঢাকা মডেল হাই স্কুল",
    eiin: "108214",
    address: "House 12, Road 5, Dhanmondi, Dhaka 1205",
    phone: "+8801711000000",
    shifts: [
      { id: "sh_morning", name: "Morning", startTime: "07:30", endTime: "12:00", graceMinutes: 10 },
      { id: "sh_day", name: "Day", startTime: "12:30", endTime: "17:00", graceMinutes: 10 },
    ],
    versions: ["bangla", "english"],
    academicYear: year,
    settings: {
      weeklyHolidays: WEEKLY,
      gateModuleEnabled: true,
      periodAttendanceEnabled: false,
      attendanceLockTime: "10:30",
      consecutiveAbsenceAlert: 3,
      ackDeadlineDays: 7,
      remoteActivationAllowed: false,
      holdResultCardForDues: false,
      phoneChangeFlagDays: 7,
      officeHours: { start: "08:00", end: "17:00" },
      studentAccountFromClass: 3,
    },
  };

  const users: User[] = [];
  const addUser = (u: Omit<User, "schoolId" | "status" | "passwordHash"> & Partial<User>) => {
    const user: User = { schoolId: SCHOOL_ID, status: "active", passwordHash: pw, ...u };
    users.push(user);
    return user;
  };

  addUser({ id: DEMO_ACCOUNTS.admin, name: "Dr. Nasrin Akter", nameBn: "ড. নাসরিন আক্তার", phone: "+8801711000001", email: "principal@dmhs.edu.bd", roles: ["school_admin"] });
  addUser({ id: DEMO_ACCOUNTS.superAdmin, name: "Platform Owner", phone: "+8801711000002", roles: ["super_admin"] });
  addUser({ id: DEMO_ACCOUNTS.gate, name: "Abdul Jalil", nameBn: "আব্দুল জলিল", phone: "+8801711000005", roles: ["gate_staff"] });

  const teacherIds: Record<string, string[]> = {};
  TEACHERS.forEach((t, i) => {
    const id = i === 0 ? DEMO_ACCOUNTS.classTeacher : i === 1 ? DEMO_ACCOUNTS.teacherParent : `u_t_${i}`;
    addUser({ id, name: t.name, phone: i === 0 ? "+8801711000010" : i === 1 ? "+8801711000011" : phone(), roles: i === 1 ? ["teacher", "parent"] : ["teacher"], email: `${t.name.split(" ")[0].toLowerCase()}${i}@dmhs.edu.bd` });
    (teacherIds[t.subject] ??= []).push(id);
  });
  // subjects without a dedicated pool borrow one
  teacherIds.higher_math = [...(teacherIds.higher_math ?? []), ...teacherIds.math.slice(1, 2)];

  // ---------- classes, sections, subjects ----------
  const classes: ClassLevel[] = [];
  const sections: Section[] = [];
  const subjects: Subject[] = [];
  const allTeacherIds = users.filter((u) => u.roles.includes("teacher")).map((u) => u.id);
  let ctCursor = 2;
  for (let c = 1; c <= 10; c++) {
    const classId = `cls_${c}`;
    classes.push({ id: classId, schoolId: SCHOOL_ID, name: String(c), order: c });
    const pool = c <= 5 ? SUBJECTS_PRIMARY : c <= 8 ? SUBJECTS_JUNIOR : SUBJECTS_SECONDARY;
    pool.forEach(([key, name, nameBn], i) =>
      subjects.push({ id: `sub_${c}_${key}`, schoolId: SCHOOL_ID, classId, name, nameBn, code: `${c}${pad(i + 1)}`, isOptional: OPTIONAL_KEYS.includes(key) }),
    );
    for (const s of ["A", "B"]) {
      let classTeacherId: string;
      if (c === 8 && s === "A") classTeacherId = DEMO_ACCOUNTS.classTeacher;
      else {
        do {
          classTeacherId = allTeacherIds[ctCursor % allTeacherIds.length];
          ctCursor++;
        } while (classTeacherId === DEMO_ACCOUNTS.classTeacher || classTeacherId === DEMO_ACCOUNTS.teacherParent);
      }
      sections.push({
        id: `sec_${c}${s}`,
        schoolId: SCHOOL_ID,
        classId,
        name: s,
        shiftId: s === "A" ? "sh_morning" : "sh_day",
        version: c >= 6 && s === "B" ? "english" : "bangla",
        classTeacherId,
        academicYear: year,
        room: `${c < 6 ? "1" : "2"}${pad(c)}${s}`,
      });
    }
  }

  // ---------- teaching assignments ----------
  const assignments: TeachingAssignment[] = [];
  sections.forEach((sec, si) => {
    const c = Number(sec.classId.split("_")[1]);
    subjects
      .filter((s) => s.classId === sec.classId)
      .forEach((sub) => {
        const key = sub.id.split("_").slice(2).join("_");
        const poolKey = key === "science" && c >= 9 ? "physics" : key;
        const pool = teacherIds[poolKey] ?? teacherIds.science;
        let teacherId = pool[(si + c) % pool.length];
        // fixed demo assignments
        if (key === "math" && [8, 9].includes(c)) teacherId = DEMO_ACCOUNTS.classTeacher;
        if (key === "english" && [5, 6].includes(c)) teacherId = DEMO_ACCOUNTS.teacherParent;
        if (key === "math" && ![8, 9].includes(c) && teacherId === DEMO_ACCOUNTS.classTeacher) teacherId = teacherIds.math[1];
        if (key === "english" && ![5, 6].includes(c) && teacherId === DEMO_ACCOUNTS.teacherParent) teacherId = teacherIds.english[1];
        assignments.push({ teacherId, sectionId: sec.id, subjectId: sub.id });
      });
  });

  // ---------- students & guardians ----------
  const students: Student[] = [];
  const PER_SECTION = 18;
  const surnameOf = (n: string) => n.split(" ").slice(-1)[0];
  const familyOf = new Map<string, string>(); // studentId → family key
  // Karim family: Rahim (8-A) and Nusrat (5-B)
  const karim = addUser({ id: DEMO_ACCOUNTS.parentTwoKids, name: "Md. Abdul Karim", nameBn: "মো. আব্দুল করিম", phone: "+8801711000100", roles: ["parent"], pinHash: pin, hasSmartphone: true, activation: { method: "in_person", at: at(`${year}-01-08`, "10:15") } });
  const rokeya = addUser({ id: DEMO_ACCOUNTS.parentMother, name: "Rokeya Begum", nameBn: "রোকেয়া বেগম", phone: "+8801711000101", roles: ["parent"], pinHash: pin, hasSmartphone: true, activation: { method: "in_person", at: at(`${year}-01-08`, "10:20") } });
  const farhanaHusband = addUser({ id: "u_g_farhana_h", name: "Md. Saiful Islam", phone: phone(), roles: ["parent"], pinHash: pin, hasSmartphone: true, activation: { method: "in_person", at: at(`${year}-01-10`, "09:00") } });

  for (const sec of sections) {
    const c = Number(sec.classId.split("_")[1]);
    for (let r = 1; r <= PER_SECTION; r++) {
      const sid = `stu_${c}${sec.name}_${pad(r)}`;
      const studentCode = `DMHS-${String(year).slice(2)}-${pad(c)}${sec.name === "A" ? "1" : "2"}${pad(r)}`;
      let name: string;
      let gender: "male" | "female";
      let guardians: Student["guardians"];
      let userId: string | undefined;
      let surname = pick(SURNAME);

      const isRahim = c === 8 && sec.name === "A" && r === 1;
      const isNusrat = c === 5 && sec.name === "B" && r === 4;
      const isFarhanaChild = c === 3 && sec.name === "B" && r === 2;

      if (isRahim || isNusrat) {
        name = isRahim ? "Rahim Karim" : "Nusrat Karim";
        gender = isRahim ? "male" : "female";
        guardians = [
          { guardianUserId: karim.id, relation: "father", isPrimary: true, canAcknowledge: true, verifiedAt: karim.activation!.at },
          { guardianUserId: rokeya.id, relation: "mother", isPrimary: false, canAcknowledge: true, verifiedAt: rokeya.activation!.at },
        ];
        familyOf.set(sid, "karim");
      } else if (isFarhanaChild) {
        name = "Ayaan Islam";
        gender = "male";
        guardians = [
          { guardianUserId: DEMO_ACCOUNTS.teacherParent, relation: "mother", isPrimary: true, canAcknowledge: true, verifiedAt: at(`${year}-01-10`, "09:00") },
          { guardianUserId: farhanaHusband.id, relation: "father", isPrimary: false, canAcknowledge: true, verifiedAt: at(`${year}-01-10`, "09:00") },
        ];
        users.find((u) => u.id === DEMO_ACCOUNTS.teacherParent)!.pinHash = pin;
        users.find((u) => u.id === DEMO_ACCOUNTS.teacherParent)!.hasSmartphone = true;
        users.find((u) => u.id === DEMO_ACCOUNTS.teacherParent)!.activation = { method: "in_person", at: at(`${year}-01-10`, "09:00") };
        familyOf.set(sid, "farhana");
      } else {
        gender = chance(0.5) ? "male" : "female";
        name = `${pick(gender === "male" ? BOY : GIRL)} ${surname}`;
        const fatherFirst = pick(FATHER);
        const father = addUser({
          id: `u_g_${c}${sec.name}${pad(r)}_f`,
          name: `${fatherFirst} ${surnameOf(name) === "Akter" ? pick(SURNAME) : surnameOf(name)}`,
          phone: phone(),
          roles: ["parent"],
          pinHash: pin,
          hasSmartphone: !chance(0.12),
          activation: chance(0.9) ? { method: "in_person", at: at(`${year}-01-${pad(between(5, 25))}`, "10:00") } : undefined,
          status: "active",
        });
        const mother = addUser({
          id: `u_g_${c}${sec.name}${pad(r)}_m`,
          name: `${pick(MOTHER)} ${pick(["Begum", "Akter", "Khatun", "Sultana"])}`,
          phone: phone(),
          roles: ["parent"],
          pinHash: pin,
          hasSmartphone: !chance(0.25),
          activation: chance(0.7) ? { method: "in_person", at: at(`${year}-01-${pad(between(5, 25))}`, "11:00") } : undefined,
        });
        if (!father.activation) father.status = "invited";
        if (!mother.activation) mother.status = "invited";
        guardians = [
          { guardianUserId: father.id, relation: "father", isPrimary: true, canAcknowledge: true, verifiedAt: father.activation?.at },
          { guardianUserId: mother.id, relation: "mother", isPrimary: false, canAcknowledge: true, verifiedAt: mother.activation?.at },
        ];
        surname = surnameOf(name);
        familyOf.set(sid, sid);
      }

      if (c >= school.settings.studentAccountFromClass) {
        userId = isRahim ? DEMO_ACCOUNTS.student : `u_s_${c}${sec.name}${pad(r)}`;
        addUser({ id: userId, name, loginId: studentCode, roles: ["student"] });
      }
      students.push({
        id: sid,
        schoolId: SCHOOL_ID,
        userId,
        studentId: studentCode,
        roll: r,
        sectionId: sec.id,
        name,
        gender,
        dob: `${year - 6 - c}-${pad(between(1, 12))}-${pad(between(1, 28))}`,
        bloodGroup: pick(["A+", "B+", "O+", "AB+", "A-", "O-", "B-"]),
        guardians,
        status: "active",
        admittedOn: `${year - between(0, c - 1)}-01-${pad(between(2, 15))}`,
        remarks: [],
      });
    }
  }
  const studentById = new Map(students.map((s) => [s.id, s]));
  const sectionStudents = (sectionId: string) => students.filter((s) => s.sectionId === sectionId);

  // feature-phone guardian in 8-A (roll 12): father has no smartphone, mother not activated
  const fp = students.find((s) => s.id === "stu_8A_12")!;
  const fpFather = users.find((u) => u.id === fp.guardians[0].guardianUserId)!;
  fpFather.hasSmartphone = false;
  fpFather.name = "Md. Golam Mostafa";
  const fpMother = users.find((u) => u.id === fp.guardians[1].guardianUserId)!;
  fpMother.status = "invited";
  fpMother.activation = undefined;
  fpMother.hasSmartphone = false;

  // ---------- attendance + gate (last 30 school days + today) ----------
  const isTodaySchoolDay = isSchoolDay(base, WEEKLY, holidaySet);
  const pastDays = recentSchoolDays(addDaysISO(base, -1), 30, WEEKLY, holidaySet); // newest first
  const attendance: AttendanceSheet[] = [];
  const gateEvents: GateEvent[] = [];
  const habitualAbsentees = new Set(["stu_8A_07", "stu_6B_03", "stu_9A_11"]);
  const streakStudent = "stu_8A_07"; // absent the last 3 school days
  const bunker = "stu_8A_09"; // gate IN but absent in class (yesterday) — unresolved mismatch
  let gateId = 0;

  const genDay = (date: string, sec: Section, dayIndex: number, submitted: boolean, withGate: boolean) => {
    const shift = school.shifts.find((s) => s.id === sec.shiftId)!;
    const entries: Record<string, AttendanceStatus> = {};
    for (const st of sectionStudents(sec.id)) {
      let status: AttendanceStatus = "P";
      const roll = rand();
      if (habitualAbsentees.has(st.id) && roll < 0.25) status = "A";
      else if (roll < 0.05) status = "A";
      else if (roll < 0.1) status = "L";
      if (st.id === streakStudent && dayIndex <= 2) status = "A";
      if (st.id === streakStudent && dayIndex === 3) status = "P";
      if (st.id === RAHIM && dayIndex < 5) status = "P";
      if (st.id === bunker && dayIndex === 0) status = "A";
      entries[st.id] = status;

      if (withGate && (status !== "A" || (st.id === bunker && dayIndex === 0))) {
        const [h, m] = shift.startTime.split(":").map(Number);
        const startMin = h * 60 + m;
        const arrive = status === "L" ? startMin + between(12, 45) : startMin - between(2, 35);
        const hm = `${pad(Math.floor(arrive / 60))}:${pad(arrive % 60)}`;
        gateEvents.push({ id: `g_${gateId++}`, schoolId: SCHOOL_ID, studentId: st.id, type: "IN", at: at(date, hm), byUserId: DEMO_ACCOUNTS.gate, late: status === "L", syncedAt: at(date, hm) });
        if (date !== base) {
          gateEvents.push({ id: `g_${gateId++}`, schoolId: SCHOOL_ID, studentId: st.id, type: "OUT", at: at(date, shift.endTime), byUserId: DEMO_ACCOUNTS.gate, syncedAt: at(date, shift.endTime) });
        }
      }
    }
    if (submitted) {
      attendance.push({ id: `${sec.id}:${date}`, schoolId: SCHOOL_ID, sectionId: sec.id, date, entries, markedBy: sec.classTeacherId, submittedAt: at(date, sec.shiftId === "sh_morning" ? "08:05" : "13:05"), edits: [] });
    }
    return entries;
  };

  // pastDays[0] is the previous school day → dayIndex 0; the streak student is absent on 0..2
  pastDays.forEach((date, i) => {
    for (const sec of sections) genDay(date, sec, i, true, i < 6);
  });
  if (isTodaySchoolDay) {
    for (const sec of sections) {
      if (sec.shiftId !== "sh_morning") continue; // day shift hasn't started in the seeded story
      const submitted = sec.id !== "sec_8A"; // 8-A register left for the demo class teacher
      const entries = genDay(base, sec, -1, submitted, true);
      if (sec.id === "sec_8B" && submitted) {
        // seed one fresh "gate IN, absent in class" mismatch today
        const s = sectionStudents("sec_8B")[5];
        entries[s.id] = "A";
        const sheet = attendance.find((a) => a.id === `${sec.id}:${base}`)!;
        sheet.entries[s.id] = "A";
        if (!gateEvents.some((g) => g.studentId === s.id && g.at.startsWith(base.slice(0, 4)) && g.type === "IN" && g.at >= at(base, "00:00"))) {
          gateEvents.push({ id: `g_${gateId++}`, schoolId: SCHOOL_ID, studentId: s.id, type: "IN", at: at(base, "07:21"), byUserId: DEMO_ACCOUNTS.gate, syncedAt: at(base, "07:21") });
        }
      }
    }
  }

  // ---------- grading ----------
  const scale: GradingScale = { id: "gs_board", name: "Bangladesh board scale (default)", passPercent: 33, bands: BD_BOARD_BANDS };

  // ---------- exams ----------
  const subjectsOf = (classId: string) => subjects.filter((s) => s.classId === classId);
  const examConfig = (kind: Exam["kind"]): Record<string, ExamSubjectConfig[]> => {
    const out: Record<string, ExamSubjectConfig[]> = {};
    for (const cl of classes) {
      out[cl.id] = subjectsOf(cl.id).map((s) => ({
        subjectId: s.id,
        components:
          kind === "class_test"
            ? [{ key: "ct", label: "Class test", fullMarks: 20, mustPassSeparately: false }]
            : cl.order >= 6
              ? [
                  { key: "written", label: "Written", fullMarks: 70, mustPassSeparately: true },
                  { key: "mcq", label: "MCQ", fullMarks: 30, mustPassSeparately: true },
                ]
              : [{ key: "written", label: "Written", fullMarks: 100, mustPassSeparately: false }],
      }));
    }
    return out;
  };
  const allClassIds = classes.map((c) => c.id);
  const exams: Exam[] = [
    { id: "ex_half", schoolId: SCHOOL_ID, name: `Half-Yearly Examination ${year}`, nameBn: `অর্ধবার্ষিক পরীক্ষা ${year}`, kind: "half_yearly", classIds: allClassIds, startDate: addDaysISO(base, -150), endDate: addDaysISO(base, -140), gradingScaleId: scale.id, subjectsByClass: examConfig("half_yearly") },
    { id: "ex_ct3", schoolId: SCHOOL_ID, name: "Class Test 3", nameBn: "শ্রেণি পরীক্ষা ৩", kind: "class_test", classIds: allClassIds, startDate: addDaysISO(base, -14), endDate: addDaysISO(base, -10), gradingScaleId: scale.id, subjectsByClass: examConfig("class_test") },
    { id: "ex_annual", schoolId: SCHOOL_ID, name: `Annual Examination ${year}`, nameBn: `বার্ষিক পরীক্ষা ${year}`, kind: "annual", classIds: allClassIds, startDate: addDaysISO(base, -9), endDate: addDaysISO(base, -2), gradingScaleId: scale.id, subjectsByClass: examConfig("annual") },
  ];

  const ability = new Map(students.map((s) => [s.id, 0.35 + rand() * 0.6]));
  ability.set(RAHIM, 0.52);
  ability.set("stu_8A_07", 0.28);
  const markFor = (studentId: string, full: number): MarkValue => {
    if (chance(0.01)) return "AB";
    const a = ability.get(studentId)!;
    const v = Math.max(0, Math.min(full, Math.round((a + (rand() - 0.5) * 0.3) * full)));
    return v;
  };

  const markSheets: MarkSheet[] = [];
  const sectionResults: SectionResultState[] = [];
  const results: ResultVersion[] = [];
  const publishedAt: Record<string, string> = { ex_half: at(addDaysISO(base, -128), "16:00"), ex_ct3: at(addDaysISO(base, -3), "15:30") };

  for (const exam of exams) {
    for (const sec of sections) {
      const cfg = exam.subjectsByClass[sec.classId];
      const studs = sectionStudents(sec.id);
      const annualState: SectionResultState["state"] =
        exam.id !== "ex_annual" ? "PUBLISHED" : ["sec_8B", "sec_9A", "sec_10A"].includes(sec.id) ? "LOCKED" : "OPEN";
      for (const sc of cfg) {
        const teacherId = assignments.find((a) => a.sectionId === sec.id && a.subjectId === sc.subjectId)!.teacherId;
        const entries: MarkSheet["entries"] = {};
        let status: MarkSheet["status"] = "SUBMITTED";
        const isDemoMath = exam.id === "ex_annual" && sec.id === "sec_8A" && sc.subjectId === "sub_8_math";
        if (exam.id === "ex_annual" && annualState === "OPEN" && !isDemoMath && chance(0.35)) status = "DRAFT";
        if (isDemoMath) status = "DRAFT";
        studs.forEach((st, idx) => {
          if (isDemoMath && idx >= 10) return; // half-entered sheet for the demo teacher
          entries[st.id] = Object.fromEntries(sc.components.map((c) => [c.key, markFor(st.id, c.fullMarks)]));
        });
        markSheets.push({ id: `${exam.id}:${sec.id}:${sc.subjectId}`, examId: exam.id, sectionId: sec.id, subjectId: sc.subjectId, entries, status, enteredBy: teacherId, updatedAt: at(addDaysISO(base, -1), "20:00"), submittedAt: status === "SUBMITTED" ? at(addDaysISO(base, -1), "20:00") : undefined });
      }
      sectionResults.push({
        id: `${exam.id}:${sec.id}`,
        examId: exam.id,
        sectionId: sec.id,
        state: annualState,
        lockedBy: annualState !== "OPEN" ? sec.classTeacherId : undefined,
        lockedAt: annualState !== "OPEN" ? at(addDaysISO(base, exam.id === "ex_annual" ? -1 : -5), "12:00") : undefined,
        publishedBy: annualState === "PUBLISHED" ? DEMO_ACCOUNTS.admin : undefined,
        publishedAt: annualState === "PUBLISHED" ? publishedAt[exam.id] : undefined,
      });
    }
  }

  // compute published results
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  for (const exam of exams.filter((e) => e.id !== "ex_annual")) {
    for (const cl of classes) {
      const cfg = exam.subjectsByClass[cl.id];
      const classSecs = sections.filter((s) => s.classId === cl.id);
      const rows: (ResultVersion & { passed: boolean })[] = [];
      for (const sec of classSecs) {
        for (const st of sectionStudents(sec.id)) {
          const computed = computeResult(
            cfg.map((sc) => {
              const sheet = markSheets.find((m) => m.id === `${exam.id}:${sec.id}:${sc.subjectId}`)!;
              return {
                subjectId: sc.subjectId,
                isOptional: subjectMap.get(sc.subjectId)!.isOptional,
                components: sc.components.map((c) => ({ key: c.key, fullMarks: c.fullMarks, mustPassSeparately: c.mustPassSeparately, value: sheet.entries[st.id]?.[c.key] })),
              };
            }),
            scale,
          );
          rows.push({
            id: `rv_${exam.id}_${st.id}_1`,
            examId: exam.id,
            studentId: st.id,
            sectionId: sec.id,
            version: 1,
            ...computed,
            verificationCode: seedVerification(),
            state: "PUBLISHED",
            publishedAt: publishedAt[exam.id],
            publishedBy: DEMO_ACCOUNTS.admin,
            teacherRemark: computed.passed ? (computed.gpa >= 4.5 ? "Excellent work. Keep it up." : computed.gpa >= 3.5 ? "Good progress. Practice regularly." : "Needs more practice at home.") : "Needs special attention. Please meet the class teacher.",
          });
        }
      }
      const classPos = rankPositions(rows);
      for (const sec of classSecs) {
        const secRows = rows.filter((r) => r.sectionId === sec.id);
        const secPos = rankPositions(secRows);
        const highest = new Map<string, number>();
        secRows.forEach((r) => r.subjectResults.forEach((s) => highest.set(s.subjectId, Math.max(highest.get(s.subjectId) ?? 0, s.obtained))));
        secRows.forEach((r) => {
          r.sectionPosition = secPos.get(r.id);
          r.classPosition = classPos.get(r.id);
          r.subjectResults = r.subjectResults.map((s) => ({ ...s, highest: highest.get(s.subjectId) }));
          const statuses = attendance.filter((a) => a.sectionId === sec.id).map((a) => a.entries[r.studentId]).filter(Boolean);
          r.attendancePercent = attendancePercent(statuses);
        });
      }
      results.push(...rows);
    }
  }

  // ---------- acknowledgments ----------
  const acks: Acknowledgment[] = [];
  const devices: MockDB["devices"] = [];
  const studentDevice = (s: Student) => `dev_${s.id}`;
  for (const s of students) {
    if (s.userId) devices.push({ id: `ds_${s.id}`, userId: s.userId, deviceId: studentDevice(s), deviceLabel: "Android phone · Chrome", lastSeen: at(addDaysISO(base, -1), "19:00"), revoked: false });
  }
  devices.push({ id: "ds_karim", userId: karim.id, deviceId: "dev_karim_phone", deviceLabel: "Android phone · Chrome", lastSeen: at(addDaysISO(base, -1), "21:10"), revoked: false });
  devices.push({ id: "ds_rokeya", userId: rokeya.id, deviceId: "dev_rokeya_phone", deviceLabel: "iPhone · Safari", lastSeen: at(addDaysISO(base, -2), "22:30"), revoked: false });

  const audit: AuditEvent[] = [];
  const addAudit = (e: Omit<AuditEvent, "id" | "schoolId">) => audit.push({ id: `au_${audit.length}`, schoolId: SCHOOL_ID, ...e });

  // phone change scenario (8-A roll 4): changed 3 days ago
  const pc = students.find((s) => s.id === "stu_8A_04")!;
  const pcFather = users.find((u) => u.id === pc.guardians[0].guardianUserId)!;
  const oldPhone = pcFather.phone;
  pcFather.phone = "+8801897654321";
  pc.guardians[0].phoneChangedAt = at(addDaysISO(base, -3), "11:00");
  addAudit({ actorId: DEMO_ACCOUNTS.admin, action: "guardian.phone_change", entity: "user", entityId: pcFather.id, before: { phone: oldPhone }, after: { phone: pcFather.phone }, reason: "Guardian visited office with NID; old SIM lost", at: pc.guardians[0].phoneChangedAt });

  // remote activation scenario (8-A roll 6)
  const ra = users.find((u) => u.id === students.find((s) => s.id === "stu_8A_06")!.guardians[0].guardianUserId)!;
  ra.activation = { method: "remote", at: at(addDaysISO(base, -5), "21:40") };
  ra.status = "active";

  const sharedDevice = "dev_shared_7f3a";
  const ackFor = (rv: ResultVersion, opts: { guardianIndex?: number; channel?: Acknowledgment["channel"]; deviceId?: string; failed?: number; hoursAfter?: number; comment?: string }) => {
    const st = studentById.get(rv.studentId)!;
    const g = st.guardians[opts.guardianIndex ?? 0];
    const guardian = users.find((u) => u.id === g.guardianUserId)!;
    const channel = opts.channel ?? "app";
    const deviceId = opts.deviceId ?? `dev_${guardian.id}`;
    const ackAt = new Date(new Date(rv.publishedAt).getTime() + (opts.hoursAfter ?? between(2, 70)) * 3_600_000).toISOString();
    const siblingIds = students.filter((o) => o.id !== st.id && o.guardians.some((og) => st.guardians.some((sg) => sg.guardianUserId === og.guardianUserId))).map((o) => o.id);
    const flags =
      channel === "app"
        ? detectAnomalies({
            studentDeviceIds: st.userId ? devices.filter((d) => d.userId === st.userId).map((d) => d.deviceId) : [],
            phoneChangedAt: g.phoneChangedAt,
            phoneChangeFlagDays: school.settings.phoneChangeFlagDays,
            sameDeviceAcks: acks.filter((a) => a.deviceId === deviceId).map((a) => ({ studentId: a.studentId })),
            siblingIds,
            studentId: st.id,
            failedAttempts: opts.failed ?? 0,
            remoteActivationFirstAck: guardian.activation?.method === "remote" && !acks.some((a) => a.guardianUserId === guardian.id),
            deviceId,
            at: ackAt,
          })
        : [];
    acks.push({
      id: `ack_${acks.length}`,
      resultVersionId: rv.id,
      studentId: st.id,
      guardianUserId: guardian.id,
      channel,
      at: ackAt,
      pinVerified: channel === "app",
      otpVerified: channel !== "in_person",
      deviceLabel: channel === "app" ? (deviceId === sharedDevice ? "Android phone · Chrome (shared)" : "Android phone · Chrome") : channel === "sms_code" ? "Phone call by class teacher" : "School office",
      deviceId: channel === "app" ? deviceId : "school",
      userAgent: channel === "app" ? "Mozilla/5.0 (Linux; Android 13) Chrome/129 Mobile" : "—",
      comment: opts.comment,
      recordedByTeacherId: channel === "app" ? undefined : st.sectionId === "sec_8A" ? DEMO_ACCOUNTS.classTeacher : sections.find((x) => x.id === st.sectionId)!.classTeacherId,
      failedAttempts: opts.failed ?? 0,
      anomalyFlags: flags,
    });
  };

  for (const rv of results) {
    const st = studentById.get(rv.studentId)!;
    if (rv.examId === "ex_half") {
      if (["stu_8A_10", "stu_8A_14"].includes(st.id)) {
        rv.paperReturned = { at: at(addDaysISO(base, -122), "09:00"), byUserId: DEMO_ACCOUNTS.classTeacher };
        continue; // paper signed, no digital acknowledgment → mismatch for the teacher
      }
      if (st.id === "stu_8A_12") {
        ackFor(rv, { channel: "sms_code" });
        continue;
      }
      if (chance(0.86)) ackFor(rv, { guardianIndex: chance(0.7) ? 0 : 1, channel: chance(0.08) ? "in_person" : "app" });
      continue;
    }
    // Class Test 3 — published 3 days ago, deadline not yet passed
    if (st.sectionId === "sec_8A") {
      switch (st.id) {
        case RAHIM:
          break; // Rahim: pending — golden path for the parent demo
        case "stu_8A_02":
          ackFor(rv, { deviceId: studentDevice(st), hoursAfter: 5 }); // same device as student (low)
          break;
        case "stu_8A_03":
          ackFor(rv, { comment: "Thank you. We will help him with Mathematics.", hoursAfter: 3 });
          break;
        case "stu_8A_04":
          ackFor(rv, { hoursAfter: 26 }); // phone changed 3 days ago (high)
          break;
        case "stu_8A_05":
          ackFor(rv, { failed: 2, hoursAfter: 30 }); // failed attempts (medium)
          break;
        case "stu_8A_06":
          ackFor(rv, { hoursAfter: 40 }); // remote activation first ack (medium)
          break;
        case "stu_8A_11":
        case "stu_8A_13":
        case "stu_8A_15":
          ackFor(rv, { deviceId: sharedDevice, hoursAfter: 50 + Number(st.id.slice(-2)) / 10 }); // one device, non-siblings (high)
          break;
        case "stu_8A_16":
          ackFor(rv, { channel: "in_person", hoursAfter: 44 });
          break;
        case "stu_8A_08":
          ackFor(rv, { guardianIndex: 1, hoursAfter: 8 });
          break;
        default:
          break;
      }
      continue;
    }
    if (st.id === "stu_5B_04") {
      ackFor(rv, { guardianIndex: 1, deviceId: "dev_rokeya_phone", hoursAfter: 4 }); // Nusrat — acknowledged by mother
      continue;
    }
    if (chance(0.45)) ackFor(rv, { guardianIndex: chance(0.7) ? 0 : 1 });
  }

  // ---------- notices ----------
  const notices: Notice[] = [
    { id: "nt_1", schoolId: SCHOOL_ID, title: "Annual Sports Day on " + addDaysISO(base, 11), body: "All students must attend in sports uniform. Parents are welcome from 9:00 AM.", audience: { kind: "school" }, pinned: true, urgent: false, createdBy: DEMO_ACCOUNTS.admin, createdAt: at(addDaysISO(base, -2), "10:00"), readBy: [] },
    { id: "nt_2", schoolId: SCHOOL_ID, title: "Annual exam results will be published soon", body: "Results of the Annual Examination will be published in the app. Parents will receive an SMS and must review and acknowledge the result in the app.", audience: { kind: "role", role: "parent" }, pinned: false, urgent: false, createdBy: DEMO_ACCOUNTS.admin, createdAt: at(addDaysISO(base, -1), "12:00"), readBy: [] },
    { id: "nt_3", schoolId: SCHOOL_ID, title: "Class 8-A: science fair projects", body: "Submit project titles to the class teacher by Thursday.", audience: { kind: "section", sectionId: "sec_8A" }, pinned: false, urgent: false, createdBy: DEMO_ACCOUNTS.classTeacher, createdAt: at(addDaysISO(base, -3), "09:30"), readBy: [] },
    { id: "nt_4", schoolId: SCHOOL_ID, title: "School closed due to heavy rain warning", body: "Classes will remain closed tomorrow if the Met office issues signal 7 or above. Watch for an SMS.", audience: { kind: "school" }, pinned: false, urgent: true, createdBy: DEMO_ACCOUNTS.admin, createdAt: at(addDaysISO(base, -20), "18:00"), expiresOn: addDaysISO(base, -18), readBy: [] },
    { id: "nt_5", schoolId: SCHOOL_ID, title: "Teachers' meeting at 1:00 PM", body: "All teachers please attend in the conference room.", audience: { kind: "role", role: "teacher" }, pinned: false, urgent: false, createdBy: DEMO_ACCOUNTS.admin, createdAt: at(base, "07:00"), readBy: [] },
    { id: "nt_6", schoolId: SCHOOL_ID, title: "Winter vacation schedule", body: "Winter vacation will start after the Annual Examination results. Detailed schedule will be shared.", audience: { kind: "school" }, pinned: false, urgent: false, createdBy: DEMO_ACCOUNTS.admin, createdAt: at(addDaysISO(base, -6), "11:00"), readBy: [] },
  ];
  // read receipts for parents
  const parentIds = users.filter((u) => u.roles.includes("parent")).map((u) => u.id);
  notices.forEach((n) => (n.readBy = parentIds.filter(() => chance(n.id === "nt_1" ? 0.62 : 0.4))));

  // ---------- homework ----------
  const homework: Homework[] = [];
  const HW = ["Exercise 4.2, questions 1–10", "Write a paragraph on 'My School'", "Learn the definitions from chapter 3", "Complete the worksheet", "Read pages 45–52 and answer the questions", "Draw and label the diagram"];
  sections.forEach((sec) => {
    const subs = assignments.filter((a) => a.sectionId === sec.id).slice(0, 3);
    subs.forEach((a, i) => {
      homework.push({ id: `hw_${sec.id}_${i}`, sectionId: sec.id, subjectId: a.subjectId, title: pick(HW), details: "Bring the copy to the next class.", assignedOn: addDaysISO(base, -i), dueDate: addDaysISO(base, 2 - i), createdBy: a.teacherId, doneBy: sectionStudents(sec.id).filter(() => chance(i === 0 ? 0.3 : 0.75)).map((s) => s.id) });
    });
  });
  homework.push({ id: "hw_8A_diary", sectionId: "sec_8A", title: "Diary: bring a white shirt for the sports day rehearsal", details: "Rehearsal after the 4th period.", assignedOn: base, dueDate: addDaysISO(base, 1), createdBy: DEMO_ACCOUNTS.classTeacher, doneBy: [] });

  // ---------- timetable (Sat–Thu, 6 periods) ----------
  const DAYS: Weekday[] = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  const timetable: TimetableSlot[] = [];
  sections.forEach((sec, si) => {
    const secAssign = assignments.filter((a) => a.sectionId === sec.id);
    DAYS.forEach((day, di) => {
      for (let p = 1; p <= 6; p++) {
        const a = secAssign[(p - 1 + di + si) % secAssign.length];
        timetable.push({ id: `${sec.id}:${day}:${p}`, sectionId: sec.id, day, period: p, subjectId: a.subjectId, teacherId: a.teacherId });
      }
    });
  });

  // ---------- leave ----------
  const leaves: LeaveRequest[] = [
    { id: "lv_1", studentId: "stu_8A_17", requestedBy: students.find((s) => s.id === "stu_8A_17")!.guardians[0].guardianUserId, from: addDaysISO(base, 1), to: addDaysISO(base, 2), reason: "Family wedding in Cumilla", status: "pending", createdAt: at(addDaysISO(base, -1), "20:15") },
    { id: "lv_2", studentId: "stu_8A_18", requestedBy: students.find((s) => s.id === "stu_8A_18")!.guardians[1].guardianUserId, from: base, to: base, reason: "Fever since last night", attachmentName: "doctor-note.jpg", status: "pending", createdAt: at(base, "06:40") },
    { id: "lv_3", studentId: RAHIM, requestedBy: karim.id, from: addDaysISO(base, -20), to: addDaysISO(base, -19), reason: "Dental appointment", status: "approved", decidedBy: DEMO_ACCOUNTS.classTeacher, decidedAt: at(addDaysISO(base, -21), "09:00"), createdAt: at(addDaysISO(base, -22), "21:00") },
  ];
  // approved leave reflected in the register
  for (const sheet of attendance) {
    if (sheet.sectionId !== "sec_8A") continue;
    if (sheet.date >= leaves[2].from && sheet.date <= leaves[2].to) sheet.entries[RAHIM] = "LV";
    if (sheet.date === base) sheet.entries["stu_8A_18"] = "LV";
  }

  // ---------- fees ----------
  const feeHeads = [
    { id: "fh_tuition", name: "Monthly tuition", nameBn: "মাসিক বেতন", frequency: "monthly" as const },
    { id: "fh_exam", name: "Exam fee", nameBn: "পরীক্ষা ফি", frequency: "per_exam" as const },
    { id: "fh_session", name: "Session fee", nameBn: "সেশন ফি", frequency: "yearly" as const },
    { id: "fh_transport", name: "Transport", nameBn: "যাতায়াত", frequency: "monthly" as const },
  ];
  const feeStructures = classes.flatMap((c) => [
    { id: `fs_${c.id}_t`, classId: c.id, feeHeadId: "fh_tuition", amount: 800 + c.order * 70 },
    { id: `fs_${c.id}_e`, classId: c.id, feeHeadId: "fh_exam", amount: c.order >= 6 ? 600 : 400 },
    { id: `fs_${c.id}_s`, classId: c.id, feeHeadId: "fh_session", amount: 3000 },
  ]);
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const monthName = (offset: number) => {
    const d = new Date(Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1 + offset, 1);
    return { label: d.toLocaleString("en-US", { month: "long", year: "numeric" }), due: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-10` };
  };
  for (const st of students) {
    const cls = sections.find((s) => s.id === st.sectionId)!.classId;
    const tuition = feeStructures.find((f) => f.classId === cls && f.feeHeadId === "fh_tuition")!.amount;
    const examFee = feeStructures.find((f) => f.classId === cls && f.feeHeadId === "fh_exam")!.amount;
    const items: { title: string; items: Invoice["items"]; due: string; paid: boolean }[] = [
      { title: `Tuition — ${monthName(-2).label}`, items: [{ feeHeadId: "fh_tuition", amount: tuition }], due: monthName(-2).due, paid: chance(0.97) },
      { title: `Tuition — ${monthName(-1).label}`, items: [{ feeHeadId: "fh_tuition", amount: tuition }], due: monthName(-1).due, paid: chance(0.9) },
      { title: `Tuition — ${monthName(0).label}`, items: [{ feeHeadId: "fh_tuition", amount: tuition }], due: monthName(0).due, paid: chance(0.6) },
      { title: "Annual exam fee", items: [{ feeHeadId: "fh_exam", amount: examFee }], due: addDaysISO(base, -12), paid: chance(0.85) },
    ];
    if (st.id === RAHIM) {
      items[2].paid = false;
      items[3].paid = true;
    }
    items.forEach((it, i) => {
      const total = it.items.reduce((s, x) => s + x.amount, 0);
      const inv: Invoice = { id: `inv_${st.id}_${i}`, studentId: st.id, title: it.title, items: it.items, discount: 0, dueDate: it.due, status: it.paid ? "paid" : "unpaid", paid: it.paid ? total : 0, createdAt: at(addDaysISO(it.due, -10), "09:00") };
      invoices.push(inv);
      if (it.paid) payments.push({ id: `pay_${inv.id}`, invoiceId: inv.id, studentId: st.id, amount: total, method: pick(["bkash", "bkash", "nagad", "cash", "rocket"] as const), trxId: `TRX${seedCode(10)}`, paidBy: st.guardians[0].guardianUserId, at: at(addDaysISO(it.due, -between(0, 8)), "19:30") });
    });
  }

  // ---------- messages & meetings ----------
  const threads: MessageThread[] = [{ id: "th_1", studentId: RAHIM, teacherId: DEMO_ACCOUNTS.classTeacher, guardianUserId: karim.id, subject: "Rahim's Mathematics practice", complaint: false, lastAt: at(addDaysISO(base, -1), "18:20") }];
  const messages: Message[] = [
    { id: "m_1", threadId: "th_1", fromUserId: karim.id, body: "Assalamu alaikum sir. Rahim says he finds algebra difficult. What should he practice at home?", at: at(addDaysISO(base, -2), "20:10"), deliverAt: at(addDaysISO(base, -1), "08:00") },
    { id: "m_2", threadId: "th_1", fromUserId: DEMO_ACCOUNTS.classTeacher, body: "Walaikum assalam. Please make sure he finishes Exercise 4.2 daily. I will give him extra worksheets this week.", at: at(addDaysISO(base, -1), "11:45"), deliverAt: at(addDaysISO(base, -1), "11:45") },
    { id: "m_3", threadId: "th_1", fromUserId: karim.id, body: "Thank you, sir.", at: at(addDaysISO(base, -1), "18:20"), deliverAt: at(addDaysISO(base, -1), "18:20") },
  ];
  const meetings: MeetingSlot[] = [];
  for (let d = 1; d <= 3; d++) {
    const date = addDaysISO(base, d);
    if (weekdayOf(date) === "Fri") continue;
    ["12:15", "12:30", "12:45", "13:00"].forEach((hm, i) => meetings.push({ id: `mt_${d}_${i}`, teacherId: DEMO_ACCOUNTS.classTeacher, start: at(date, hm), minutes: 15, ...(d === 1 && i === 1 ? { bookedBy: users.find((u) => u.id === students.find((s) => s.id === "stu_8A_07")!.guardians[0].guardianUserId)!.id, studentId: "stu_8A_07", note: "About frequent absence" } : {}) }));
  }

  // ---------- notifications ----------
  const notifications: Notification[] = [];
  const note = (n: Omit<Notification, "id">) => notifications.push({ id: `n_${notifications.length}`, ...n });
  const rahimIn = gateEvents.find((g) => g.studentId === RAHIM && g.type === "IN" && g.at >= at(base, "00:00"));
  if (rahimIn) {
    for (const gid of [karim.id, rokeya.id]) note({ userId: gid, type: "gate_in", title: "Rahim arrived at school", body: `Checked in at the gate at ${new Date(rahimIn.at).toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" })}.`, studentId: RAHIM, channels: ["in_app", "sms"], createdAt: rahimIn.at, link: "/parent/attendance" });
  }
  for (const gid of [karim.id, rokeya.id]) {
    note({ userId: gid, type: "result_published", title: "Class Test 3 result published — Rahim", body: "Please review and acknowledge the result.", studentId: RAHIM, channels: ["in_app", "sms"], createdAt: publishedAt.ex_ct3, link: "/parent/results" });
    note({ userId: gid, type: "result_published", title: "Class Test 3 result published — Nusrat", body: "Please review and acknowledge the result.", studentId: "stu_5B_04", channels: ["in_app", "sms"], createdAt: publishedAt.ex_ct3, link: "/parent/results" });
  }
  const nusratAck = acks.find((a) => a.studentId === "stu_5B_04" && a.resultVersionId.startsWith("rv_ex_ct3"));
  if (nusratAck) note({ userId: karim.id, type: "result_acknowledged", title: "Nusrat's result was acknowledged", body: `Class Test 3 result was acknowledged by Rokeya Begum (mother).`, studentId: "stu_5B_04", channels: ["in_app", "sms"], createdAt: nusratAck.at, readAt: nusratAck.at });
  note({ userId: karim.id, type: "fee_due", title: "Tuition due for Rahim", body: `${monthName(0).label} tuition is due on ${monthName(0).due}.`, studentId: RAHIM, channels: ["in_app"], createdAt: at(addDaysISO(base, -5), "09:00"), link: "/parent/fees" });

  const sms = notifications
    .filter((n) => n.channels.includes("sms"))
    .map((n, i) => ({ id: `sms_${i}`, to: users.find((u) => u.id === n.userId)!.phone!, userId: n.userId, body: `${n.title}. ${n.body}`, at: n.createdAt, kind: "notification" as const }));

  addAudit({ actorId: DEMO_ACCOUNTS.admin, action: "results.publish", entity: "exam", entityId: "ex_ct3", reason: undefined, after: { sections: sections.length }, at: publishedAt.ex_ct3 });
  addAudit({ actorId: DEMO_ACCOUNTS.admin, action: "results.publish", entity: "exam", entityId: "ex_half", after: { sections: sections.length }, at: publishedAt.ex_half });
  addAudit({ actorId: DEMO_ACCOUNTS.classTeacher, action: "results.lock", entity: "section_result", entityId: "ex_annual:sec_8B", at: at(addDaysISO(base, -1), "12:00") });

  return {
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
    school,
    users,
    classes,
    sections,
    subjects,
    assignments,
    students,
    gateEvents,
    attendance,
    mismatchResolutions: [],
    gradingScales: [scale],
    exams,
    markSheets,
    sectionResults,
    results,
    acks,
    notifications,
    sms,
    otps: [],
    otpLocks: [],
    pinAttempts: [],
    smsAckCodes: [],
    audit,
    notices,
    homework,
    timetable,
    holidays,
    leaves,
    feeHeads,
    feeStructures,
    invoices,
    payments,
    threads,
    messages,
    meetings,
    devices,
  };
}
