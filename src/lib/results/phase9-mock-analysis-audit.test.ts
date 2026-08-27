import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { PracticeModule } from "@/lib/practice/schemas";
import type { CoreSkillId } from "@/lib/progress/skills";

import { analyzeMockAttempt } from "./mock-analysis";
import type { AttemptResult, ResultQuestion } from "./schemas";

type Profile = "balanced" | "weak_equations" | "weak_figure" | "weak_latin" | "easy_strong_hard_weak" | "fast_inaccurate" | "slow_accurate" | "section_timeout" | "many_unanswered" | "near_tied" | "sparse_curated";
const profiles: Profile[] = ["balanced", "weak_equations", "weak_figure", "weak_latin", "easy_strong_hard_weak", "fast_inaccurate", "slow_accurate", "section_timeout", "many_unanswered", "near_tied", "sparse_curated"];
const modules: PracticeModule[] = ["figure_sequence", "mathematical_equation", "latin_square"];
const skillByModule: Record<PracticeModule, CoreSkillId> = {
  figure_sequence: "figure_boundary_movement",
  mathematical_equation: "equation_scale",
  latin_square: "latin_chained",
};

function outcome(profile: Profile, module: PracticeModule, index: number) {
  let answered = true;
  let correct = index < 15;
  let seconds = 60;
  if (profile === "weak_equations" && module === "mathematical_equation") correct = index < 7;
  if (profile === "weak_figure" && module === "figure_sequence") correct = index < 7;
  if (profile === "weak_latin" && module === "latin_square") correct = index < 7;
  if (profile === "easy_strong_hard_weak") correct = index % 3 !== 2;
  if (profile === "fast_inaccurate") {
    correct = index < 12;
    seconds = correct ? 60 : 20;
  }
  if (profile === "slow_accurate") {
    correct = index < 18;
    seconds = index >= 15 && correct ? 120 : 60;
  }
  if (profile === "section_timeout" && module === "latin_square" && index >= 12) {
    answered = false;
    correct = false;
    seconds = 0;
  }
  if (profile === "many_unanswered" && index >= 14) {
    answered = false;
    correct = false;
    seconds = 0;
  }
  if (profile === "near_tied") correct = index < (module === "latin_square" ? 14 : 15);
  return { answered, correct: answered && correct, seconds };
}

function makeAttempt(profile: Profile, student: number): AttemptResult {
  const questions: ResultQuestion[] = modules.flatMap((module, moduleIndex) => Array.from({ length: 20 }, (_, index) => {
    const state = outcome(profile, module, index);
    return {
      id: `${student}-${module}-${index}`,
      module: "core",
      questionType: module,
      topic: "Core",
      subtopic: null,
      difficulty: (["easy", "medium", "hard"] as const)[index % 3],
      questionText: `Question ${moduleIndex * 20 + index + 1}`,
      passage: null,
      code: null,
      formula: null,
      structuredData: {},
      options: [],
      sectionTitle: module,
      selectedOptionId: state.answered ? "answer" : null,
      correctOptionId: "correct",
      explanation: "Saved explanation",
      responseStatus: state.answered ? "answered" : "unanswered",
      isCorrect: state.correct,
      markedForReview: false,
      isBookmarked: false,
      timeSpentSeconds: state.seconds,
      questionNumber: moduleIndex * 20 + index + 1,
      estimatedTimeSeconds: 75,
      skillIds: profile === "sparse_curated" ? [] : [skillByModule[module]],
    } satisfies ResultQuestion;
  }));
  const correct = questions.filter((question) => question.isCorrect).length;
  const answered = questions.filter((question) => question.responseStatus === "answered").length;
  return {
    id: `10000000-0000-4000-8000-${String(student).padStart(12, "0")}`,
    testTitle: "Core Mock",
    origin: profile === "sparse_curated" ? "curated" : "generated",
    hasImmutableSnapshots: true,
    status: profile === "section_timeout" || profile === "many_unanswered" ? "auto_submitted" : "submitted",
    startedAt: "2026-08-22T00:00:00.000Z",
    submittedAt: "2026-08-22T01:15:00.000Z",
    totalTimeSeconds: questions.reduce((sum, question) => sum + question.timeSpentSeconds, 0),
    score: correct,
    accuracy: correct / 60 * 100,
    correctCount: correct,
    incorrectCount: answered - correct,
    unansweredCount: 60 - answered,
    answeredCount: answered,
    topicBreakdown: [],
    difficultyBreakdown: [],
    questions,
    recommendation: { title: "Review", description: "Review" },
  };
}

describe("Phase 9 deterministic mock-analysis audit", () => {
  it("audits 1,000 varied completed mocks and writes the reproducible report", () => {
    const checks = { section: 0, sectionCorrect: 0, skill: 0, skillCorrect: 0, ranking: 0, rankingCorrect: 0, timing: 0, timingCorrect: 0, insight: 0, insightCorrect: 0, falseInsight: 0, falseInsightCorrect: 0, recommendation: 0, recommendationCorrect: 0 };
    for (let student = 0; student < 1000; student += 1) {
      const profile = profiles[student % profiles.length];
      const attempt = makeAttempt(profile, student + 1);
      const analysis = analyzeMockAttempt(attempt);
      modules.forEach((module) => {
        checks.section += 1;
        const expectedQuestions = attempt.questions.filter((question) => question.questionType === module);
        const expectedCorrect = expectedQuestions.filter((question) => question.isCorrect).length;
        const expectedUnanswered = expectedQuestions.filter((question) => question.responseStatus !== "answered").length;
        const actual = analysis.sections.find((section) => section.module === module);
        if (actual?.correct === expectedCorrect && actual.unanswered === expectedUnanswered && actual.total === 20) checks.sectionCorrect += 1;
      });

      if (profile === "sparse_curated") {
        checks.skill += 1;
        if (!analysis.skillLosses.length) checks.skillCorrect += 1;
      } else {
        const expectedLostMarks = attempt.questions.filter((question) => question.responseStatus === "answered" && !question.isCorrect).length;
        checks.skill += 1;
        const actualLostMarks = analysis.skillLosses.reduce((sum, loss) => sum + loss.weightedMarkLoss, 0);
        if (actualLostMarks === expectedLostMarks) checks.skillCorrect += 1;
      }

      const weakModule = profile === "weak_equations" ? "mathematical_equation" : profile === "weak_figure" ? "figure_sequence" : profile === "weak_latin" ? "latin_square" : null;
      if (weakModule) {
        checks.ranking += 1;
        if (analysis.weakestSection === weakModule && analysis.skillLosses[0]?.module === weakModule) checks.rankingCorrect += 1;
        checks.recommendation += 1;
        if (analysis.recommendations[0]?.module === weakModule && analysis.recommendations[0].questionCount === 10) checks.recommendationCorrect += 1;
      }
      if (profile === "fast_inaccurate") {
        checks.timing += 1;
        if (analysis.questionAnalysis.filter((question) => question.timing === "fast_incorrect").length === 24) checks.timingCorrect += 1;
        checks.insight += 1;
        if (analysis.insights.some((insight) => insight.includes("substantially faster"))) checks.insightCorrect += 1;
        checks.falseInsight += 1;
        if (!JSON.stringify(analysis).match(/careless/i)) checks.falseInsightCorrect += 1;
      }
      if (profile === "section_timeout" || profile === "many_unanswered") {
        checks.insight += 1;
        if (analysis.insights.some((insight) => insight.includes("submitted automatically") && insight.includes("unanswered"))) checks.insightCorrect += 1;
      }
      if (profile === "near_tied") {
        checks.falseInsight += 1;
        if (analysis.strongestSection === null && analysis.weakestSection === null) checks.falseInsightCorrect += 1;
      }
      if (profile === "sparse_curated") {
        checks.falseInsight += 1;
        if (!analysis.skillLosses.length && !analysis.recommendations.length) checks.falseInsightCorrect += 1;
      }
    }

    const benchmarkAttempt = makeAttempt("balanced", 9999);
    const benchmarks = ([1, 10, 100] as const).map((mockCount) => {
      const started = performance.now();
      for (let index = 0; index < mockCount; index += 1) analyzeMockAttempt(benchmarkAttempt);
      return { mockCount, milliseconds: Number((performance.now() - started).toFixed(3)) };
    });
    const report = {
      version: "phase9-mock-analysis-audit@1",
      syntheticMocks: 1000,
      profiles,
      sectionSummaryAccuracy: checks.sectionCorrect / checks.section,
      skillAttributionAccuracy: checks.skillCorrect / checks.skill,
      mistakeRankingAccuracy: checks.rankingCorrect / checks.ranking,
      timingClassificationAccuracy: checks.timingCorrect / checks.timing,
      insightAccuracy: checks.insightCorrect / checks.insight,
      falseInsightAvoidance: checks.falseInsightCorrect / checks.falseInsight,
      falseInsightRate: 1 - checks.falseInsightCorrect / checks.falseInsight,
      recommendationAccuracy: checks.recommendationCorrect / checks.recommendation,
      pureAnalysisBenchmarks: benchmarks,
    };
    const directory = resolve(process.cwd(), "reports", "phase9");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "mock-analysis-audit-1000.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(resolve(directory, "mock-analysis-audit-1000.md"), [
      "# Phase 9 deterministic mock-analysis audit", "", "Audited 1,000 completed Core mocks across eleven declared profiles.", "",
      `- Section-summary correctness: ${(report.sectionSummaryAccuracy * 100).toFixed(1)}%`,
      `- Skill-attribution correctness: ${(report.skillAttributionAccuracy * 100).toFixed(1)}%`,
      `- Mistake-ranking correctness: ${(report.mistakeRankingAccuracy * 100).toFixed(1)}%`,
      `- Timing-classification correctness: ${(report.timingClassificationAccuracy * 100).toFixed(1)}%`,
      `- Insight correctness: ${(report.insightAccuracy * 100).toFixed(1)}%`,
      `- False-insight rate: ${(report.falseInsightRate * 100).toFixed(1)}%`,
      `- Recommendation correctness: ${(report.recommendationAccuracy * 100).toFixed(1)}%`, "",
      "## Pure analysis benchmarks", "", "| Mocks | Milliseconds |", "| ---: | ---: |",
      ...benchmarks.map((row) => `| ${row.mockCount} | ${row.milliseconds} |`), "",
    ].join("\n"), "utf8");

    expect(report.sectionSummaryAccuracy).toBe(1);
    expect(report.skillAttributionAccuracy).toBe(1);
    expect(report.mistakeRankingAccuracy).toBe(1);
    expect(report.timingClassificationAccuracy).toBe(1);
    expect(report.insightAccuracy).toBe(1);
    expect(report.falseInsightRate).toBe(0);
    expect(report.recommendationAccuracy).toBe(1);
  });
});
