import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GeneralAcademicPracticeError,
  getGeneralAcademicPracticeLanding,
  getGeneralAcademicPracticeAttempt,
  getGeneralAcademicPracticeReview,
  saveGeneralAcademicPracticeState,
  startGeneralAcademicPractice,
  submitGeneralAcademicPractice,
  retryGeneralAcademicPracticePack,
  type GeneralAcademicPracticeRepository,
  type StoredGeneralAcademicPracticeAttempt,
} from "./practice-data";
import { toPrivateGeneralAcademicSnapshot, toStudentGeneralAcademicPack, type GeneralAcademicPublishedCandidate } from "./practice";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const USER = "00000000-0000-4000-8000-000000000011";
const OTHER = "00000000-0000-4000-8000-000000000012";
const PACK = "00000000-0000-4000-8000-000000000101";
const ATTEMPT = "00000000-0000-4000-8000-000000000201";

function candidate(): GeneralAcademicPublishedCandidate {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8"));
  raw.review = { status: "published", notes: null };
  return { id: PACK, pack: canonicalGeneralAcademicPackSchema.parse(raw) };
}

function stored(status: StoredGeneralAcademicPracticeAttempt["status"] = "in_progress"): StoredGeneralAcademicPracticeAttempt {
  const source = candidate();
  return {
    id: ATTEMPT,
    userId: USER,
    sourcePackId: PACK,
    status,
    mode: "mixed",
    timingMode: "untimed",
    selectedDomain: null,
    selectedSkill: null,
    selectedDifficulty: "mixed",
    questionCount: source.pack.questions.length,
    currentQuestionIndex: 0,
    publicSnapshot: toStudentGeneralAcademicPack(source),
    privateSnapshot: toPrivateGeneralAcademicSnapshot(source),
    correctCount: status === "submitted" ? 0 : null,
    incorrectCount: status === "submitted" ? 0 : null,
    unansweredCount: status === "submitted" ? 4 : null,
    elapsedSeconds: 20,
    startedAt: "2026-09-03T00:00:00.000Z",
    expiresAt: null,
    submittedAt: status === "submitted" ? "2026-09-03T00:01:00.000Z" : null,
    lastActivityAt: "2026-09-03T00:00:20.000Z",
    answers: [],
  };
}

function memoryRepository() {
  let attempt: StoredGeneralAcademicPracticeAttempt | null = null;
  const repository: GeneralAcademicPracticeRepository = {
    listPublishedPacks: vi.fn().mockResolvedValue([candidate()]),
    recentPackIds: vi.fn().mockResolvedValue([]),
    findActiveAttempt: vi.fn(async (userId) => attempt && attempt.userId === userId && attempt.status === "in_progress" ? attempt : null),
    loadAttempt: vi.fn(async (userId, attemptId) => attempt && attempt.userId === userId && attempt.id === attemptId ? attempt : null),
    createAttempt: vi.fn(async (input) => {
      attempt = {
        ...stored(),
        id: input.id,
        userId: input.userId,
        sourcePackId: input.packId,
        mode: input.config.mode,
        timingMode: input.config.timingMode,
        selectedDomain: input.config.domain ?? null,
        selectedSkill: input.config.skill ?? null,
        selectedDifficulty: input.config.difficulty,
        publicSnapshot: input.publicSnapshot,
        privateSnapshot: input.privateSnapshot,
        questionCount: input.publicSnapshot.questions.length,
        startedAt: input.startedAt,
        expiresAt: input.expiresAt,
      };
      return input.id;
    }),
    saveState: vi.fn(async (_userId, input) => {
      if (!attempt) return;
      const existing = attempt.answers.find((answer) => answer.questionId === input.questionId);
      const answer = { questionId: input.questionId, selectedOption: input.selectedOption, isFlagged: input.isFlagged, responseSeconds: 30, answeredAt: input.selectedOption ? "2026-09-03T00:00:30.000Z" : null };
      attempt.answers = existing ? attempt.answers.map((item) => item.questionId === input.questionId ? answer : item) : [...attempt.answers, answer];
      attempt.currentQuestionIndex = input.currentQuestionIndex;
    }),
    submit: vi.fn(async () => { if (attempt) attempt.status = "submitted"; }),
    abandon: vi.fn(async () => { if (attempt) attempt.status = "abandoned"; }),
  };
  return { repository, get: () => attempt, set: (value: StoredGeneralAcademicPracticeAttempt | null) => { attempt = value; } };
}

describe("General Academic practice persistence boundary", () => {
  let memory = memoryRepository();
  beforeEach(() => { memory = memoryRepository(); });

  it("starts an eligible pack and stores separate immutable snapshots", async () => {
    const result = await startGeneralAcademicPractice(USER, { mode: "mixed", difficulty: "mixed", timingMode: "untimed" }, memory.repository, new Date("2026-09-03T00:00:00.000Z"));
    expect(result.pack.id).toBe(PACK);
    expect(memory.repository.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ publicSnapshot: expect.any(Object), privateSnapshot: expect.any(Object) }));
    expect(JSON.stringify(result)).not.toContain("correctOption");
  });

  it("restores one active attempt instead of creating a duplicate", async () => {
    memory.set(stored());
    const result = await startGeneralAcademicPractice(USER, { mode: "mixed", difficulty: "mixed", timingMode: "untimed" }, memory.repository);
    expect(result.id).toBe(ATTEMPT);
    expect(memory.repository.createAttempt).not.toHaveBeenCalled();
  });

  it("returns only a minimal active-attempt summary on the landing page", async () => {
    const active = stored();
    active.answers = [{ questionId: active.publicSnapshot.questions[0].id, selectedOption: "A", isFlagged: false, responseSeconds: 12, answeredAt: "2026-09-03T00:00:12.000Z" }];
    memory.set(active);
    const landing = await getGeneralAcademicPracticeLanding(USER, memory.repository);
    expect(landing.activeAttempt).toEqual(expect.objectContaining({ id: ATTEMPT, title: expect.any(String), domain: "engineering", answeredCount: 1, currentQuestionIndex: 0, questionCount: 4 }));
    expect(JSON.stringify(landing.activeAttempt)).not.toMatch(/questions|answers|stimulus|correctOption|explanation/);
  });

  it("creates a new immutable attempt for a retake after submission", async () => {
    memory.set(stored("submitted"));
    const result = await startGeneralAcademicPractice(USER, { mode: "mixed", difficulty: "mixed", timingMode: "untimed" }, memory.repository);
    expect(result.id).not.toBe(ATTEMPT);
    expect(memory.repository.createAttempt).toHaveBeenCalledTimes(1);
    expect(memory.get()?.status).toBe("in_progress");
  });

  it("retries the exact owned pack only while it remains published", async () => {
    memory.set(stored("submitted"));
    const result = await retryGeneralAcademicPracticePack(USER, ATTEMPT, memory.repository, new Date("2026-09-04T00:00:00.000Z"));
    expect(result.id).not.toBe(ATTEMPT);
    expect(result.pack.id).toBe(PACK);
    expect(memory.repository.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ packId: PACK }));
  });

  it("blocks another user's retry and an archived or unavailable pack", async () => {
    memory.set(stored("submitted"));
    await expect(retryGeneralAcademicPracticePack(OTHER, ATTEMPT, memory.repository)).rejects.toMatchObject({ code: "ATTEMPT_NOT_FOUND" });
    vi.mocked(memory.repository.listPublishedPacks).mockResolvedValue([]);
    await expect(retryGeneralAcademicPracticePack(USER, ATTEMPT, memory.repository)).rejects.toMatchObject({ code: "NO_CONTENT" });
  });

  it("returns a safe no-content failure when filters have no eligible pack", async () => {
    vi.mocked(memory.repository.listPublishedPacks).mockResolvedValue([]);
    await expect(startGeneralAcademicPractice(USER, { mode: "domain", domain: "humanities", difficulty: "mixed", timingMode: "untimed" }, memory.repository)).rejects.toMatchObject({ code: "NO_CONTENT" });
  });

  it("uses a server timestamp for timed practice and no expiry for untimed practice", async () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    await startGeneralAcademicPractice(USER, { mode: "mixed", difficulty: "mixed", timingMode: "timed" }, memory.repository, now);
    expect(memory.get()?.expiresAt).toBe("2026-09-03T00:08:00.000Z");
    memory.set(null);
    await startGeneralAcademicPractice(USER, { mode: "mixed", difficulty: "mixed", timingMode: "untimed" }, memory.repository, now);
    expect(memory.get()?.expiresAt).toBeNull();
  });

  it("loads only an owned attempt and never selects a new pack during resume", async () => {
    memory.set(stored());
    expect(await getGeneralAcademicPracticeAttempt(USER, ATTEMPT, memory.repository)).toMatchObject({ id: ATTEMPT, pack: { id: PACK } });
    expect(await getGeneralAcademicPracticeAttempt(OTHER, ATTEMPT, memory.repository)).toBeNull();
    expect(memory.repository.listPublishedPacks).not.toHaveBeenCalled();
  });

  it("persists answer changes, flags and current position before submission", async () => {
    const value = stored();
    memory.set(value);
    const questionId = value.publicSnapshot.questions[0].id;
    await saveGeneralAcademicPracticeState(USER, { attemptId: ATTEMPT, questionId, selectedOption: "A", isFlagged: true, currentQuestionIndex: 1 }, memory.repository);
    await saveGeneralAcademicPracticeState(USER, { attemptId: ATTEMPT, questionId, selectedOption: "B", isFlagged: false, currentQuestionIndex: 2 }, memory.repository);
    expect(memory.get()?.answers[0]).toMatchObject({ selectedOption: "B", isFlagged: false });
    expect(memory.get()?.currentQuestionIndex).toBe(2);
  });

  it("rejects another user's mutation and invalid option IDs", async () => {
    const value = stored();
    memory.set(value);
    const questionId = value.publicSnapshot.questions[0].id;
    await expect(saveGeneralAcademicPracticeState(OTHER, { attemptId: ATTEMPT, questionId, selectedOption: "A", isFlagged: false, currentQuestionIndex: 0 }, memory.repository)).rejects.toMatchObject({ code: "ATTEMPT_NOT_FOUND" });
    await expect(saveGeneralAcademicPracticeState(USER, { attemptId: ATTEMPT, questionId, selectedOption: "E", isFlagged: false, currentQuestionIndex: 0 }, memory.repository)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("prevents mutation after submission", async () => {
    const value = stored("submitted");
    memory.set(value);
    await expect(saveGeneralAcademicPracticeState(USER, { attemptId: ATTEMPT, questionId: value.publicSnapshot.questions[0].id, selectedOption: "A", isFlagged: false, currentQuestionIndex: 0 }, memory.repository)).rejects.toMatchObject({ code: "ATTEMPT_LOCKED" });
  });

  it("does not expose results or explanations before submission", async () => {
    memory.set(stored());
    expect(await getGeneralAcademicPracticeReview(USER, ATTEMPT, memory.repository)).toBeNull();
  });

  it("submits server-side and repeated submission is idempotent", async () => {
    memory.set(stored());
    const first = await submitGeneralAcademicPractice(USER, ATTEMPT, memory.repository);
    expect(first.summary.unanswered).toBe(4);
    await submitGeneralAcademicPractice(USER, ATTEMPT, memory.repository);
    expect(memory.repository.submit).toHaveBeenCalledTimes(1);
  });

  it("requires ownership for submission and review", async () => {
    memory.set(stored("submitted"));
    await expect(submitGeneralAcademicPractice(OTHER, ATTEMPT, memory.repository)).rejects.toBeInstanceOf(GeneralAcademicPracticeError);
    expect(await getGeneralAcademicPracticeReview(OTHER, ATTEMPT, memory.repository)).toBeNull();
  });
});
