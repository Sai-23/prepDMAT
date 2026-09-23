import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION,
  GENERAL_ACADEMIC_MOCK_DURATION_SECONDS,
  GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS,
  GENERAL_ACADEMIC_MOCK_TARGET_MAX_QUESTIONS,
  GENERAL_ACADEMIC_MOCK_TARGET_MIN_QUESTIONS,
  buildGeneralAcademicMockReview,
  buildGeneralAcademicMockSnapshots,
  composeGeneralAcademicMock,
  remainingGeneralAcademicMockSeconds,
  type GeneralAcademicMockAttempt,
} from "./mock";
import type { GeneralAcademicPublishedCandidate } from "./practice";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const domains = ["engineering", "economics", "humanities", "mathematics"] as const;
const difficulties = ["easy", "medium", "hard"] as const;

function candidate(index: number, status: "draft" | "needs_review" | "approved" | "published" | "rejected" | "archived" = "published"): GeneralAcademicPublishedCandidate {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8"));
  raw.title = `Pack ${index}`;
  raw.domain = domains[index % domains.length];
  raw.difficulty = difficulties[index % difficulties.length];
  raw.review = { status, notes: null };
  raw.questions = raw.questions.map((question: Record<string, unknown>, questionIndex: number) => ({ ...question, skill: questionIndex % 2 ? "causal_reasoning" : "table_interpretation" }));
  if (index % 2 === 0) raw.stimulus.figures = [{ id: `figure_${index}`, type: "diagram", title: "Process", description: "An accessible process diagram.", data: { kind: "flow" } }];
  return { id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, pack: canonicalGeneralAcademicPackSchema.parse(raw) };
}

function candidateWithQuestionCount(index: number, questionCount: number) {
  const base = candidate(index);
  const originals = base.pack.questions;
  return {
    ...base,
    pack: {
      ...base.pack,
      questions: Array.from({ length: questionCount }, (_, questionIndex) => ({
        ...originals[questionIndex % originals.length],
        id: `q_${index}_${questionIndex + 1}`,
        order: questionIndex + 1,
      })),
    },
  } satisfies GeneralAcademicPublishedCandidate;
}

const inventory = Array.from({ length: 9 }, (_, index) => candidate(index + 1));

describe("General Academic mock composition", () => {
  it.each(["draft", "needs_review", "approved", "rejected", "archived"] as const)("excludes %s packs", (status) => {
    expect(composeGeneralAcademicMock([...inventory.slice(0, 5), candidate(20, status)], "seed")?.packs).not.toContainEqual(expect.objectContaining({ id: candidate(20, status).id }));
  });

  it("selects only complete packs and preserves every selected question", () => {
    const result = composeGeneralAcademicMock(inventory, "whole-pack-seed")!;
    expect(result.packs.length).toBeGreaterThanOrEqual(GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS);
    for (const selected of result.packs) expect(selected.pack.questions).toEqual(inventory.find((item) => item.id === selected.id)?.pack.questions);
  });

  it("meets the PrepDMAT target range when inventory pack sizes permit", () => {
    const result = composeGeneralAcademicMock(inventory, "range-seed")!;
    expect(result.questionCount).toBeGreaterThanOrEqual(GENERAL_ACADEMIC_MOCK_TARGET_MIN_QUESTIONS);
    expect(result.questionCount).toBeLessThanOrEqual(GENERAL_ACADEMIC_MOCK_TARGET_MAX_QUESTIONS);
  });

  it("keeps a complete pack even when the minimum viable composition exceeds the exact target", () => {
    const largePacks = [candidateWithQuestionCount(31, 11), candidateWithQuestionCount(32, 11), candidateWithQuestionCount(33, 11)];
    const result = composeGeneralAcademicMock(largePacks, "atomic-overflow")!;
    expect(result.questionCount).toBe(33);
    expect(result.packs).toHaveLength(3);
    expect(result.packs.every((pack) => pack.pack.questions.length === 11)).toBe(true);
  });

  it("is deterministic for the same seed and inventory", () => {
    expect(composeGeneralAcademicMock(inventory, "same")?.packs.map((pack) => pack.id)).toEqual(composeGeneralAcademicMock([...inventory].reverse(), "same")?.packs.map((pack) => pack.id));
  });

  it("allows another seed to vary composition order", () => {
    expect(composeGeneralAcademicMock(inventory, "seed-a")?.packs.map((pack) => pack.id)).not.toEqual(composeGeneralAcademicMock(inventory, "seed-b")?.packs.map((pack) => pack.id));
  });

  it("avoids recent packs when eligible alternatives exist", () => {
    const baseline = composeGeneralAcademicMock(inventory, "repeat")!;
    const rotated = composeGeneralAcademicMock(inventory, "repeat", baseline.packs.map((pack) => pack.id))!;
    expect(rotated.packs.filter((pack) => baseline.packs.some((old) => old.id === pack.id)).length).toBeLessThan(baseline.packs.length);
  });

  it("returns no mock for fewer than three packs", () => {
    expect(composeGeneralAcademicMock(inventory.slice(0, 2), "small")).toBeNull();
  });

  it("returns no mock below the documented minimum question inventory", () => {
    expect(composeGeneralAcademicMock(inventory.slice(0, 4), "small")).toBeNull();
  });

  it("persists version, seed, pack order and the exact 90-minute duration in snapshots", () => {
    const composition = composeGeneralAcademicMock(inventory, "snapshot-seed")!;
    const snapshots = buildGeneralAcademicMockSnapshots(composition);
    expect(snapshots.publicSnapshot).toMatchObject({ compositionVersion: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, seed: "snapshot-seed", durationSeconds: GENERAL_ACADEMIC_MOCK_DURATION_SECONDS });
    expect(snapshots.publicSnapshot.packs.map((pack) => pack.id)).toEqual(composition.packs.map((pack) => pack.id));
  });

  it("keeps answers, explanations, validation and provenance out of the public snapshot", () => {
    const serialized = JSON.stringify(buildGeneralAcademicMockSnapshots(composeGeneralAcademicMock(inventory, "safe")!).publicSnapshot);
    for (const forbidden of ["correctOption", "explanation", "expectedValue", "tolerance", "sourceMeta", "review", "quality"]) expect(serialized).not.toContain(forbidden);
  });

  it("keeps canonical answers and explanations in the private snapshot", () => {
    const snapshot = buildGeneralAcademicMockSnapshots(composeGeneralAcademicMock(inventory, "private")!).privateSnapshot;
    expect(snapshot.packs[0].snapshot.questions[0]).toMatchObject({ correctOption: expect.any(String), explanation: expect.any(Object) });
  });

  it("prefers diversity across domains, difficulties, skills and representations", () => {
    const selected = composeGeneralAcademicMock(inventory, "diverse")!.packs;
    expect(new Set(selected.map((pack) => pack.pack.domain)).size).toBeGreaterThan(1);
    expect(new Set(selected.map((pack) => pack.pack.difficulty)).size).toBeGreaterThan(1);
    expect(new Set(selected.flatMap((pack) => pack.pack.questions.map((question) => question.skill))).size).toBeGreaterThan(1);
    expect(selected.some((pack) => pack.pack.stimulus.figures.length)).toBe(true);
  });
});

describe("General Academic mock timer and scoring", () => {
  it("derives remaining time from server timestamps", () => {
    expect(remainingGeneralAcademicMockSeconds("2026-09-03T01:30:00.000Z", "2026-09-03T00:30:00.000Z")).toBe(3600);
  });

  it("cannot produce negative remaining time", () => {
    expect(remainingGeneralAcademicMockSeconds("2026-09-03T01:30:00.000Z", "2026-09-03T02:00:00.000Z")).toBe(0);
  });

  it("scores correct, incorrect and unanswered answers with pack/domain/skill metrics", () => {
    const composition = composeGeneralAcademicMock(inventory, "score")!;
    const snapshots = buildGeneralAcademicMockSnapshots(composition);
    const firstPack = snapshots.publicSnapshot.packs[0];
    const privatePack = snapshots.privateSnapshot.packs[0].snapshot;
    const wrong = privatePack.questions[1].correctOption === "A" ? "B" : "A";
    const attempt: GeneralAcademicMockAttempt = {
      id: "00000000-0000-4000-8000-000000000200", status: "submitted",
      compositionVersion: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, seed: "score",
      durationSeconds: GENERAL_ACADEMIC_MOCK_DURATION_SECONDS, currentPackIndex: 0,
      currentQuestionId: firstPack.questions[0].id, startedAt: "2026-09-03T00:00:00.000Z",
      expiresAt: "2026-09-03T01:30:00.000Z", submittedAt: "2026-09-03T01:00:00.000Z",
      elapsedSeconds: 3600, submissionReason: "manual", serverNow: "2026-09-03T01:00:00.000Z",
      packs: snapshots.publicSnapshot.packs,
      answers: [
        { packId: firstPack.id, questionId: firstPack.questions[0].id, selectedOption: privatePack.questions[0].correctOption, isFlagged: false, responseSeconds: 10, answeredAt: "2026-09-03T00:00:10.000Z" },
        { packId: firstPack.id, questionId: firstPack.questions[1].id, selectedOption: wrong, isFlagged: true, responseSeconds: 20, answeredAt: "2026-09-03T00:00:20.000Z" },
      ],
    };
    const review = buildGeneralAcademicMockReview(attempt, snapshots.privateSnapshot);
    expect(review.summary).toMatchObject({ correct: 1, incorrect: 1, timeUsedSeconds: 3600 });
    expect(review.summary.unanswered).toBe(review.summary.total - 2);
    expect(review.packs.reduce((sum, item) => sum + item.total, 0)).toBe(review.summary.total);
    expect(review.domains.length).toBeGreaterThan(1);
    expect(review.skills.length).toBeGreaterThan(1);
    expect(review.items[1]).toMatchObject({ isCorrect: false, isFlagged: true });
  });
});
