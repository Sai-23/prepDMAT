import { describe, expect, it } from "vitest";

import {
  GENERAL_ACADEMIC_WEAK_ACCURACY_PERCENT,
  GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS,
  buildGeneralAcademicLearningAnalytics,
  getGeneralAcademicPracticeRecommendations,
  isWeakGeneralAcademicMetric,
  type GeneralAcademicLearningObservation,
} from "./learning";

function rows({ attempt = "a1", correct = 0, domain = "engineering", incorrect = 0, skill = "table_interpretation", unanswered = 0 }: { attempt?: string; correct?: number; domain?: GeneralAcademicLearningObservation["domain"]; incorrect?: number; skill?: GeneralAcademicLearningObservation["skill"]; unanswered?: number }): GeneralAcademicLearningObservation[] {
  const submittedAt = `2026-09-${attempt.replace(/\D/g, "").padStart(2, "0")}T12:00:00.000Z`;
  return [
    ...Array.from({ length: correct }, () => "correct" as const),
    ...Array.from({ length: incorrect }, () => "incorrect" as const),
    ...Array.from({ length: unanswered }, () => "unanswered" as const),
  ].map((result) => ({ attemptId: attempt, submittedAt, domain, skill, result }));
}

const inventory = { skills: ["table_interpretation", "causal_reasoning"] as const, domains: ["engineering", "economics"] as const };

describe("General Academic cumulative analytics", () => {
  it("derives transparent overall, skill and domain counts", () => {
    const result = buildGeneralAcademicLearningAnalytics([...rows({ correct: 2, incorrect: 1, unanswered: 1 }), ...rows({ attempt: "a2", correct: 1, domain: "economics", skill: "causal_reasoning" })]);
    expect(result).toMatchObject({ completedPacks: 2, attempted: 5, answered: 4, correct: 3, incorrect: 1, unanswered: 1, accuracy: 60 });
    expect(result.skills.find((item) => item.skill === "table_interpretation")).toMatchObject({ attempted: 4, correct: 2, incorrect: 1, unanswered: 1, accuracy: 50 });
    expect(result.domains.find((item) => item.domain === "economics")).toMatchObject({ attempted: 1, correct: 1, accuracy: 100 });
  });

  it("counts each submitted retake as a completed pack without overwriting history", () => {
    const result = buildGeneralAcademicLearningAnalytics([...rows({ attempt: "a1", correct: 1 }), ...rows({ attempt: "a2", incorrect: 1 }), ...rows({ attempt: "a3", correct: 1 })]);
    expect(result.completedPacks).toBe(3);
    expect(result.attempted).toBe(3);
  });

  it("uses exactly the latest five attempts for recent accuracy", () => {
    const result = buildGeneralAcademicLearningAnalytics([...rows({ attempt: "a1", correct: 1 }), ...rows({ attempt: "a2", correct: 1 }), ...rows({ attempt: "a3", correct: 1 }), ...rows({ attempt: "a4", correct: 1 }), ...rows({ attempt: "a5", correct: 1 }), ...rows({ attempt: "a6", incorrect: 1 })]);
    expect(result.recentAccuracy).toBe(80);
  });

  it("never labels fewer than three questions as weak", () => {
    expect(GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS).toBe(3);
    expect(isWeakGeneralAcademicMetric({ attempted: 2, answered: 2, correct: 0, incorrect: 2, unanswered: 0, accuracy: 0 })).toBe(false);
  });

  it("uses the documented below-70-percent weak rule at sufficient sample size", () => {
    expect(GENERAL_ACADEMIC_WEAK_ACCURACY_PERCENT).toBe(70);
    expect(isWeakGeneralAcademicMetric({ attempted: 3, answered: 3, correct: 2, incorrect: 1, unanswered: 0, accuracy: 66.67 })).toBe(true);
    expect(isWeakGeneralAcademicMetric({ attempted: 10, answered: 10, correct: 7, incorrect: 3, unanswered: 0, accuracy: 70 })).toBe(false);
  });
});

describe("General Academic deterministic recommendations", () => {
  const weak = buildGeneralAcademicLearningAnalytics(rows({ correct: 1, incorrect: 3 }));

  it("is deterministic for identical inputs", () => {
    const mistakes = [{ skill: "table_interpretation" as const, count: 3, lastMissedAt: "2026-09-03T12:00:00.000Z" }];
    expect(getGeneralAcademicPracticeRecommendations(weak, inventory, mistakes)).toEqual(getGeneralAcademicPracticeRecommendations(weak, inventory, mistakes));
  });

  it("prioritizes active mistakes in an eligible weak skill", () => {
    const result = getGeneralAcademicPracticeRecommendations(weak, inventory, [{ skill: "table_interpretation", count: 3, lastMissedAt: "2026-09-03T12:00:00.000Z" }]);
    expect(result[0]).toMatchObject({ type: "skill", target: "table_interpretation", priority: 1 });
    expect(result[0].reason).toContain("3 active mistakes");
  });

  it("recommends an eligible weak skill without an active mistake", () => {
    expect(getGeneralAcademicPracticeRecommendations(weak, inventory, [])[0]).toMatchObject({ type: "skill", target: "table_interpretation", priority: 2 });
  });

  it("can recommend a weak domain after exhausted weak-skill availability", () => {
    const result = getGeneralAcademicPracticeRecommendations(weak, { skills: ["causal_reasoning"], domains: ["engineering"] }, []);
    expect(result[0]).toMatchObject({ type: "domain", target: "engineering", priority: 3 });
  });

  it("recommends an available unpractised skill before an unpractised domain", () => {
    const result = getGeneralAcademicPracticeRecommendations(weak, inventory, []);
    expect(result.find((item) => item.target === "causal_reasoning")).toMatchObject({ priority: 4 });
  });

  it("never recommends unavailable or archived-only inventory", () => {
    const result = getGeneralAcademicPracticeRecommendations(weak, { skills: [], domains: [] }, []);
    expect(result).toEqual([{ type: "mixed", target: null, reason: "Continue with another published source pack", priority: 6, href: "/practice/general-academic" }]);
  });

  it("gives a no-data student a current-inventory discovery recommendation", () => {
    const empty = buildGeneralAcademicLearningAnalytics([]);
    expect(getGeneralAcademicPracticeRecommendations(empty, inventory, [])[0]).toMatchObject({ type: "skill", target: "table_interpretation", priority: 4 });
  });

  it("routes skill and domain recommendations into the Phase 5 selector", () => {
    const result = getGeneralAcademicPracticeRecommendations(weak, inventory, []);
    expect(result.every((item) => item.href.startsWith("/practice/general-academic"))).toBe(true);
    expect(result.find((item) => item.type === "skill")?.href).toContain("?skill=");
  });
});
