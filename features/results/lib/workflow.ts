import type { SectionResultState } from "@/types";

/**
 * Result workflow:
 * DRAFT → (teacher submits each subject) SUBMITTED → (class teacher) LOCKED → (admin) PUBLISHED → ACKNOWLEDGED
 * ACKNOWLEDGED is derived per student (a published version with at least one acknowledgment), never stored.
 */
export type WorkflowState = "DRAFT" | "SUBMITTED" | "LOCKED" | "PUBLISHED";

export function sectionWorkflowState(state: SectionResultState["state"], sheetStatuses: ("DRAFT" | "SUBMITTED")[]): WorkflowState {
  if (state === "PUBLISHED") return "PUBLISHED";
  if (state === "LOCKED") return "LOCKED";
  if (sheetStatuses.length > 0 && sheetStatuses.every((s) => s === "SUBMITTED")) return "SUBMITTED";
  return "DRAFT";
}

export function canLock(state: SectionResultState["state"], sheetStatuses: ("DRAFT" | "SUBMITTED")[]): boolean {
  return state === "OPEN" && sheetStatuses.length > 0 && sheetStatuses.every((s) => s === "SUBMITTED");
}

export function canPublish(state: SectionResultState["state"]): boolean {
  return state === "LOCKED";
}

export type AckStatus = "acknowledged" | "pending" | "overdue";

export function ackStatus(hasAck: boolean, deadline: string, todayDate: string): AckStatus {
  if (hasAck) return "acknowledged";
  return todayDate > deadline ? "overdue" : "pending";
}
