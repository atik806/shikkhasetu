"use client";
import type { ID, NotificationType } from "@/types";
import { command, publicQuery, query } from "@/lib/services/runtime";
import { nowISO } from "@/lib/time";
import { maskPhone } from "@/lib/phone";

export const mockNotificationService = {
  async list() {
    return query(({ db, user }) =>
      db.notifications
        .filter((n) => n.userId === user.id && n.channels.includes("in_app"))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 100),
    );
  },
  async markRead(ids: ID[] | "all") {
    return command(({ db, user }) => {
      db.notifications.filter((n) => n.userId === user.id && !n.readAt && (ids === "all" || ids.includes(n.id))).forEach((n) => (n.readAt = nowISO()));
    });
  },
  async prefs() {
    return query(({ user }) => ({ prefs: user.notificationPrefs ?? {}, hasSmartphone: user.hasSmartphone !== false }));
  },
  async setPref(type: NotificationType, channel: "inApp" | "sms", value: boolean) {
    return command(({ db, user }) => {
      const u = db.users.find((x) => x.id === user.id)!;
      const current = u.notificationPrefs?.[type] ?? { inApp: true, sms: true };
      u.notificationPrefs = { ...u.notificationPrefs, [type]: { ...current, [channel]: value } };
    });
  },
  /** Dev panel only: simulated SMS gateway outbox (shows OTPs, since there is no real SMS). */
  async smsOutbox(limit = 60) {
    return publicQuery((db) =>
      [...db.sms]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, limit)
        .map((m) => ({ ...m, toMasked: maskPhone(m.to), toName: db.users.find((u) => u.id === m.userId)?.name ?? "" })),
    );
  },
};

export type NotificationService = typeof mockNotificationService;
