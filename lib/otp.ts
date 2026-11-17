import type { OtpLock, OtpRecord } from "@/types";

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_LOCK_MS = 15 * 60_000;

export type OtpCheck =
  | { ok: true }
  | { ok: false; reason: "locked" | "expired" | "wrong" | "missing" | "used"; attemptsLeft?: number; lockedUntil?: string };

/**
 * Pure OTP verification. Returns the result and the updated record/lock to persist.
 * Wrong code 3 times → 15-minute lockout for that user + purpose.
 */
export function checkOtp(
  record: OtpRecord | undefined,
  lock: OtpLock | undefined,
  code: string,
  nowMs: number,
): { result: OtpCheck; record?: OtpRecord; lock?: OtpLock } {
  if (lock && new Date(lock.until).getTime() > nowMs) {
    return { result: { ok: false, reason: "locked", lockedUntil: lock.until } };
  }
  if (!record) return { result: { ok: false, reason: "missing" } };
  if (record.consumed) return { result: { ok: false, reason: "used" } };
  if (new Date(record.expiresAt).getTime() <= nowMs) return { result: { ok: false, reason: "expired" } };
  if (record.code !== code.trim()) {
    const attempts = record.attempts + 1;
    const updated = { ...record, attempts };
    if (attempts >= OTP_MAX_ATTEMPTS) {
      const until = new Date(nowMs + OTP_LOCK_MS).toISOString();
      return {
        result: { ok: false, reason: "locked", lockedUntil: until },
        record: { ...updated, consumed: true },
        lock: { key: `${record.userId}:${record.purpose}`, until },
      };
    }
    return { result: { ok: false, reason: "wrong", attemptsLeft: OTP_MAX_ATTEMPTS - attempts }, record: updated };
  }
  return { result: { ok: true }, record: { ...record, consumed: true } };
}
