import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { DmatCoreSectionType } from "../protocol";
import type { GenerationDifficulty } from "../generation/types";
import {
  canonicalRenderedMatrix,
  figureSequenceValidator,
} from "../generation/figure-sequences";
import {
  inspectMathematicalEquationStyle,
  inspectPublicEquationPresentation,
  mathematicalEquationValidator,
} from "../generation/mathematical-equations";
import {
  assembleCoreMock,
  calculateCoreMockQuestionSimilarity,
  coreMockDeterministicSnapshot,
  type CoreMockQuestionItem,
} from "./core-mock";

const enabled = process.env.RUN_CORE_MOCK_AUDIT === "1";
const auditIt = enabled ? it : it.skip;
const totalMocks = Number(process.env.CORE_MOCK_AUDIT_TOTAL ?? "1000");
const shardCount = Number(process.env.CORE_MOCK_AUDIT_SHARD_COUNT ?? "1");
const shardIndex = Number(process.env.CORE_MOCK_AUDIT_SHARD_INDEX ?? "0");

type Counts = Record<string, number>;
type Coverage = Record<DmatCoreSectionType, Record<string, Counts>>;

function increment(counts: Counts, key: string, amount = 1): void {
  counts[key] = (counts[key] ?? 0) + amount;
}

function average(values: readonly number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function rounded(value: number, places = 6): number {
  return Number(value.toFixed(places));
}

function maximumTargetRun(values: readonly GenerationDifficulty[], target: GenerationDifficulty): number {
  let maximum = 0;
  let current = 0;
  values.forEach((value) => {
    current = value === target ? current + 1 : 0;
    maximum = Math.max(maximum, current);
  });
  return maximum;
}

function answerIntegrity(item: CoreMockQuestionItem): boolean {
  const question = item.question;
  if (question.questionType === "figure_sequence") {
    return question.response.kind === "two_stage_single_choice" && question.correctAnswer.length === 2;
  }
  if (question.questionType === "mathematical_equation") {
    return question.response.kind === "symbol_assignment" &&
      question.response.symbols.every((symbol) => Number.isInteger(question.correctAnswer[symbol]));
  }
  return question.response.kind === "single_choice" &&
    question.response.options.some((option) => option.id === question.correctAnswer);
}

function strictIntegrityFailures(item: CoreMockQuestionItem): number {
  const question = item.question;
  if (question.questionType === "mathematical_equation") {
    const style = inspectMathematicalEquationStyle(question);
    const publicPresentation = inspectPublicEquationPresentation(
      question.presentation.blocks,
      question.structuredData.equations,
    );
    const validation = mathematicalEquationValidator.validate(question, item.difficulty);
    return Number(!validation.valid) +
      Number(style.visibleConstants.some((value) => value < 1 || value > 20)) +
      Number(!publicPresentation.validFormulaShape) +
      Number(publicPresentation.visibleConstants.some((value) => value < 1 || value > 20));
  }
  if (question.questionType === "figure_sequence") {
    const validation = figureSequenceValidator.validate(question, item.difficulty);
    const renderedFailures = question.sequence.missingMatrices.filter((matrix) =>
      new Set(matrix.candidates.map((candidate) =>
        canonicalRenderedMatrix(candidate.frame))).size !== 3).length;
    return Number(!validation.valid) + renderedFailures;
  }
  return 0;
}

function pairwise(sectionType: DmatCoreSectionType, items: readonly CoreMockQuestionItem[]) {
  const similarities: number[] = [];
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      similarities.push(calculateCoreMockQuestionSimilarity(
        sectionType,
        items[first].structuralProfile,
        items[second].structuralProfile,
      ));
    }
  }
  return {
    maximum: rounded(Math.max(0, ...similarities)),
    mean: rounded(average(similarities)),
    pairsAbove090: similarities.filter((value) => value > 0.9).length,
    pairsAbove085: similarities.filter((value) => value > 0.85).length,
    pairsAbove080: similarities.filter((value) => value > 0.8).length,
  };
}

function newCoverage(): Coverage {
  return {
    figure_sequence: {
      movementFamily: {}, objectCount: {}, progressiveRuleFrequency: {}, rotationFrequency: {},
      colourFrequency: {}, boundaryBehavior: {}, periodicityRange: {}, structuralFamily: {},
    },
    mathematical_equation: {
      graph: {}, relationship: {}, variableCount: {}, targetDepth: {}, arithmeticCostBand: {},
      visibleConstantBand: {}, scaleDivisionCoverage: {}, structuralFamily: {},
    },
    latin_square: {
      reasoningFamily: {}, targetDepth: {}, intermediateCellCount: {}, deductionType: {},
      clueRedundancyBand: {}, fullGridUniqueness: {}, structuralFamily: {},
    },
  };
}

function band(value: number, boundaries: readonly number[]): string {
  const boundary = boundaries.find((item) => value <= item);
  return boundary === undefined ? `>${boundaries.at(-1)}` : `<=${boundary}`;
}

function collectCoverage(coverage: Coverage, sectionType: DmatCoreSectionType, item: CoreMockQuestionItem): void {
  const features = item.diagnostics.features;
  increment(coverage[sectionType].structuralFamily, item.diagnostics.family);
  if (sectionType === "figure_sequence") {
    const movements = features.movementKinds;
    (Array.isArray(movements) ? movements : ["unknown"]).forEach((value) => increment(coverage.figure_sequence.movementFamily, String(value)));
    increment(coverage.figure_sequence.objectCount, String(features.objectCount));
    increment(coverage.figure_sequence.progressiveRuleFrequency, Number(features.progressiveRuleCount) > 0 ? "present" : "absent");
    increment(coverage.figure_sequence.rotationFrequency, Number(features.rotationRuleCount) > 0 ? "present" : "absent");
    increment(coverage.figure_sequence.colourFrequency, Number(features.colourRuleCount) > 0 ? "present" : "absent");
    increment(coverage.figure_sequence.boundaryBehavior, Number(features.boundaryInteractionCount) > 0 ? "interaction" : "none");
    increment(coverage.figure_sequence.periodicityRange, band(Number(features.combinedStatePeriod), [4, 8, 16, 32]));
  } else if (sectionType === "mathematical_equation") {
    increment(coverage.mathematical_equation.graph, String(features.graph));
    const relationships = features.relationships;
    (Array.isArray(relationships) ? relationships : ["unknown"]).forEach((value) => increment(coverage.mathematical_equation.relationship, String(value)));
    increment(coverage.mathematical_equation.variableCount, String(features.variableCount));
    increment(coverage.mathematical_equation.targetDepth, String(features.targetDepth));
    increment(coverage.mathematical_equation.arithmeticCostBand, band(Number(features.mentalArithmeticCost), [3, 6, 9, 12]));
    increment(coverage.mathematical_equation.visibleConstantBand, band(Number(features.maximumVisibleConstant), [20, 30, 40, 60]));
    increment(coverage.mathematical_equation.scaleDivisionCoverage, features.hasScaleOrDivision ? "present" : "absent");
  } else {
    increment(coverage.latin_square.reasoningFamily, String(features.reasoningFamily));
    increment(coverage.latin_square.targetDepth, String(features.targetDepth));
    increment(coverage.latin_square.intermediateCellCount, String(features.intermediateCells));
    const deductionTypes = features.deductionTypes;
    (Array.isArray(deductionTypes) ? deductionTypes : ["unknown"]).forEach((value) => increment(coverage.latin_square.deductionType, String(value)));
    increment(coverage.latin_square.clueRedundancyBand, band(Number(features.redundantClues), [0, 2, 4, 6, 8]));
    increment(coverage.latin_square.fullGridUniqueness, features.fullGridUnique ? "verified" : "not_verified");
  }
}

describe("Core mock release audit", () => {
  auditIt("generates its deterministic 1,000-mock shard", async () => {
    expect(Number.isSafeInteger(totalMocks) && totalMocks >= 1).toBe(true);
    expect(Number.isSafeInteger(shardCount) && shardCount >= 1).toBe(true);
    expect(Number.isSafeInteger(shardIndex) && shardIndex >= 0 && shardIndex < shardCount).toBe(true);

    const coverage = newCoverage();
    const mocks: Array<Record<string, unknown>> = [];
    const failures: Array<Record<string, unknown>> = [];
    const determinismMismatches: string[] = [];
    const developmentSummaries: Array<Record<string, unknown>> = [];
    let determinismChecked = 0;

    for (let index = shardIndex; index < totalMocks; index += shardCount) {
      const seed = `phase-5-core-mock-${String(index + 1).padStart(4, "0")}`;
      try {
        const mock = assembleCoreMock({ mockSeed: seed, createdAt: "2026-08-22T00:00:00.000Z" });
        const questionItems = mock.sections.flatMap((section) => section.questions);
        const sectionResults = Object.fromEntries(mock.sections.map((section) => {
          section.questions.forEach((item) => collectCoverage(coverage, section.sectionType, item));
          const familyCounts: Counts = {};
          section.questions.forEach((item) => increment(familyCounts, item.diagnostics.family));
          const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
          section.questions.forEach((item) => { difficultyCounts[item.difficulty] += 1; });
          return [section.sectionType, {
            similarity: pairwise(section.sectionType, section.questions),
            difficultyCounts,
            longestEasyStreak: maximumTargetRun(section.difficultyOrder, "easy"),
            longestMediumStreak: maximumTargetRun(section.difficultyOrder, "medium"),
            longestHardStreak: maximumTargetRun(section.difficultyOrder, "hard"),
            difficultyScoresByPosition: section.questions.map((item) => item.diagnostics.difficultyScore),
            largestFamilyCount: Math.max(...Object.values(familyCounts)),
            uniqueFamilies: Object.keys(familyCounts).length,
            generationDurationMs: section.generationDurationMs,
          }];
        }));
        const protocolFailures = mock.quality.criticalIssues.length;
        const missingExplanations = questionItems.filter((item) => !item.question.explanation.trim()).length;
        const answerFailures = questionItems.filter((item) => !answerIntegrity(item)).length;
        const strictValidationFailures = questionItems.reduce((sum, item) =>
          sum + strictIntegrityFailures(item), 0);
        mocks.push({
          index: index + 1,
          seed,
          totalGenerationDurationMs: mock.totalGenerationDurationMs,
          totalGeneratorAttempts: mock.totalGeneratorAttempts,
          totalSlotGenerationCalls: questionItems.reduce((sum, item) => sum + item.diagnostics.slotGenerationCalls, 0),
          spacingRelaxations: questionItems.filter((item) => item.diagnostics.spacingRelaxed).length,
          qualityScore: mock.quality.score,
          moduleQualityScores: mock.quality.moduleScores,
          protocolFailures,
          missingExplanations,
          answerFailures,
          strictValidationFailures,
          sectionResults,
        });

        if (index < 100) {
          determinismChecked += 1;
          const reproduced = assembleCoreMock({ mockSeed: seed, createdAt: "2030-01-01T00:00:00.000Z" });
          if (JSON.stringify(coreMockDeterministicSnapshot(reproduced)) !== JSON.stringify(coreMockDeterministicSnapshot(mock))) {
            determinismMismatches.push(seed);
          }
        }
        if (index < 5) {
          developmentSummaries.push({
            seed,
            questions: mock.sections.flatMap((section) => section.questions.map((item) => ({
              module: section.sectionType,
              questionNumber: item.position,
              difficulty: item.difficulty,
              structuralFamily: item.diagnostics.family,
              noveltyScore: item.diagnostics.noveltyScore,
              reasoningClassification: item.diagnostics.reasoningClassification,
            }))),
          });
        }
      } catch (error) {
        failures.push({
          index: index + 1,
          seed,
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          reason: error && typeof error === "object" && "reason" in error ? String(error.reason) : "unknown",
          module: error && typeof error === "object" && "sectionType" in error ? error.sectionType : null,
          position: error && typeof error === "object" && "position" in error ? error.position : null,
          attempts: error && typeof error === "object" && "attempts" in error ? error.attempts : null,
        });
      }
      if ((mocks.length + failures.length) % 25 === 0) {
        console.info(`Core mock audit shard ${shardIndex + 1}/${shardCount}: ${mocks.length + failures.length} completed`);
      }
      // Release the Vitest worker event loop between CPU-heavy complete mocks so
      // long audit shards continue to answer runner heartbeats.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    const directory = join(process.cwd(), "reports", "core-mocks", "shards");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `shard-${shardIndex}.json`), JSON.stringify({
      shardIndex,
      shardCount,
      totalMocks,
      mocks,
      failures,
      coverage,
      determinism: { checked: determinismChecked, mismatches: determinismMismatches },
      developmentSummaries,
    }, null, 2));

    expect(mocks.length + failures.length).toBe(Math.ceil((totalMocks - shardIndex) / shardCount));
  }, 3_600_000);
});
