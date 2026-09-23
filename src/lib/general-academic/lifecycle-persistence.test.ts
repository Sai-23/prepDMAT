import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { transitionGeneralAcademicPack, type GeneralAcademicLifecycleRepository } from "./lifecycle-persistence";
import type { GeneralAcademicReviewStatus } from "./lifecycle";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const STUDENT_ID = "00000000-0000-4000-8000-000000000020";
const PACK_ID = "00000000-0000-4000-8000-000000000030";
const checklist = { stimulusCoherent: true, keyedAnswers: true, questionsAnswerable: true, explanations: true, ambiguity: true, difficulty: true, representations: true } as const;

function fixture(): CanonicalGeneralAcademicPack {
  return canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));
}

function memory(initial: GeneralAcademicReviewStatus = "draft") {
  const pack = fixture();
  pack.review.status = initial;
  const transitions: Array<{ actorId: string; expectedFrom: GeneralAcademicReviewStatus; to: GeneralAcademicReviewStatus; notes: string | null }> = [];
  const repository: GeneralAcademicLifecycleRepository = {
    isAdmin: vi.fn(async (id) => id === ADMIN_ID),
    loadPack: vi.fn(async () => ({ id: PACK_ID, pack, contentFingerprint: "fingerprint", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", lifecycle: { reviewedBy: null, reviewedAt: null, approvedBy: null, approvedAt: null, publishedBy: null, publishedAt: null } })),
    transition: vi.fn(async (input) => { transitions.push(input); pack.review.status = input.to; }),
    findPublishedDuplicates: vi.fn(async () => ["Published duplicate"]),
  };
  return { repository, transitions, pack };
}

describe("General Academic secure lifecycle service", () => {
  let state: ReturnType<typeof memory>;
  beforeEach(() => { state = memory(); });

  it("rejects a non-admin before loading or mutation", async () => {
    await expect(transitionGeneralAcademicPack(PACK_ID, "needs_review", {}, STUDENT_ID, state.repository)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(state.repository.loadPack).not.toHaveBeenCalled();
    expect(state.repository.transition).not.toHaveBeenCalled();
  });

  it("loads current state and permits draft submission after server quality evaluation", async () => {
    await transitionGeneralAcademicPack(PACK_ID, "needs_review", {}, ADMIN_ID, state.repository);
    expect(state.repository.loadPack).toHaveBeenCalledWith(PACK_ID, ADMIN_ID);
    expect(state.transitions[0]).toMatchObject({ actorId: ADMIN_ID, expectedFrom: "draft", to: "needs_review" });
  });

  it("blocks forged direct draft publication", async () => {
    await expect(transitionGeneralAcademicPack(PACK_ID, "published", {}, ADMIN_ID, state.repository)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(state.repository.transition).not.toHaveBeenCalled();
  });

  it("blocks approval until the complete checklist is server-validated", async () => {
    state = memory("needs_review");
    await expect(transitionGeneralAcademicPack(PACK_ID, "approved", { checklist: {} }, ADMIN_ID, state.repository)).rejects.toMatchObject({ code: "CHECKLIST_REQUIRED" });
    await expect(transitionGeneralAcademicPack(PACK_ID, "approved", { checklist }, ADMIN_ID, state.repository)).resolves.toMatchObject({ to: "approved" });
  });

  it("requires and safely passes a rejection reason", async () => {
    state = memory("needs_review");
    await expect(transitionGeneralAcademicPack(PACK_ID, "rejected", { notes: "  " }, ADMIN_ID, state.repository)).rejects.toMatchObject({ code: "REJECTION_REASON_REQUIRED" });
    await transitionGeneralAcademicPack(PACK_ID, "rejected", { notes: "Ambiguous keyed answer" }, ADMIN_ID, state.repository);
    expect(state.transitions[0].notes).toBe("Ambiguous keyed answer");
  });

  it("reruns quality and blocks publication when content has a new deterministic mismatch", async () => {
    state = memory("approved");
    state.pack.questions[0].validation = { answerType: "numeric", expectedValue: 999, tolerance: 0 };
    await expect(transitionGeneralAcademicPack(PACK_ID, "published", {}, ADMIN_ID, state.repository)).rejects.toMatchObject({ code: "QUALITY_BLOCKED" });
    expect(state.repository.transition).not.toHaveBeenCalled();
  });

  it("allows warnings and reports exact published duplicates without overwriting", async () => {
    state = memory("approved");
    state.pack.questions = state.pack.questions.map((question, index) => ({ ...question, correctOption: "A", validation: { answerType: "manual" }, id: `q${index + 1}`, order: index + 1 }));
    const result = await transitionGeneralAcademicPack(PACK_ID, "published", {}, ADMIN_ID, state.repository);
    expect(result.quality.warnings.length).toBeGreaterThan(0);
    expect(result.duplicateTitles).toEqual(["Published duplicate"]);
    expect(state.transitions[0].to).toBe("published");
  });

  it("allows published → archived and blocks archived → published", async () => {
    state = memory("published");
    await expect(transitionGeneralAcademicPack(PACK_ID, "archived", {}, ADMIN_ID, state.repository)).resolves.toMatchObject({ to: "archived" });
    await expect(transitionGeneralAcademicPack(PACK_ID, "published", {}, ADMIN_ID, state.repository)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
});
