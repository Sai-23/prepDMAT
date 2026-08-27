import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { StructuralProfile } from "@/lib/generation/novelty";
import type { GenerationDifficulty } from "@/lib/generation/types";
import { assembleCoreMock, type CoreMockQuestion } from "@/lib/mocks/core-mock";
import { createPracticeSnapshots } from "@/lib/practice/native";
import type { PracticeModule } from "@/lib/practice/schemas";
import { mapQuestionToSkills } from "@/lib/progress/skills";

import { analyzeMockAttempt } from "./mock-analysis";
import type { AttemptResult, ResultQuestion } from "./schemas";

const enabled = process.env.RUN_PHASE9_REAL_AUDIT === "1";
const auditIt = enabled ? it : it.skip;
const totalMocks = Number(process.env.PHASE9_REAL_AUDIT_TOTAL ?? "100");
const shardCount = Number(process.env.PHASE9_REAL_AUDIT_SHARD_COUNT ?? "1");
const shardIndex = Number(process.env.PHASE9_REAL_AUDIT_SHARD_INDEX ?? "0");
type Profile = "balanced" | "weak_figure" | "weak_equations" | "weak_latin" | "fast_inaccurate";
const profiles: Profile[] = ["balanced", "weak_figure", "weak_equations", "weak_latin", "fast_inaccurate"];

function storedStructuredData(question: CoreMockQuestion): Record<string, unknown> {
  const base = { schemaVersion: 1, task: question.structuredData, presentation: question.presentation, response: question.response };
  if (question.questionType === "figure_sequence") return { ...base, sequence: question.sequence, solutionFrames: question.solutionFrames };
  if (question.questionType === "mathematical_equation") return { ...base, solutionPath: question.solutionPath, reasoningPath: question.reasoningPath, fastestMethod: question.fastestMethod };
  return { ...base, deductionTrace: question.deductionTrace };
}

function traceFor(question: CoreMockQuestion) {
  if (question.questionType === "figure_sequence") return { rules: question.structuredData.rules };
  if (question.questionType === "mathematical_equation") return question.solutionPath;
  return question.deductionTrace;
}

function responseState(profile: Profile, module: PracticeModule, index: number) {
  const weak = profile === "weak_figure" ? "figure_sequence" : profile === "weak_equations" ? "mathematical_equation" : profile === "weak_latin" ? "latin_square" : null;
  const correctLimit = profile === "fast_inaccurate" ? 12 : weak === module ? 7 : 15;
  const correct = index < correctLimit;
  return { correct, seconds: profile === "fast_inaccurate" && !correct ? 20 : 60 };
}

function resultQuestion(question: CoreMockQuestion, profile: Profile, module: PracticeModule, difficulty: GenerationDifficulty, profileData: StructuralProfile, questionNumber: number, id: string): ResultQuestion {
  const snapshot = createPracticeSnapshots({
    id,
    module: "core",
    questionType: question.questionType,
    topic: question.topic,
    subtopic: question.subtopic ?? null,
    difficulty,
    questionText: question.presentation.prompt,
    passage: null,
    code: null,
    formula: null,
    tableData: null,
    imageUrl: null,
    estimatedTimeSeconds: question.estimatedSolveTimeSeconds,
    structuredData: storedStructuredData(question),
    metadata: { generation: question.metadata, validation: question.validation, correctAnswer: question.correctAnswer },
    explanation: question.explanation,
    options: [],
    correctOptionId: null,
    sourceType: "generated",
  });
  const state = responseState(profile, module, (questionNumber - 1) % 20);
  return {
    ...snapshot.publicQuestion,
    sectionTitle: module,
    selectedOptionId: state.correct ? "correct" : "incorrect",
    correctOptionId: "correct",
    explanation: snapshot.privateSnapshot.explanation,
    responseStatus: "answered",
    isCorrect: state.correct,
    markedForReview: false,
    isBookmarked: false,
    timeSpentSeconds: state.seconds,
    correctAnswer: snapshot.privateSnapshot.correctAnswer,
    explanationTrace: snapshot.privateSnapshot.explanationTrace,
    educationalExplanation: snapshot.privateSnapshot.educationalExplanation,
    questionNumber,
    estimatedTimeSeconds: question.estimatedSolveTimeSeconds,
    skillIds: mapQuestionToSkills({ module, structuralProfile: profileData, publicSnapshot: snapshot.publicQuestion, explanationTrace: traceFor(question) }),
  };
}

describe("Phase 9 real generated mock audit", () => {
  auditIt("generates and analyzes its real Core mock shard", () => {
    const report = {
      version: "phase9-real-generated-mock-audit-shard@1",
      shardIndex,
      shardCount,
      requestedMocks: 0,
      generatedMocks: 0,
      generatedQuestions: 0,
      questionsWithSkillMetadata: 0,
      sectionChecks: 0,
      sectionChecksPassing: 0,
      rankingChecks: 0,
      rankingChecksPassing: 0,
      timingChecks: 0,
      timingChecksPassing: 0,
      falseInsightChecks: 0,
      falseInsightChecksPassing: 0,
      recommendationChecks: 0,
      recommendationChecksPassing: 0,
      failures: [] as string[],
    };
    for (let mockIndex = shardIndex; mockIndex < totalMocks; mockIndex += shardCount) {
      report.requestedMocks += 1;
      const profile = profiles[mockIndex % profiles.length];
      try {
        const mock = assembleCoreMock({ mockSeed: `phase9-real-analysis-${String(mockIndex + 1).padStart(3, "0")}`, createdAt: "2026-08-22T00:00:00.000Z" });
        const questions = mock.sections.flatMap((section, sectionIndex) => section.questions.map((item, index) => resultQuestion(item.question, profile, section.sectionType, item.difficulty, item.structuralProfile, sectionIndex * 20 + index + 1, item.id)));
        const correct = questions.filter((question) => question.isCorrect).length;
        const attempt: AttemptResult = {
          id: `20000000-0000-4000-8000-${String(mockIndex + 1).padStart(12, "0")}`,
          testTitle: "Generated Core Mock",
          origin: "generated",
          hasImmutableSnapshots: true,
          status: "submitted",
          startedAt: "2026-08-22T00:00:00.000Z",
          submittedAt: "2026-08-22T01:15:00.000Z",
          totalTimeSeconds: questions.reduce((sum, question) => sum + question.timeSpentSeconds, 0),
          score: correct,
          accuracy: correct / questions.length * 100,
          correctCount: correct,
          incorrectCount: questions.length - correct,
          unansweredCount: 0,
          answeredCount: questions.length,
          topicBreakdown: [],
          difficultyBreakdown: [],
          questions,
          recommendation: { title: "Review", description: "Review" },
        };
        const analysis = analyzeMockAttempt(attempt);
        report.generatedMocks += 1;
        report.generatedQuestions += questions.length;
        report.questionsWithSkillMetadata += questions.filter((question) => question.skillIds?.length).length;
        analysis.sections.forEach((section) => {
          report.sectionChecks += 1;
          const expected = questions.filter((question) => question.questionType === section.module && question.isCorrect).length;
          if (section.total === 20 && section.correct === expected && section.unanswered === 0) report.sectionChecksPassing += 1;
        });
        const weakModule = profile === "weak_figure" ? "figure_sequence" : profile === "weak_equations" ? "mathematical_equation" : profile === "weak_latin" ? "latin_square" : null;
        if (weakModule) {
          report.rankingChecks += 1;
          if (analysis.weakestSection === weakModule) report.rankingChecksPassing += 1;
          report.recommendationChecks += 1;
          if (analysis.recommendations[0]?.module === weakModule) report.recommendationChecksPassing += 1;
        }
        if (profile === "fast_inaccurate") {
          report.timingChecks += 1;
          if (analysis.questionAnalysis.filter((question) => question.timing === "fast_incorrect").length === 24) report.timingChecksPassing += 1;
        }
        if (profile === "balanced") {
          report.falseInsightChecks += 1;
          if (analysis.strongestSection === null && analysis.weakestSection === null) report.falseInsightChecksPassing += 1;
        }
      } catch (error) {
        report.failures.push(error instanceof Error ? error.message : String(error));
      }
      if (report.requestedMocks % 5 === 0) console.info(`Phase 9 real audit shard ${shardIndex + 1}/${shardCount}: ${report.requestedMocks} complete`);
    }
    const directory = resolve(process.cwd(), "reports", "phase9", "real-shards");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, `shard-${shardIndex}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");

    expect(report.failures).toHaveLength(0);
    expect(report.generatedMocks).toBe(report.requestedMocks);
    expect(report.sectionChecksPassing).toBe(report.sectionChecks);
    expect(report.rankingChecksPassing).toBe(report.rankingChecks);
    expect(report.timingChecksPassing).toBe(report.timingChecks);
    expect(report.falseInsightChecksPassing).toBe(report.falseInsightChecks);
    expect(report.recommendationChecksPassing).toBe(report.recommendationChecks);
  }, 600_000);
});
