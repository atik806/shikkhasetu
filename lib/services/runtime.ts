"use client";
import type { Draft } from "immer";
import type { ID, NotificationType, User } from "@/types";
import { MANDATORY_NOTIFICATIONS } from "@/types";
import { getDb, mutate } from "@/lib/mock/db";
import type { MockDB } from "@/lib/mock/schema";
import { simulateNetwork } from "@/lib/mock/dev";
import { useSession } from "@/lib/auth/session";
import { ForbiddenError, type Actor } from "@/lib/auth/scope";
import { uid } from "@/lib/codes";
import { dhakaMinutes, hmToMinutes, nowISO, dhakaDateTime, addDaysISO, today } from "@/lib/time";

export interface Ctx {
  db: MockDB;
  actor: Actor;
  user: User;
  deviceId: string;
}

export class NotSignedInError extends Error {
  constructor() {
    super("Please sign in again.");
    this.name = "NotSignedInError";
  }
}

function makeCtx(db: MockDB): Ctx {
  const { userId, role, deviceId } = useSession.getState();
  if (!userId || !role) throw new NotSignedInError();
  const user = db.users.find((u) => u.id === userId);
  if (!user || user.status === "disabled" || !user.roles.includes(role)) throw new ForbiddenError("Your account cannot use this role.");
  return { db, actor: { userId, role }, user, deviceId };
}

/** Read-only service call. */
export async function query<T>(fn: (ctx: Ctx) => T): Promise<T> {
  await simulateNetwork();
  return fn(makeCtx(getDb()));
}

/** Public (no session) read, e.g. /verify. */
export async function publicQuery<T>(fn: (db: MockDB) => T): Promise<T> {
  await simulateNetwork();
  return fn(getDb());
}

export async function publicCommand<T>(fn: (db: MockDB) => T): Promise<T> {
  await simulateNetwork();
  return mutate((d) => fn(d));
}

/** Mutating service call. Throwing inside aborts the whole change (nothing is saved). */
export async function command<T>(fn: (ctx: Ctx) => T): Promise<T> {
  await simulateNetwork();
  return mutate((draft) => fn(makeCtx(draft)));
}

export type DraftDB = MockDB | Draft<MockDB>;

export function audit(db: MockDB, actorId: ID, action: string, entity: string, entityId: ID, extra: { before?: unknown; after?: unknown; reason?: string } = {}) {
  db.audit.push({ id: uid("au"), schoolId: db.school.id, actorId, action, entity, entityId, at: nowISO(), ...extra });
}

export function sendSms(db: MockDB, to: string | undefined, body: string, kind: "notification" | "otp" | "sms_code", userId?: ID) {
  if (!to) return;
  db.sms.push({ id: uid("sms"), to, userId, body, at: nowISO(), kind });
}

export interface NotifyInput {
  userIds: ID[];
  type: NotificationType;
  title: string;
  body: string;
  studentId?: ID;
  link?: string;
  sms?: boolean; // also send an SMS (respecting preferences)
}

/**
 * In-app notification + simulated SMS. Mandatory types ignore preferences.
 * Guardians without a smartphone get SMS for everything that has an SMS version.
 */
export function notify(db: MockDB, input: NotifyInput) {
  const mandatory = MANDATORY_NOTIFICATIONS.includes(input.type);
  for (const userId of [...new Set(input.userIds)]) {
    const user = db.users.find((u) => u.id === userId);
    if (!user) continue;
    const pref = user.notificationPrefs?.[input.type];
    const inApp = mandatory || pref?.inApp !== false;
    const wantsSms = input.sms && (mandatory || pref?.sms !== false || user.hasSmartphone === false);
    const channels: ("in_app" | "sms")[] = [];
    if (inApp) channels.push("in_app");
    if (wantsSms && user.phone) channels.push("sms");
    if (channels.length === 0) continue;
    db.notifications.push({ id: uid("n"), userId, type: input.type, title: input.title, body: input.body, studentId: input.studentId, link: input.link, channels, createdAt: nowISO() });
    if (channels.includes("sms")) sendSms(db, user.phone, `${input.title}. ${input.body}`, "notification", userId);
  }
}

export function guardiansOf(db: MockDB, studentId: ID): ID[] {
  return db.students.find((s) => s.id === studentId)?.guardians.map((g) => g.guardianUserId) ?? [];
}

/** Messages sent outside office hours are delivered next morning (prompt §4.3). */
export function deliveryTime(db: MockDB): string {
  const m = dhakaMinutes();
  const { start, end } = db.school.settings.officeHours;
  if (m >= hmToMinutes(start) && m < hmToMinutes(end)) return nowISO();
  const date = m >= hmToMinutes(end) ? addDaysISO(today(), 1) : today();
  return dhakaDateTime(date, start);
}

export function userName(db: MockDB, id?: ID): string {
  if (!id) return "—";
  return db.users.find((u) => u.id === id)?.name ?? "Unknown";
}
