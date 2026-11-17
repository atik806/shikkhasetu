import type { Acknowledgment, AnomalyFlag, ID } from "@/types";

export interface AnomalyContext {
  /** device ids the student's own account has logged in from */
  studentDeviceIds: string[];
  /** when this guardian's phone was last changed (ISO), if ever */
  phoneChangedAt?: string;
  phoneChangeFlagDays: number;
  /** earlier acknowledgments from the same device id, with their student ids */
  sameDeviceAcks: { studentId: ID }[];
  /** sibling ids of the student being acknowledged (share a guardian) */
  siblingIds: ID[];
  studentId: ID;
  failedAttempts: number;
  /** guardian activated remotely and this is their first acknowledgment */
  remoteActivationFirstAck: boolean;
  deviceId: string;
  at: string;
}

const DAY = 86_400_000;

/**
 * Rule-based warnings for the class teacher. They never block or reject an acknowledgment.
 * Late-night acknowledgments are intentionally NOT flagged (working parents check at night).
 */
export function detectAnomalies(ctx: AnomalyContext): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  if (ctx.studentDeviceIds.includes(ctx.deviceId)) {
    flags.push({
      code: "same_device_as_student",
      severity: "low",
      explanation:
        "Acknowledged from a device the student's own account also uses. Common when a family shares one phone — only a concern together with another flag.",
    });
  }

  if (ctx.phoneChangedAt) {
    const days = (new Date(ctx.at).getTime() - new Date(ctx.phoneChangedAt).getTime()) / DAY;
    if (days >= 0 && days <= ctx.phoneChangeFlagDays) {
      flags.push({
        code: "phone_recently_changed",
        severity: "high",
        explanation: `The guardian's phone number was changed ${Math.max(0, Math.floor(days))} day(s) before this acknowledgment. Confirm with the guardian.`,
      });
    }
  }

  const otherStudents = new Set(
    ctx.sameDeviceAcks
      .map((a) => a.studentId)
      .filter((id) => id !== ctx.studentId && !ctx.siblingIds.includes(id)),
  );
  if (otherStudents.size >= 1) {
    flags.push({
      code: "multi_student_device",
      severity: "high",
      explanation: `The same device also acknowledged results for ${otherStudents.size} other student(s) who are not siblings. Possible acknowledgments made on behalf of classmates.`,
    });
  }

  if (ctx.failedAttempts >= 2) {
    flags.push({
      code: "failed_attempts",
      severity: "medium",
      explanation: `${ctx.failedAttempts} wrong PIN/OTP attempts before success.`,
    });
  }

  if (ctx.remoteActivationFirstAck) {
    flags.push({
      code: "remote_activation_first_ack",
      severity: "medium",
      explanation: "This guardian account was activated remotely (not at school) and this is its first acknowledgment.",
    });
  }

  return flags;
}

export function worstSeverity(flags: AnomalyFlag[]): AnomalyFlag["severity"] | null {
  const open = flags.filter((f) => !f.resolvedBy);
  if (open.some((f) => f.severity === "high")) return "high";
  if (open.some((f) => f.severity === "medium")) return "medium";
  if (open.some((f) => f.severity === "low")) return "low";
  return null;
}

/** A lone low-severity flag is informational; it should not light up the dashboard red. */
export function needsFollowUp(ack: Pick<Acknowledgment, "anomalyFlags">): boolean {
  const open = ack.anomalyFlags.filter((f) => !f.resolvedBy);
  if (open.some((f) => f.severity !== "low")) return true;
  return open.length >= 2;
}
