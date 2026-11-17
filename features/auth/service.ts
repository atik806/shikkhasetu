"use client";
import type { ID, Role } from "@/types";
import { command, publicCommand, query, audit } from "@/lib/services/runtime";
import { mockHash, uid } from "@/lib/codes";
import { isValidBdPhone, normalizeBdPhone } from "@/lib/phone";
import { nowISO } from "@/lib/time";
import { permissionsFor, type Permission } from "@/lib/auth/permissions";
import { childIds, classTeacherSectionIds, teachingSectionIds } from "@/lib/auth/scope";
import { useSession, deviceLabel } from "@/lib/auth/session";

export type LoginTab = "staff" | "parent" | "student";

const TAB_ROLES: Record<LoginTab, Role[]> = {
  staff: ["school_admin", "super_admin", "teacher", "gate_staff"],
  parent: ["parent"],
  student: ["student"],
};

export interface Me {
  id: ID;
  name: string;
  roles: Role[];
  role: Role;
  permissions: Permission[];
  classTeacherSectionIds: ID[];
  teachingSectionIds: ID[];
  childIds: ID[];
  studentRecordId?: ID;
  hasPin: boolean;
}

export const mockAuthService = {
  async login(input: { tab: LoginTab; identifier: string; password: string }): Promise<{ userId: ID; role: Role }> {
    return publicCommand((db) => {
      const id = input.identifier.trim();
      const user = db.users.find((u) => {
        if (input.tab === "student") return u.loginId?.toLowerCase() === id.toLowerCase();
        if (isValidBdPhone(id)) return u.phone === normalizeBdPhone(id);
        return u.email?.toLowerCase() === id.toLowerCase();
      });
      if (!user || user.passwordHash !== mockHash(input.password)) throw new Error("Wrong ID/phone or password.");
      if (user.status === "invited") throw new Error("This account is not activated yet. Please activate it at the school office with your activation slip.");
      if (user.status === "disabled") throw new Error("This account is disabled. Contact the school office.");
      const allowed = user.roles.filter((r) => TAB_ROLES[input.tab].includes(r));
      if (allowed.length === 0) throw new Error("This account cannot sign in here. Try another tab.");
      const last = useSession.getState().lastRoleByUser[user.id];
      const role = last && allowed.includes(last) ? last : allowed[0];
      registerDevice(db, user.id);
      return { userId: user.id, role };
    });
  },

  /** Demo one-click login (demo page only). */
  async demoLogin(userId: ID, role?: Role): Promise<{ userId: ID; role: Role }> {
    return publicCommand((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error("Demo user not found. Reset the demo database from the dev panel.");
      registerDevice(db, user.id);
      return { userId, role: role ?? user.roles[0] };
    });
  },

  async me(): Promise<Me> {
    return query(({ db, actor, user }) => {
      const ct = actor.role === "teacher" ? classTeacherSectionIds(user.id, db) : [];
      return {
        id: user.id,
        name: user.name,
        roles: user.roles,
        role: actor.role,
        permissions: [...permissionsFor(actor.role, ct.length > 0)],
        classTeacherSectionIds: ct,
        teachingSectionIds: actor.role === "teacher" ? teachingSectionIds(user.id, db) : [],
        childIds: actor.role === "parent" ? childIds(user.id, db) : [],
        studentRecordId: actor.role === "student" ? db.students.find((s) => s.userId === user.id)?.id : undefined,
        hasPin: Boolean(user.pinHash),
      };
    });
  },

  async devices() {
    return query(({ db, user, deviceId }) =>
      db.devices.filter((d) => d.userId === user.id && !d.revoked).map((d) => ({ ...d, current: d.deviceId === deviceId })),
    );
  },

  async revokeDevice(id: ID) {
    return command(({ db, user }) => {
      const d = db.devices.find((x) => x.id === id && x.userId === user.id);
      if (d) d.revoked = true;
      audit(db, user.id, "session.revoke_device", "device", id);
    });
  },

  async logoutAllOthers() {
    return command(({ db, user, deviceId }) => {
      db.devices.filter((d) => d.userId === user.id && d.deviceId !== deviceId).forEach((d) => (d.revoked = true));
      audit(db, user.id, "session.logout_all", "user", user.id);
    });
  },
};

function registerDevice(db: import("@/lib/mock/schema").MockDB, userId: ID) {
  const { deviceId } = useSession.getState();
  const existing = db.devices.find((d) => d.userId === userId && d.deviceId === deviceId);
  if (existing) {
    existing.lastSeen = nowISO();
    existing.revoked = false;
  } else {
    db.devices.push({ id: uid("ds"), userId, deviceId, deviceLabel: deviceLabel(), lastSeen: nowISO(), revoked: false });
  }
}

export type AuthService = typeof mockAuthService;
