import { describe, expect, it } from "vitest";
import { BD_BOARD_BANDS, computeResult, computeSubject, gradeFor, rankPositions, roundPercent, validateMark, type SubjectInput } from "@/features/results/lib/grading";
import type { GradingScale } from "@/types";

const scale: GradingScale = { id: "s", name: "board", passPercent: 33, bands: BD_BOARD_BANDS };
const subj = (id: string, mark: number | "AB", opts: { optional?: boolean; full?: number } = {}): SubjectInput => ({
  subjectId: id,
  isOptional: Boolean(opts.optional),
  components: [{ key: "w", fullMarks: opts.full ?? 100, mustPassSeparately: false, value: mark }],
});

describe("grade bands", () => {
  it.each([
    [100, "A+", 5], [80, "A+", 5], [79, "A", 4], [70, "A", 4], [69, "A-", 3.5], [60, "A-", 3.5],
    [59, "B", 3], [50, "B", 3], [49, "C", 2], [40, "C", 2], [39, "D", 1], [33, "D", 1], [32, "F", 0], [0, "F", 0],
  ])("%i%% → %s (%d)", (pct, letter, gp) => {
    expect(gradeFor(pct, scale)).toMatchObject({ letter, gp });
  });

  it("rounds percentages half-up", () => {
    expect(roundPercent(79.5, 100)).toBe(80);
    expect(roundPercent(39.6, 50)).toBe(79);
    expect(roundPercent(16, 20)).toBe(80);
  });

  it("grades a 50-mark subject by percentage", () => {
    expect(computeSubject(subj("x", 40, { full: 50 }), scale)).toMatchObject({ percent: 80, letter: "A+", gp: 5 });
  });
});

describe("GPA", () => {
  it("averages compulsory subjects", () => {
    const r = computeResult([subj("a", 85), subj("b", 72), subj("c", 65)], scale);
    expect(r.gpa).toBe(4.17);
    expect(r.letter).toBe("A");
    expect(r.passed).toBe(true);
  });

  it("adds the optional bonus to the total BEFORE dividing", () => {
    // compulsory GPs 4,4,4 = 12; optional A+ (5) adds 3 → 15/3 = 5.00
    const r = computeResult([subj("a", 75), subj("b", 75), subj("c", 75), subj("opt", 90, { optional: true })], scale);
    expect(r.gpa).toBe(5);
  });

  it("caps GPA at 5.00", () => {
    const r = computeResult([subj("a", 95), subj("b", 95), subj("opt", 95, { optional: true })], scale);
    expect(r.gpa).toBe(5);
  });

  it("optional subject with GP ≤ 2 adds nothing", () => {
    const r = computeResult([subj("a", 75), subj("b", 75), subj("opt", 45, { optional: true })], scale);
    expect(r.gpa).toBe(4);
  });

  it("an F in a compulsory subject fails the student with GPA 0", () => {
    const r = computeResult([subj("a", 95), subj("b", 20)], scale);
    expect(r).toMatchObject({ gpa: 0, letter: "F", passed: false });
  });

  it("an F in the optional subject does NOT fail the student", () => {
    const r = computeResult([subj("a", 75), subj("b", 75), subj("opt", 10, { optional: true })], scale);
    expect(r).toMatchObject({ passed: true, gpa: 4 });
  });

  it("absent in a compulsory subject is an F", () => {
    const r = computeResult([subj("a", 75), subj("b", "AB")], scale);
    expect(r.passed).toBe(false);
    expect(r.subjectResults[1].absent).toBe(true);
  });

  it("must-pass-separately components fail the subject", () => {
    const s: SubjectInput = {
      subjectId: "phy",
      isOptional: false,
      components: [
        { key: "written", fullMarks: 70, mustPassSeparately: true, value: 65 },
        { key: "mcq", fullMarks: 30, mustPassSeparately: true, value: 5 },
      ],
    };
    expect(computeSubject(s, scale)).toMatchObject({ componentFail: true, gp: 0, letter: "F" });
  });
});

describe("positions", () => {
  it("uses competition ranking with GPA then total as tie-break", () => {
    const pos = rankPositions([
      { id: "a", passed: true, gpa: 5, totalObtained: 500 },
      { id: "b", passed: true, gpa: 5, totalObtained: 480 },
      { id: "c", passed: true, gpa: 5, totalObtained: 480 },
      { id: "d", passed: true, gpa: 4, totalObtained: 600 },
      { id: "e", passed: false, gpa: 0, totalObtained: 700 },
    ]);
    expect([...pos.entries()]).toEqual(expect.arrayContaining([["a", 1], ["b", 2], ["c", 2], ["d", 4], ["e", 5]]));
  });
});

describe("mark validation", () => {
  it("accepts numbers, AB and empty", () => {
    expect(validateMark("45", 70)).toEqual({ ok: true, value: 45 });
    expect(validateMark("ab", 70)).toEqual({ ok: true, value: "AB" });
    expect(validateMark("", 70)).toEqual({ ok: true, value: undefined });
  });
  it("rejects above full marks, negatives and junk", () => {
    expect(validateMark("71", 70).ok).toBe(false);
    expect(validateMark("-1", 70).ok).toBe(false);
    expect(validateMark("x", 70).ok).toBe(false);
  });
});
