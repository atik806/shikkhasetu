import type { GradeBand, GradingScale, ID, MarkValue, SubjectResult } from "@/types";

export const BD_BOARD_BANDS: GradeBand[] = [
  { min: 80, letter: "A+", gp: 5 },
  { min: 70, letter: "A", gp: 4 },
  { min: 60, letter: "A-", gp: 3.5 },
  { min: 50, letter: "B", gp: 3 },
  { min: 40, letter: "C", gp: 2 },
  { min: 33, letter: "D", gp: 1 },
  { min: 0, letter: "F", gp: 0 },
];

/** Round half-up to a whole percentage (configurable rule from the prompt §4.1). */
export function roundPercent(obtained: number, full: number): number {
  if (full <= 0) return 0;
  return Math.floor((obtained / full) * 100 + 0.5);
}

export function gradeFor(percent: number, scale: Pick<GradingScale, "bands">): GradeBand {
  const sorted = [...scale.bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => percent >= b.min) ?? sorted[sorted.length - 1];
}

export function letterForGpa(gpa: number, passed: boolean): string {
  if (!passed) return "F";
  if (gpa >= 5) return "A+";
  if (gpa >= 4) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3) return "B";
  if (gpa >= 2) return "C";
  if (gpa >= 1) return "D";
  return "F";
}

export interface SubjectInput {
  subjectId: ID;
  isOptional: boolean;
  components: { key: string; fullMarks: number; mustPassSeparately: boolean; value: MarkValue | undefined }[];
}

export function computeSubject(input: SubjectInput, scale: GradingScale): SubjectResult {
  const fullMarks = input.components.reduce((s, c) => s + c.fullMarks, 0);
  const values = input.components.map((c) => c.value);
  const absent = values.length > 0 && values.every((v) => v === "AB" || v === undefined);
  const obtained = input.components.reduce((s, c) => s + (typeof c.value === "number" ? c.value : 0), 0);
  const percent = roundPercent(obtained, fullMarks);
  const componentFail = input.components.some(
    (c) =>
      c.mustPassSeparately &&
      roundPercent(typeof c.value === "number" ? c.value : 0, c.fullMarks) < scale.passPercent,
  );
  const band = gradeFor(percent, scale);
  const failBand = scale.bands.find((b) => b.gp === 0) ?? { letter: "F", gp: 0, min: 0 };
  const fail = absent || componentFail || percent < scale.passPercent || band.gp === 0;
  return {
    subjectId: input.subjectId,
    isOptional: input.isOptional,
    obtained,
    fullMarks,
    percent,
    letter: fail ? failBand.letter : band.letter,
    gp: fail ? 0 : band.gp,
    absent,
    componentFail,
  };
}

export interface ComputedResult {
  subjectResults: SubjectResult[];
  totalObtained: number;
  totalFull: number;
  gpa: number;
  letter: string;
  passed: boolean;
}

/**
 * GPA = (sum of compulsory GPs + max(0, optional GP − 2)) ÷ number of compulsory subjects,
 * capped at 5.00, 2 decimals. Any F in a compulsory subject → overall F (GPA 0.00).
 * An F in the optional subject does not fail the student.
 */
export function computeResult(subjects: SubjectInput[], scale: GradingScale): ComputedResult {
  const subjectResults = subjects.map((s) => computeSubject(s, scale));
  const compulsory = subjectResults.filter((r) => !r.isOptional);
  const optional = subjectResults.filter((r) => r.isOptional);
  const totalObtained = subjectResults.reduce((s, r) => s + r.obtained, 0);
  const totalFull = subjectResults.reduce((s, r) => s + r.fullMarks, 0);
  const passed = compulsory.length > 0 && compulsory.every((r) => r.gp > 0);
  if (!passed) {
    return { subjectResults, totalObtained, totalFull, gpa: 0, letter: "F", passed: false };
  }
  const bonus = optional.reduce((s, r) => s + Math.max(0, r.gp - 2), 0);
  const sum = compulsory.reduce((s, r) => s + r.gp, 0) + bonus;
  const gpa = Math.min(5, Math.round((sum / compulsory.length) * 100) / 100);
  return { subjectResults, totalObtained, totalFull, gpa, letter: letterForGpa(gpa, true), passed: true };
}

/**
 * Competition ranking ("1, 2, 2, 4"). Tie-break: passed first → GPA → total marks.
 * Equal on all keys → equal position.
 */
export function rankPositions<T extends { id: ID; passed: boolean; gpa: number; totalObtained: number }>(
  rows: T[],
): Map<ID, number> {
  const sorted = [...rows].sort(
    (a, b) => Number(b.passed) - Number(a.passed) || b.gpa - a.gpa || b.totalObtained - a.totalObtained,
  );
  const out = new Map<ID, number>();
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    if (prev && prev.passed === r.passed && prev.gpa === r.gpa && prev.totalObtained === r.totalObtained) {
      out.set(r.id, out.get(prev.id)!);
    } else {
      out.set(r.id, i + 1);
    }
  });
  return out;
}

export function validateMark(value: string, fullMarks: number): { ok: true; value: MarkValue | undefined } | { ok: false; error: string } {
  const v = value.trim().toUpperCase();
  if (v === "") return { ok: true, value: undefined };
  if (v === "AB") return { ok: true, value: "AB" };
  const n = Number(v);
  if (!Number.isFinite(n)) return { ok: false, error: "Enter a number or AB" };
  if (n < 0) return { ok: false, error: "Cannot be negative" };
  if (n > fullMarks) return { ok: false, error: `Max ${fullMarks}` };
  if (Math.round(n * 2) !== n * 2) return { ok: false, error: "Use whole or half marks" };
  return { ok: true, value: n };
}
