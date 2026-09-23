import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildGeneralAcademicPracticeReview,
  generalAcademicPracticeConfigSchema,
  isStudentEligibleGeneralAcademicPack,
  selectGeneralAcademicPack,
  toPrivateGeneralAcademicSnapshot,
  toStudentGeneralAcademicPack,
  type GeneralAcademicPracticeAttempt,
  type GeneralAcademicPublishedCandidate,
} from "./practice";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const PACK_1 = "00000000-0000-4000-8000-000000000101";
const PACK_2 = "00000000-0000-4000-8000-000000000102";

function candidate(id = PACK_1, overrides: { status?: "draft" | "needs_review" | "approved" | "published" | "rejected" | "archived"; domain?: "engineering" | "economics"; difficulty?: "easy" | "medium" | "hard"; skill?: "table_interpretation" | "causal_reasoning" } = {}): GeneralAcademicPublishedCandidate {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8"));
  raw.review.status = overrides.status ?? "published";
  raw.review.notes = null;
  if (overrides.domain) raw.domain = overrides.domain;
  if (overrides.difficulty) raw.difficulty = overrides.difficulty;
  if (overrides.skill) raw.questions = raw.questions.map((question: Record<string, unknown>) => ({ ...question, skill: overrides.skill }));
  return { id, pack: canonicalGeneralAcademicPackSchema.parse(raw) };
}

const mixed = { mode: "mixed" as const, difficulty: "mixed" as const, timingMode: "untimed" as const };

describe("General Academic student content projection", () => {
  it.each(["draft", "needs_review", "approved", "rejected", "archived"] as const)("excludes %s packs", (status) => {
    expect(isStudentEligibleGeneralAcademicPack(candidate(PACK_1, { status }))).toBe(false);
  });

  it("accepts a canonical published pack", () => {
    expect(isStudentEligibleGeneralAcademicPack(candidate())).toBe(true);
  });

  it("creates an explicit answer-safe browser DTO", () => {
    const dto = toStudentGeneralAcademicPack(candidate());
    const serialized = JSON.stringify(dto);
    for (const forbidden of ["correctOption", "expectedValue", "tolerance", "explanation", "sourceMeta", "review", "quality", "publishedBy", "reviewedBy"]) expect(serialized).not.toContain(forbidden);
    expect(dto.questions).toHaveLength(candidate().pack.questions.length);
    expect(dto.stimulus.formulas).toHaveLength(candidate().pack.stimulus.formulas.length);
  });

  it("keeps answers and explanations only in the private snapshot", () => {
    const snapshot = toPrivateGeneralAcademicSnapshot(candidate());
    expect(snapshot.questions[0]).toMatchObject({ correctOption: expect.any(String), explanation: expect.any(Object) });
    expect(JSON.stringify(toStudentGeneralAcademicPack(candidate()))).not.toContain(snapshot.questions[0].explanation.summary);
  });

  it("rejects projection of a non-published pack", () => {
    expect(() => toStudentGeneralAcademicPack(candidate(PACK_1, { status: "approved" }))).toThrow("unavailable");
  });
});

describe("General Academic whole-pack selection", () => {
  const engineering = candidate(PACK_1, { domain: "engineering", difficulty: "medium", skill: "table_interpretation" });
  const economics = candidate(PACK_2, { domain: "economics", difficulty: "hard", skill: "causal_reasoning" });

  it("selects a whole pack by domain", () => {
    expect(selectGeneralAcademicPack([economics, engineering], { ...mixed, mode: "domain", domain: "engineering" })?.id).toBe(PACK_1);
  });

  it("selects a whole pack containing the target skill", () => {
    expect(selectGeneralAcademicPack([engineering, economics], { ...mixed, mode: "skill", skill: "causal_reasoning" })?.id).toBe(PACK_2);
  });

  it("mixed practice selects one intact source pack", () => {
    const selected = selectGeneralAcademicPack([engineering, economics], mixed);
    expect([PACK_1, PACK_2]).toContain(selected?.id);
    expect(selected?.pack.questions).toHaveLength(engineering.pack.questions.length);
  });

  it("applies internal pack difficulty filtering", () => {
    expect(selectGeneralAcademicPack([engineering, economics], { ...mixed, difficulty: "hard" })?.id).toBe(PACK_2);
  });

  it("returns null for unavailable domain and skill choices", () => {
    expect(selectGeneralAcademicPack([engineering], { ...mixed, mode: "domain", domain: "humanities" })).toBeNull();
    expect(selectGeneralAcademicPack([engineering], { ...mixed, mode: "skill", skill: "research_design" })).toBeNull();
  });

  it("rotates away from recently completed packs when an alternative exists", () => {
    expect(selectGeneralAcademicPack([engineering, economics], mixed, [PACK_1])?.id).toBe(PACK_2);
  });

  it("allows a retake when only one eligible pack exists", () => {
    expect(selectGeneralAcademicPack([engineering], mixed, [PACK_1])?.id).toBe(PACK_1);
  });

  it("never merges questions across source packs", () => {
    const selected = selectGeneralAcademicPack([engineering, economics], mixed)!;
    expect(selected.pack.questions.every((question) => engineering.pack.questions.some((source) => source.id === question.id))).toBe(true);
  });

  it("requires domain and skill only for their respective selection modes", () => {
    expect(generalAcademicPracticeConfigSchema.safeParse({ ...mixed, mode: "domain" }).success).toBe(false);
    expect(generalAcademicPracticeConfigSchema.safeParse({ ...mixed, mode: "skill" }).success).toBe(false);
    expect(generalAcademicPracticeConfigSchema.safeParse(mixed).success).toBe(true);
  });
});

describe("General Academic scoring and analytics", () => {
  it("derives correct, incorrect, unanswered, skill and domain-ready totals", () => {
    const source = candidate();
    const pack = toStudentGeneralAcademicPack(source);
    const privateSnapshot = toPrivateGeneralAcademicSnapshot(source);
    const attempt: GeneralAcademicPracticeAttempt = {
      id: "00000000-0000-4000-8000-000000000201",
      status: "submitted",
      mode: "mixed",
      timingMode: "untimed",
      selectedDomain: null,
      selectedSkill: null,
      selectedDifficulty: "mixed",
      currentQuestionIndex: 3,
      startedAt: "2026-09-03T00:00:00.000Z",
      expiresAt: null,
      elapsedSeconds: 100,
      submittedAt: "2026-09-03T00:01:40.000Z",
      pack,
      answers: [
        { questionId: pack.questions[0].id, selectedOption: privateSnapshot.questions[0].correctOption, isFlagged: false, responseSeconds: 10, answeredAt: "2026-09-03T00:00:10.000Z" },
        { questionId: pack.questions[1].id, selectedOption: privateSnapshot.questions[1].correctOption === "A" ? "B" : "A", isFlagged: true, responseSeconds: 30, answeredAt: "2026-09-03T00:00:30.000Z" },
      ],
    };
    const review = buildGeneralAcademicPracticeReview(attempt, privateSnapshot);
    expect(review.summary).toMatchObject({ correct: 1, incorrect: 1, unanswered: 2, total: 4, accuracy: 25 });
    expect(review.skills.reduce((sum, skill) => sum + skill.correct, 0)).toBe(1);
    expect(review.items[1]).toMatchObject({ isCorrect: false, isFlagged: true });
    expect(review.items[2].selectedOption).toBeNull();
  });
});
