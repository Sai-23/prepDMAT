import { describe, expect, it } from "vitest";

import { allowedGeneralAcademicTransitions, canTransitionGeneralAcademicPack, generalAcademicReviewChecklistSchema } from "./lifecycle";

describe("General Academic lifecycle policy", () => {
  it.each([
    ["draft", "needs_review"], ["needs_review", "draft"], ["needs_review", "approved"],
    ["needs_review", "rejected"], ["approved", "needs_review"], ["approved", "published"],
    ["rejected", "draft"], ["published", "archived"],
  ] as const)("allows %s → %s", (from, to) => expect(canTransitionGeneralAcademicPack(from, to)).toBe(true));

  it.each([
    ["draft", "published"], ["draft", "approved"], ["archived", "published"], ["published", "draft"],
  ] as const)("blocks %s → %s", (from, to) => expect(canTransitionGeneralAcademicPack(from, to)).toBe(false));

  it("requires every approval checklist confirmation", () => {
    expect(generalAcademicReviewChecklistSchema.safeParse({}).success).toBe(false);
    expect(generalAcademicReviewChecklistSchema.safeParse({ stimulusCoherent: true, keyedAnswers: true, questionsAnswerable: true, explanations: true, ambiguity: true, difficulty: true, representations: true }).success).toBe(true);
  });

  it("exposes no transition out of archived", () => expect(allowedGeneralAcademicTransitions("archived")).toEqual([]));
});
