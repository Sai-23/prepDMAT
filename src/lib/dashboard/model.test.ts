import { describe, expect, it } from "vitest";

import { buildCoreProgress, type ProgressObservation } from "@/lib/progress/model";

import {
  assembleStudentDashboard,
  type AssembleStudentDashboardInput,
  type DashboardActivity,
  type DashboardResumeCandidate,
} from "./model";

const NOW = new Date("2026-08-22T12:00:00.000Z");

function observations(
  count: number,
  options: {
    correct?: (index: number) => boolean;
    module?: ProgressObservation["module"];
    skill?: ProgressObservation["skills"][number];
  } = {},
): ProgressObservation[] {
  const questionModule = options.module ?? "mathematical_equation";
  const skill = options.skill ?? "equation_scale";
  return Array.from({ length: count }, (_, index) => ({
    id: `answer-${questionModule}-${index}`,
    sessionId: `session-${questionModule}-${Math.floor(index / 5)}`,
    module: questionModule,
    difficulty: "medium",
    source: "practice",
    correct: options.correct?.(index) ?? true,
    responseTimeSeconds: 55,
    expectedTimeSeconds: 60,
    answeredAt: new Date(Date.UTC(2026, 7, 1 + Math.floor(index / 5), 9, index)).toISOString(),
    skills: [skill],
  }));
}

function activity(overrides: Partial<DashboardActivity> = {}): DashboardActivity {
  return {
    id: "practice-1",
    type: "practice",
    title: "Mathematical Equations practice",
    subtitle: "Medium · Untimed",
    completedAt: "2026-08-21T10:00:00.000Z",
    href: "/practice/review/practice-1",
    correctCount: 4,
    questionCount: 5,
    accuracy: 80,
    ...overrides,
  };
}

function baseInput(overrides: Partial<AssembleStudentDashboardInput> = {}): AssembleStudentDashboardInput {
  return {
    displayName: "Student",
    targetExamDate: null,
    onDemandMocksEnabled: true,
    mockAvailable: true,
    resumeCandidates: [],
    progress: buildCoreProgress([], NOW),
    recentActivity: [],
    latestPractice: null,
    latestMock: null,
    now: NOW,
    ...overrides,
  };
}

function practiceResume(timingMode: "timed" | "untimed" = "untimed"): DashboardResumeCandidate {
  return {
    kind: "practice",
    id: `practice-${timingMode}`,
    title: "Mathematical Equations practice",
    description: `4 of 10 answered · ${timingMode}`,
    href: "/practice",
    timingMode,
    startedAt: "2026-08-22T10:00:00.000Z",
    expiresAt: timingMode === "timed" ? "2026-08-22T13:00:00.000Z" : null,
  };
}

function mockResume(expiresAt = "2026-08-22T13:00:00.000Z"): DashboardResumeCandidate {
  return {
    kind: "mock",
    id: "mock-active",
    title: "Core Mock 1",
    description: "Continue from Mathematical Equations.",
    href: "/tests/mock-1/take?attempt=mock-active",
    startedAt: "2026-08-22T09:00:00.000Z",
    expiresAt,
  };
}

describe("Phase 10 dashboard action policy", () => {
  it("gives a brand-new student an honest practice fallback", () => {
    const dashboard = assembleStudentDashboard(baseInput());
    expect(dashboard.primaryAction.kind).toBe("start_practice");
    expect(dashboard.primaryAction.title).toBe("Start your first Core practice");
    expect(dashboard.progress?.totalQuestions).toBe(0);
  });

  it("encourages more evidence after one completed practice", () => {
    const progress = buildCoreProgress(observations(1), NOW);
    const dashboard = assembleStudentDashboard(
      baseInput({ progress, recentActivity: [activity()] }),
    );
    expect(dashboard.primaryAction.kind).toBe("build_baseline");
  });

  it("uses evidence-aware Phase 8 language for an early learner", () => {
    const progress = buildCoreProgress(observations(4, { correct: () => false }), NOW);
    const dashboard = assembleStudentDashboard(baseInput({ progress }));
    expect(dashboard.primaryAction.kind).toBe("progress_recommendation");
    expect(dashboard.primaryAction.description).toContain("early pattern");
  });

  it("uses the Phase 8 weak-area recommendation for established evidence", () => {
    const progress = buildCoreProgress(observations(12, { correct: () => false }), NOW);
    const dashboard = assembleStudentDashboard(baseInput({ progress }));
    expect(dashboard.primaryAction).toMatchObject({
      kind: "progress_recommendation",
      title: "Scale relationships",
      label: "Practice Scale relationships",
    });
    expect(dashboard.primaryAction.description).toContain("enough evidence");
    expect(dashboard.primaryAction.href).toContain("focusName=Scale+relationships");
    expect(dashboard.primaryAction.href).not.toContain("equation_scale");
  });

  it("suggests a mock to a strong balanced learner without a weak-area recommendation", () => {
    const progress = buildCoreProgress([
      ...observations(12, { module: "figure_sequence", skill: "figure_rotation" }),
      ...observations(12),
      ...observations(12, { module: "latin_square", skill: "latin_chained" }),
    ], NOW);
    const dashboard = assembleStudentDashboard(baseInput({ progress }));
    expect(progress.recommendations).toHaveLength(0);
    expect(dashboard.primaryAction.kind).toBe("take_mock");
  });

  it("makes active untimed practice dominate an ordinary recommendation", () => {
    const progress = buildCoreProgress(observations(12, { correct: () => false }), NOW);
    const dashboard = assembleStudentDashboard(
      baseInput({ progress, resumeCandidates: [practiceResume()] }),
    );
    expect(dashboard.primaryAction.kind).toBe("resume_practice");
    expect(dashboard.supportingAction?.kind).toBe("progress_recommendation");
  });

  it("makes active timed practice dominate untimed practice", () => {
    const dashboard = assembleStudentDashboard(
      baseInput({ resumeCandidates: [practiceResume("untimed"), practiceResume("timed")] }),
    );
    expect(dashboard.primaryAction.href).toBe("/practice");
    expect(dashboard.primaryAction.description).toContain("timed");
    expect(dashboard.primaryAction.kind).toBe("resume_practice");
  });

  it("makes a live mock dominate every practice resume state", () => {
    const dashboard = assembleStudentDashboard(
      baseInput({ resumeCandidates: [practiceResume("timed"), mockResume(), practiceResume()] }),
    );
    expect(dashboard.primaryAction.kind).toBe("resume_mock");
    expect(dashboard.primaryAction.href).toContain("attempt=mock-active");
  });

  it("does not offer an expired activity as resumable", () => {
    const dashboard = assembleStudentDashboard(
      baseInput({ resumeCandidates: [mockResume("2026-08-22T11:59:59.000Z")] }),
    );
    expect(dashboard.primaryAction.kind).toBe("start_practice");
  });

  it("follows up when the latest significant activity is a completed mock", () => {
    const latestMock = {
      attemptId: "mock-complete",
      title: "Core Mock 2",
      correctCount: 43,
      questionCount: 60,
      accuracy: 71.67,
      completedAt: "2026-08-22T11:00:00.000Z",
      href: "/results?attempt=mock-complete",
    };
    const dashboard = assembleStudentDashboard(
      baseInput({
        recentActivity: [activity({ id: "mock-complete", type: "mock", completedAt: latestMock.completedAt })],
        latestMock,
      }),
    );
    expect(dashboard.primaryAction.kind).toBe("review_mock");
    expect(dashboard.primaryAction.description).toContain("43 / 60");
  });

  it("does not show a dead mock action when no mock is available", () => {
    const progress = buildCoreProgress(observations(12), NOW);
    const dashboard = assembleStudentDashboard(
      baseInput({ progress, mockAvailable: false, onDemandMocksEnabled: false }),
    );
    expect(dashboard.quickActions.some((action) => action.key === "mock")).toBe(false);
    expect(dashboard.primaryAction.kind).toBe("continue_practice");
  });

  it("allows curated mocks while on-demand generation is disabled", () => {
    const dashboard = assembleStudentDashboard(
      baseInput({ onDemandMocksEnabled: false, mockAvailable: true }),
    );
    expect(dashboard.quickActions.some((action) => action.key === "mock")).toBe(true);
    expect(dashboard.quickActions.find((action) => action.key === "mock")?.label).toBe("Take a Core Mock");
  });

  it("degrades a progress failure to a general action without losing activity", () => {
    const recent = activity();
    const dashboard = assembleStudentDashboard(
      baseInput({ progress: null, progressUnavailable: true, recentActivity: [recent] }),
    );
    expect(dashboard.progress).toBeNull();
    expect(dashboard.progressUnavailable).toBe(true);
    expect(dashboard.recentActivity).toEqual([recent]);
    expect(dashboard.primaryAction.kind).toBe("start_practice");
  });

  it("normalizes, sorts, and bounds mixed recent activity", () => {
    const activities = Array.from({ length: 8 }, (_, index) =>
      activity({
        id: `activity-${index}`,
        type: index % 2 ? "mock" : "practice",
        completedAt: new Date(Date.UTC(2026, 7, 1 + index)).toISOString(),
      }),
    );
    const dashboard = assembleStudentDashboard(baseInput({ recentActivity: activities }));
    expect(dashboard.recentActivity).toHaveLength(5);
    expect(dashboard.recentActivity.map((item) => item.id)).toEqual([
      "activity-7",
      "activity-6",
      "activity-5",
      "activity-4",
      "activity-3",
    ]);
  });

  it("copies Phase 8 module metrics without alternative calculations", () => {
    const progress = buildCoreProgress(observations(9, { correct: (index) => index < 6 }), NOW);
    const dashboard = assembleStudentDashboard(baseInput({ progress }));
    progress.modules.forEach((sourceModule) => {
      expect(dashboard.progress?.modules.find((item) => item.module === sourceModule.module)).toEqual({
        module: sourceModule.module,
        label: sourceModule.label,
        attemptCount: sourceModule.attemptCount,
        recentAccuracy: sourceModule.recentAccuracy,
        trend: sourceModule.trend,
        confidence: sourceModule.confidence,
      });
    });
  });
});
