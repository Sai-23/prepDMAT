import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, GENERAL_ACADEMIC_MOCK_DURATION_SECONDS, buildGeneralAcademicMockSnapshots, composeGeneralAcademicMock } from "./mock";
import {
  GeneralAcademicMockError,
  getGeneralAcademicMockAttempt,
  getGeneralAcademicMockLanding,
  getGeneralAcademicMockReview,
  saveGeneralAcademicMockState,
  startGeneralAcademicMock,
  submitGeneralAcademicMock,
  type GeneralAcademicMockRepository,
  type StoredGeneralAcademicMockAttempt,
} from "./mock-data";
import type { GeneralAcademicPublishedCandidate } from "./practice";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const USER = "00000000-0000-4000-8000-000000000011";
const OTHER = "00000000-0000-4000-8000-000000000012";
const ATTEMPT = "00000000-0000-4000-8000-000000000201";

function candidate(index: number): GeneralAcademicPublishedCandidate {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8"));
  raw.title = `Pack ${index}`;
  raw.domain = index % 2 ? "engineering" : "economics";
  raw.review = { status: "published", notes: null };
  return { id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, pack: canonicalGeneralAcademicPackSchema.parse(raw) };
}

const inventory = Array.from({ length: 8 }, (_, index) => candidate(index + 1));

function memoryRepository() {
  let attempt: StoredGeneralAcademicMockAttempt | null = null;
  const repository: GeneralAcademicMockRepository = {
    listPublishedPacks: vi.fn().mockResolvedValue(inventory),
    findActive: vi.fn(async (userId) => attempt && attempt.userId === userId && attempt.status === "in_progress" ? attempt : null),
    load: vi.fn(async (userId, attemptId) => attempt && attempt.userId === userId && attempt.id === attemptId ? attempt : null),
    recentPackIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(async (input) => {
      attempt = {
        id: input.id, userId: input.userId, status: "in_progress", submissionReason: null,
        compositionVersion: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, seed: input.seed,
        durationSeconds: GENERAL_ACADEMIC_MOCK_DURATION_SECONDS, packIds: input.packIds,
        questionCount: input.questionCount, currentPackIndex: 0, currentQuestionId: input.currentQuestionId,
        publicSnapshot: input.publicSnapshot, privateSnapshot: input.privateSnapshot,
        correctCount: null, incorrectCount: null, unansweredCount: null, elapsedSeconds: 0,
        startedAt: "2026-09-03T00:00:00.000Z", expiresAt: "2026-09-03T01:30:00.000Z",
        submittedAt: null, lastActivityAt: "2026-09-03T00:00:00.000Z", answers: [],
      };
      return input.id;
    }),
    save: vi.fn(async (_userId, input) => {
      if (!attempt) throw new Error("missing");
      const next = { packId: input.packId, questionId: input.questionId, selectedOption: input.selectedOption, isFlagged: input.isFlagged, responseSeconds: 30, answeredAt: input.selectedOption ? "2026-09-03T00:00:30.000Z" : null };
      attempt.answers = [...attempt.answers.filter((item) => !(item.packId === input.packId && item.questionId === input.questionId)), next];
      attempt.currentPackIndex = input.currentPackIndex;
      attempt.currentQuestionId = input.currentQuestionId;
      return "saved" as const;
    }),
    submit: vi.fn(async () => { if (attempt) { attempt.status = "submitted"; attempt.submissionReason = "manual"; attempt.submittedAt = "2026-09-03T01:00:00.000Z"; attempt.elapsedSeconds = 3600; } }),
  };
  return { repository, get: () => attempt, set: (value: StoredGeneralAcademicMockAttempt | null) => { attempt = value; } };
}

function stored(status: "in_progress" | "submitted" = "in_progress") {
  const composition = composeGeneralAcademicMock(inventory, "stored")!;
  const snapshots = buildGeneralAcademicMockSnapshots(composition);
  return {
    id: ATTEMPT, userId: USER, status, submissionReason: status === "submitted" ? "manual" as const : null,
    compositionVersion: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, seed: "stored",
    durationSeconds: GENERAL_ACADEMIC_MOCK_DURATION_SECONDS, packIds: composition.packs.map((pack) => pack.id),
    questionCount: composition.questionCount, currentPackIndex: 0,
    currentQuestionId: snapshots.publicSnapshot.packs[0].questions[0].id,
    publicSnapshot: snapshots.publicSnapshot, privateSnapshot: snapshots.privateSnapshot,
    correctCount: status === "submitted" ? 0 : null, incorrectCount: status === "submitted" ? 0 : null,
    unansweredCount: status === "submitted" ? composition.questionCount : null, elapsedSeconds: status === "submitted" ? 60 : 0,
    startedAt: "2026-09-03T00:00:00.000Z", expiresAt: "2026-09-03T01:30:00.000Z",
    submittedAt: status === "submitted" ? "2026-09-03T00:01:00.000Z" : null,
    lastActivityAt: "2026-09-03T00:00:00.000Z", answers: [],
  } satisfies StoredGeneralAcademicMockAttempt;
}

describe("General Academic mock persistence boundary", () => {
  let memory = memoryRepository();
  beforeEach(() => { memory = memoryRepository(); });

  it("starts one immutable multi-pack attempt", async () => {
    const attempt = await startGeneralAcademicMock(USER, memory.repository, new Date("2026-09-03T00:00:00.000Z"));
    expect(attempt.packs.length).toBeGreaterThanOrEqual(3);
    expect(memory.repository.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(attempt)).not.toMatch(/correctOption|explanation|privateSnapshot/);
  });

  it("returns an active attempt for duplicate Start", async () => {
    memory.set(stored());
    expect((await startGeneralAcademicMock(USER, memory.repository)).id).toBe(ATTEMPT);
    expect(memory.repository.create).not.toHaveBeenCalled();
  });

  it("creates a new attempt after a completed mock without overwriting history", async () => {
    const previous = stored("submitted");
    memory.set(previous);
    const next = await startGeneralAcademicMock(USER, memory.repository);
    expect(next.id).not.toBe(previous.id);
    expect(memory.repository.create).toHaveBeenCalledTimes(1);
  });

  it("returns a minimal landing summary without source or answers", async () => {
    memory.set(stored());
    const landing = await getGeneralAcademicMockLanding(USER, memory.repository);
    expect(landing.active).toMatchObject({ id: ATTEMPT, packCount: expect.any(Number), questionCount: expect.any(Number) });
    expect(JSON.stringify(landing.active)).not.toMatch(/answer|explanation|snapshot|stimulus/i);
  });

  it("requires sufficient inventory", async () => {
    memory.repository.listPublishedPacks = vi.fn().mockResolvedValue(inventory.slice(0, 2));
    await expect(startGeneralAcademicMock(USER, memory.repository)).rejects.toMatchObject({ code: "NO_CONTENT" });
  });

  it("loads only the owning user's mock", async () => {
    memory.set(stored());
    expect(await getGeneralAcademicMockAttempt(OTHER, ATTEMPT, memory.repository)).toBeNull();
  });

  it("persists an answer, flag and navigation position", async () => {
    memory.set(stored());
    const pack = memory.get()!.publicSnapshot.packs[0];
    await saveGeneralAcademicMockState(USER, { attemptId: ATTEMPT, packId: pack.id, questionId: pack.questions[0].id, selectedOption: "A", isFlagged: true, currentPackIndex: 0, currentQuestionId: pack.questions[1].id }, memory.repository);
    expect(memory.get()?.answers[0]).toMatchObject({ selectedOption: "A", isFlagged: true });
    expect(memory.get()?.currentQuestionId).toBe(pack.questions[1].id);
  });

  it("allows an answer change before submission", async () => {
    memory.set(stored());
    const pack = memory.get()!.publicSnapshot.packs[0];
    const input = { attemptId: ATTEMPT, packId: pack.id, questionId: pack.questions[0].id, selectedOption: "A" as const, isFlagged: false, currentPackIndex: 0, currentQuestionId: pack.questions[0].id };
    await saveGeneralAcademicMockState(USER, input, memory.repository);
    await saveGeneralAcademicMockState(USER, { ...input, selectedOption: "B" }, memory.repository);
    expect(memory.get()?.answers[0].selectedOption).toBe("B");
  });

  it("rejects arbitrary pack, question, option and navigation identities", async () => {
    memory.set(stored());
    const pack = memory.get()!.publicSnapshot.packs[0];
    const base = { attemptId: ATTEMPT, packId: pack.id, questionId: pack.questions[0].id, selectedOption: "A", isFlagged: false, currentPackIndex: 0, currentQuestionId: pack.questions[0].id };
    await expect(saveGeneralAcademicMockState(USER, { ...base, packId: OTHER }, memory.repository)).rejects.toBeInstanceOf(GeneralAcademicMockError);
    await expect(saveGeneralAcademicMockState(USER, { ...base, questionId: "forged" }, memory.repository)).rejects.toBeInstanceOf(GeneralAcademicMockError);
    await expect(saveGeneralAcademicMockState(USER, { ...base, selectedOption: "E" }, memory.repository)).rejects.toBeInstanceOf(GeneralAcademicMockError);
    await expect(saveGeneralAcademicMockState(USER, { ...base, currentPackIndex: 99 }, memory.repository)).rejects.toBeInstanceOf(GeneralAcademicMockError);
  });

  it("does not mutate submitted attempts", async () => {
    memory.set(stored("submitted"));
    const pack = memory.get()!.publicSnapshot.packs[0];
    expect(await saveGeneralAcademicMockState(USER, { attemptId: ATTEMPT, packId: pack.id, questionId: pack.questions[0].id, selectedOption: "A", isFlagged: false, currentPackIndex: 0, currentQuestionId: pack.questions[0].id }, memory.repository)).toBe("submitted");
    expect(memory.repository.save).not.toHaveBeenCalled();
  });

  it("submits early and returns immutable review metrics", async () => {
    memory.set(stored());
    const review = await submitGeneralAcademicMock(USER, ATTEMPT, memory.repository);
    expect(review.attempt.status).toBe("submitted");
    expect(review.summary.total).toBe(memory.get()?.questionCount);
  });

  it("makes repeated submission idempotent", async () => {
    memory.set(stored());
    await submitGeneralAcademicMock(USER, ATTEMPT, memory.repository);
    await submitGeneralAcademicMock(USER, ATTEMPT, memory.repository);
    expect(memory.repository.submit).toHaveBeenCalledTimes(1);
  });

  it("keeps results and review unavailable before submission or across users", async () => {
    memory.set(stored());
    expect(await getGeneralAcademicMockReview(USER, ATTEMPT, memory.repository)).toBeNull();
    memory.set(stored("submitted"));
    expect(await getGeneralAcademicMockReview(OTHER, ATTEMPT, memory.repository)).toBeNull();
  });
});
