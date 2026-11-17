"use client";
import type { Acknowledgment, AckChannel, ID } from "@/types";
import { audit, command, notify, query, sendSms, userName } from "@/lib/services/runtime";
import { assert, isAdminRole, isClassTeacherOf } from "@/lib/auth/scope";
import { mockHash, otpCode, uid } from "@/lib/codes";
import { maskPhone } from "@/lib/phone";
import { now, nowISO, today } from "@/lib/time";
import { checkOtp, OTP_LOCK_MS, OTP_MAX_ATTEMPTS, OTP_TTL_MS } from "@/lib/otp";
import { deviceLabel } from "@/lib/auth/session";
import { detectAnomalies, needsFollowUp, worstSeverity } from "./lib/anomaly";
import { ackDeadline } from "@/features/results/service";
import { ackStatus } from "@/features/results/lib/workflow";
import { guardianBriefs, relationLabel, sectionLabel, studentBrief } from "@/lib/services/lookups";
import type { MockDB } from "@/lib/mock/schema";

function pinState(db: MockDB, userId: ID) {
  let p = db.pinAttempts.find((x) => x.userId === userId);
  if (!p) {
    p = { userId, failures: 0 };
    db.pinAttempts.push(p);
  }
  return p;
}

function currentVersion(db: MockDB, resultVersionId: ID) {
  const rv = db.results.find((r) => r.id === resultVersionId);
  assert(Boolean(rv), "Result not found.");
  assert(rv!.state === "PUBLISHED", "This version was replaced by a corrected result. Open the latest one.");
  return rv!;
}

/** Create the acknowledgment, run anomaly rules, and notify everyone who should know. */
function recordAck(
  db: MockDB,
  input: { resultVersionId: ID; guardianUserId: ID; channel: AckChannel; deviceId: string; deviceLabel: string; userAgent: string; comment?: string; failedAttempts: number; pinVerified: boolean; otpVerified: boolean; recordedByTeacherId?: ID },
): Acknowledgment {
  const rv = currentVersion(db, input.resultVersionId);
  const st = db.students.find((s) => s.id === rv.studentId)!;
  const link = st.guardians.find((g) => g.guardianUserId === input.guardianUserId);
  assert(Boolean(link?.canAcknowledge), "This guardian is not allowed to acknowledge for this student.");
  assert(!db.acks.some((a) => a.resultVersionId === rv.id && a.guardianUserId === input.guardianUserId), "Already acknowledged by this guardian.");
  const guardian = db.users.find((u) => u.id === input.guardianUserId)!;
  const siblingIds = db.students.filter((o) => o.id !== st.id && o.guardians.some((og) => st.guardians.some((sg) => sg.guardianUserId === og.guardianUserId))).map((o) => o.id);
  const at = nowISO();
  const flags =
    input.channel === "app"
      ? detectAnomalies({
          studentDeviceIds: st.userId ? db.devices.filter((d) => d.userId === st.userId).map((d) => d.deviceId) : [],
          phoneChangedAt: link!.phoneChangedAt,
          phoneChangeFlagDays: db.school.settings.phoneChangeFlagDays,
          sameDeviceAcks: db.acks.filter((a) => a.deviceId === input.deviceId && a.channel === "app").map((a) => ({ studentId: a.studentId })),
          siblingIds,
          studentId: st.id,
          failedAttempts: input.failedAttempts,
          remoteActivationFirstAck: guardian.activation?.method === "remote" && !db.acks.some((a) => a.guardianUserId === guardian.id),
          deviceId: input.deviceId,
          at,
        })
      : [];
  const ack: Acknowledgment = { ...input, id: uid("ack"), resultVersionId: rv.id, studentId: st.id, at, anomalyFlags: flags };
  db.acks.push(ack);

  const exam = db.exams.find((e) => e.id === rv.examId)!;
  const rel = relationLabel(db, st.id, guardian.id).toLowerCase();
  const how = input.channel === "app" ? "in the app" : input.channel === "sms_code" ? "by SMS code (phone call with the class teacher)" : "in person at school";
  // cross-guardian notification: the key anti-forgery signal
  const others = st.guardians.map((g) => g.guardianUserId).filter((id) => id !== guardian.id);
  notify(db, { userIds: others, type: "result_acknowledged", title: `${st.name.split(" ")[0]}'s result was acknowledged`, body: `${exam.name} result was acknowledged by ${guardian.name} (${rel}) ${how}. If this was not you or your family, contact the class teacher.`, studentId: st.id, sms: true, link: `/parent/results/${rv.id}` });
  // confirmation to the acknowledging guardian (SMS too, so they notice if someone used their phone)
  if (input.channel !== "app") notify(db, { userIds: [guardian.id], type: "result_acknowledged", title: `You acknowledged ${st.name.split(" ")[0]}'s result`, body: `${exam.name}, recorded ${how}.`, studentId: st.id, sms: true });
  const sec = db.sections.find((s) => s.id === rv.sectionId)!;
  if (needsFollowUp(ack)) {
    notify(db, { userIds: [sec.classTeacherId], type: "security", title: `Check acknowledgment: ${st.name}`, body: flags.map((f) => f.explanation).join(" "), studentId: st.id, link: "/teacher/acknowledgments" });
  }
  if (input.comment) {
    notify(db, { userIds: [sec.classTeacherId], type: "message", title: `Comment from ${guardian.name}`, body: `${st.name}: “${input.comment}”`, studentId: st.id, link: "/teacher/acknowledgments" });
  }
  return ack;
}

export const mockAckService = {
  /** Step 1: parent enters PIN → OTP goes to the guardian phone registered by the school. */
  async startAck(input: { resultVersionId: ID; pin: string }) {
    return command(({ db, actor, user }) => {
      assert(actor.role === "parent", "Only a guardian can acknowledge a result.");
      const rv = currentVersion(db, input.resultVersionId);
      const st = db.students.find((s) => s.id === rv.studentId)!;
      assert(st.guardians.some((g) => g.guardianUserId === user.id && g.canAcknowledge), "You are not a guardian who can acknowledge for this student.");
      assert(Boolean(user.pinHash), "You have no parent PIN yet. Set it at the school office.");
      const p = pinState(db, user.id);
      const t = now().getTime();
      if (p.lockedUntil && new Date(p.lockedUntil).getTime() > t) {
        return { ok: false as const, error: `Too many wrong PINs. Try again after ${new Date(p.lockedUntil).toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" })}.` };
      }
      if (user.pinHash !== mockHash(input.pin)) {
        p.failures += 1;
        if (p.failures % OTP_MAX_ATTEMPTS === 0) {
          p.lockedUntil = new Date(t + OTP_LOCK_MS).toISOString();
          notify(db, { userIds: [user.id], type: "security", title: "Parent PIN locked for 15 minutes", body: "Someone entered a wrong PIN 3 times on your account.", sms: true });
        }
        return { ok: false as const, error: `Wrong PIN. ${OTP_MAX_ATTEMPTS - (p.failures % OTP_MAX_ATTEMPTS || OTP_MAX_ATTEMPTS)} attempt(s) left before a 15-minute lock.` };
      }
      const lock = db.otpLocks.find((l) => l.key === `${user.id}:ack`);
      if (lock && new Date(lock.until).getTime() > t) return { ok: false as const, error: "Too many wrong codes. Try again in 15 minutes." };
      db.otps.filter((o) => o.userId === user.id && o.purpose === "ack" && !o.consumed).forEach((o) => (o.consumed = true));
      const code = otpCode();
      db.otps.push({ id: uid("otp"), userId: user.id, purpose: "ack", code, expiresAt: new Date(t + OTP_TTL_MS).toISOString(), attempts: 0, consumed: false });
      sendSms(db, user.phone, `${db.school.name}: code ${code} to acknowledge ${st.name.split(" ")[0]}'s result. Valid 5 minutes. Never share it with your child.`, "otp", user.id);
      return { ok: true as const, sentTo: maskPhone(user.phone) };
    });
  },

  /** Step 2: OTP → acknowledgment recorded. */
  async confirmAck(input: { resultVersionId: ID; code: string; comment?: string }) {
    return command(({ db, actor, user, deviceId }) => {
      assert(actor.role === "parent");
      const rec = [...db.otps].reverse().find((o) => o.userId === user.id && o.purpose === "ack" && !o.consumed);
      const lock = db.otpLocks.find((l) => l.key === `${user.id}:ack`);
      const res = checkOtp(rec, lock, input.code, now().getTime());
      if (res.record && rec) Object.assign(rec, res.record);
      if (res.lock) {
        db.otpLocks = db.otpLocks.filter((l) => l.key !== res.lock!.key);
        db.otpLocks.push(res.lock);
      }
      if (!res.result.ok) {
        const msg = { locked: "Too many wrong codes. Locked for 15 minutes.", expired: "The code expired. Start again to get a new code.", wrong: `Wrong code. ${res.result.attemptsLeft ?? 0} attempt(s) left.`, missing: "Start again to get a code.", used: "This code was already used." }[res.result.reason];
        return { ok: false as const, error: msg };
      }
      const p = pinState(db, user.id);
      const failed = p.failures + (rec?.attempts ?? 0);
      const ack = recordAck(db, {
        resultVersionId: input.resultVersionId,
        guardianUserId: user.id,
        channel: "app",
        deviceId,
        deviceLabel: deviceLabel(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        comment: input.comment?.trim() || undefined,
        failedAttempts: failed,
        pinVerified: true,
        otpVerified: true,
      });
      p.failures = 0;
      p.lockedUntil = undefined;
      return { ok: true as const, ackId: ack.id, flags: ack.anomalyFlags.length };
    });
  },

  // ---------- class teacher ----------
  async tracker(examId: ID, sectionId: ID) {
    return query(({ db, actor }) => {
      assert(isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role), "Only the class teacher can see this.");
      const t = today();
      const students = db.students.filter((s) => s.sectionId === sectionId && s.status === "active").sort((a, b) => a.roll - b.roll);
      const rows = students.map((s) => {
        const rv = db.results.find((r) => r.examId === examId && r.studentId === s.id && r.state === "PUBLISHED");
        const acks = rv ? db.acks.filter((a) => a.resultVersionId === rv.id) : [];
        const deadline = rv ? ackDeadline(db, rv) : "";
        const flags = acks.flatMap((a) => a.anomalyFlags.map((f) => ({ ...f, ackId: a.id })));
        return {
          student: studentBrief(db, s),
          resultVersionId: rv?.id,
          gpa: rv?.gpa,
          version: rv?.version,
          status: rv ? ackStatus(acks.length > 0, deadline, t) : null,
          deadline,
          paperReturned: rv?.paperReturned,
          paperMismatch: Boolean(rv?.paperReturned) && acks.length === 0,
          acks: acks.map((a) => ({ id: a.id, guardian: userName(db, a.guardianUserId), relation: relationLabel(db, s.id, a.guardianUserId), channel: a.channel, at: a.at, deviceLabel: a.deviceLabel, comment: a.comment, recordedBy: userName(db, a.recordedByTeacherId), flags: a.anomalyFlags, followUp: needsFollowUp(a) })),
          worst: worstSeverity(flags),
          guardians: guardianBriefs(db, s),
        };
      });
      const published = rows.filter((r) => r.resultVersionId);
      const exams = db.exams.filter((e) => db.sectionResults.some((r) => r.examId === e.id && r.sectionId === sectionId && r.state === "PUBLISHED")).map((e) => ({ id: e.id, name: e.name }));
      return {
        sectionLabel: sectionLabel(db, sectionId),
        exams,
        rows,
        summary: {
          total: published.length,
          acknowledged: published.filter((r) => r.status === "acknowledged").length,
          pending: published.filter((r) => r.status === "pending").length,
          overdue: published.filter((r) => r.status === "overdue").length,
          flagged: published.filter((r) => r.acks.some((a) => a.followUp)).length,
          paperMismatch: published.filter((r) => r.paperMismatch).length,
        },
      };
    });
  },

  async sendReminders(examId: ID, sectionId: ID) {
    return command(({ db, actor }) => {
      assert(isClassTeacherOf(actor, sectionId, db) || isAdminRole(actor.role));
      const exam = db.exams.find((e) => e.id === examId)!;
      let sent = 0;
      for (const s of db.students.filter((x) => x.sectionId === sectionId && x.status === "active")) {
        const rv = db.results.find((r) => r.examId === examId && r.studentId === s.id && r.state === "PUBLISHED");
        if (!rv || db.acks.some((a) => a.resultVersionId === rv.id)) continue;
        notify(db, { userIds: s.guardians.map((g) => g.guardianUserId), type: "ack_reminder", title: `Reminder: please acknowledge ${s.name.split(" ")[0]}'s result`, body: `${exam.name}. Deadline ${ackDeadline(db, rv)}.`, studentId: s.id, sms: true, link: `/parent/results/${rv.id}` });
        sent++;
      }
      audit(db, actor.userId, "ack.reminders", "section", sectionId, { after: { exam: exam.name, students: sent } });
      return sent;
    });
  },

  async recordInPerson(input: { resultVersionId: ID; guardianUserId: ID; note?: string }) {
    return command(({ db, actor, deviceId }) => {
      const rv = currentVersion(db, input.resultVersionId);
      assert(isClassTeacherOf(actor, rv.sectionId, db) || isAdminRole(actor.role));
      const ack = recordAck(db, { resultVersionId: rv.id, guardianUserId: input.guardianUserId, channel: "in_person", deviceId, deviceLabel: "School office", userAgent: "—", comment: input.note, failedAttempts: 0, pinVerified: false, otpVerified: false, recordedByTeacherId: actor.userId });
      audit(db, actor.userId, "ack.in_person", "acknowledgment", ack.id, { after: { guardian: userName(db, input.guardianUserId) } });
    });
  },

  /** Feature-phone flow, step 1: SMS with summary + one-time code to the registered number. */
  async sendSmsCode(input: { resultVersionId: ID; guardianUserId: ID }) {
    return command(({ db, actor }) => {
      const rv = currentVersion(db, input.resultVersionId);
      assert(isClassTeacherOf(actor, rv.sectionId, db) || isAdminRole(actor.role));
      const g = db.users.find((u) => u.id === input.guardianUserId)!;
      const st = db.students.find((s) => s.id === rv.studentId)!;
      const exam = db.exams.find((e) => e.id === rv.examId)!;
      db.smsAckCodes.filter((c) => c.resultVersionId === rv.id && c.guardianUserId === g.id).forEach((c) => (c.used = true));
      const code = otpCode();
      db.smsAckCodes.push({ id: uid("sac"), resultVersionId: rv.id, guardianUserId: g.id, code, expiresAt: new Date(now().getTime() + 48 * 3_600_000).toISOString(), used: false });
      sendSms(db, g.phone, `${db.school.name}: ${st.name} ${exam.name} GPA ${rv.gpa.toFixed(2)} (${rv.letter}). The class teacher will CALL you from the school number. Tell them this code to confirm you saw the result: ${code}. Never share it with your child.`, "sms_code", g.id);
      return { sentTo: maskPhone(g.phone), callNumber: g.phone };
    });
  },

  /** Feature-phone flow, step 2: the teacher called the registered number; the guardian read the code aloud. */
  async enterSmsCode(input: { resultVersionId: ID; guardianUserId: ID; code: string }) {
    return command(({ db, actor, deviceId }) => {
      const rv = currentVersion(db, input.resultVersionId);
      assert(isClassTeacherOf(actor, rv.sectionId, db) || isAdminRole(actor.role));
      const rec = [...db.smsAckCodes].reverse().find((c) => c.resultVersionId === rv.id && c.guardianUserId === input.guardianUserId && !c.used);
      assert(Boolean(rec), "No active code. Send a new SMS code first.");
      assert(new Date(rec!.expiresAt).getTime() > now().getTime(), "The code expired. Send a new one.");
      assert(rec!.code === input.code.trim(), "The code does not match. Ask the guardian to read it again.");
      rec!.used = true;
      const ack = recordAck(db, { resultVersionId: rv.id, guardianUserId: input.guardianUserId, channel: "sms_code", deviceId, deviceLabel: "Phone call by class teacher", userAgent: "—", failedAttempts: 0, pinVerified: false, otpVerified: true, recordedByTeacherId: actor.userId });
      audit(db, actor.userId, "ack.sms_code", "acknowledgment", ack.id, { after: { guardian: userName(db, input.guardianUserId) } });
    });
  },

  async markPaperReturned(resultVersionId: ID, returned: boolean) {
    return command(({ db, actor }) => {
      const rv = currentVersion(db, resultVersionId);
      assert(isClassTeacherOf(actor, rv.sectionId, db) || isAdminRole(actor.role));
      rv.paperReturned = returned ? { at: nowISO(), byUserId: actor.userId } : undefined;
    });
  },

  async resolveFlag(input: { ackId: ID; code: string; note: string }) {
    return command(({ db, actor }) => {
      const ack = db.acks.find((a) => a.id === input.ackId)!;
      const rv = db.results.find((r) => r.id === ack.resultVersionId)!;
      assert(isClassTeacherOf(actor, rv.sectionId, db) || isAdminRole(actor.role));
      assert(input.note.trim().length >= 3, "Write what you found.");
      const f = ack.anomalyFlags.find((x) => x.code === input.code)!;
      f.resolvedBy = actor.userId;
      f.resolvedNote = input.note;
      audit(db, actor.userId, "ack.flag_resolve", "acknowledgment", ack.id, { reason: input.note, after: { flag: input.code } });
    });
  },

  /** Admin dashboard: acknowledgment rate per section for the latest published exam. */
  async schoolRates() {
    return query(({ db, actor }) => {
      assert(isAdminRole(actor.role));
      const latest = [...db.exams].filter((e) => db.sectionResults.some((r) => r.examId === e.id && r.state === "PUBLISHED")).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
      if (!latest) return { exam: null, sections: [] };
      return {
        exam: { id: latest.id, name: latest.name },
        sections: db.sections.map((s) => {
          const rvs = db.results.filter((r) => r.examId === latest.id && r.sectionId === s.id && r.state === "PUBLISHED");
          const acked = rvs.filter((r) => db.acks.some((a) => a.resultVersionId === r.id)).length;
          const flagged = db.acks.filter((a) => rvs.some((r) => r.id === a.resultVersionId) && needsFollowUp(a)).length;
          return { id: s.id, label: sectionLabel(db, s.id), total: rvs.length, acked, rate: rvs.length ? Math.round((acked / rvs.length) * 100) : 0, flagged };
        }),
      };
    });
  },
};

export type AckService = typeof mockAckService;
