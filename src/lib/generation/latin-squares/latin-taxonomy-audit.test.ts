import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessStructuralNovelty, type StructuralProfile } from "../novelty";
import { referenceProfilesFor } from "../reference-protection";
import { analyzeLatinDeductions, calculateLatinDifficulty } from "./difficulty";
import { LATIN_DEDUCTION_MECHANISM_IDS, type LatinDeductionMechanismId } from "./evidence";
import {
  fingerprintLatinSquare,
  LATIN_SQUARE_NOVELTY_POLICY,
  LATIN_SQUARE_SIMILARITY_WEIGHTS,
  latinSquareStructuralProfile,
} from "./fingerprint";
import { latinSquareGenerator } from "./generator";
import { generateValidatedLatinSquare } from "./pipeline";
import { latinSquareSolver } from "./solver";
import type { LatinDeduction, LatinDifficultyMetrics, LatinSquareQuestion } from "./types";
import { latinSquareValidator } from "./validator";

const ENABLED = process.env.DMAT_LATIN_TAXONOMY_AUDIT === "1";
const SAMPLE_SIZE = Number(process.env.DMAT_LATIN_AUDIT_SAMPLE_SIZE ?? 5_000);
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const RECENT_WINDOW = 3;
const rounded = (value: number) => Number(value.toFixed(4));
const average = (values: readonly number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function percentageDistribution(distribution: Readonly<Record<string, number>>, total: number) {
  return Object.fromEntries(Object.entries(distribution).map(([key, count]) => [key, { count, percentage: rounded(100 * count / Math.max(1, total)) }]));
}

function normalizedEntropy(distribution: Readonly<Record<string, number>>): number {
  const counts = Object.values(distribution).filter((count) => count > 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (counts.length <= 1 || !total) return 0;
  return -counts.reduce((sum, count) => {
    const probability = count / total;
    return sum + probability * Math.log(probability);
  }, 0) / Math.log(counts.length);
}

function targetClosure(question: LatinSquareQuestion): LatinDeduction[] {
  const key = (deduction: { coordinate: { row: number; column: number } }) => `${deduction.coordinate.row}:${deduction.coordinate.column}`;
  const byKey = new Map(question.deductionTrace.map((deduction) => [key(deduction), deduction]));
  const target = byKey.get(`${question.structuredData.target.row}:${question.structuredData.target.column}`);
  if (!target) return [];
  const closure = new Set<string>();
  const visit = (deduction: LatinDeduction) => {
    const value = key(deduction);
    if (closure.has(value)) return;
    closure.add(value);
    deduction.dependencies.forEach((dependency) => {
      const parent = byKey.get(`${dependency.row}:${dependency.column}`);
      if (parent) visit(parent);
    });
  };
  visit(target);
  return question.deductionTrace.filter((deduction) => closure.has(key(deduction)));
}

function sampleSummary(question: LatinSquareQuestion, metrics: LatinDifficultyMetrics) {
  const { target } = question.structuredData;
  return {
    seed: question.metadata.seed,
    puzzleGrid: question.structuredData.grid.map((row, rowIndex) => row.map((symbol, columnIndex) =>
      rowIndex === target.row && columnIndex === target.column ? "?" : symbol ?? ".")),
    targetCoordinate: { row: target.row + 1, column: target.column + 1 },
    correctTarget: question.correctAnswer,
    reasoningClassification: metrics.reasoningClassification,
    targetDepth: metrics.targetDepth,
    requiredIntermediateCells: metrics.requiredIntermediateCells,
    deductionPathSummary: targetClosure(question).map((deduction) => ({
      cell: `${deduction.coordinate.row + 1}:${deduction.coordinate.column + 1}`,
      symbol: deduction.symbol,
      reason: deduction.reason,
      dependencies: deduction.dependencies.map((dependency) => `${dependency.row + 1}:${dependency.column + 1}`),
    })),
    candidateEliminationProfile: {
      targetInitialCandidates: metrics.targetInitialCandidateCount,
      totalEliminations: metrics.candidateEliminations,
      rowColumnAlternations: metrics.rowColumnAlternations,
    },
    essentialClueCount: metrics.essentialClueCount,
    redundantClueCount: metrics.redundantClueCount,
    difficultyScore: metrics.score,
    structuralFingerprint: question.metadata.ruleFingerprint,
    noveltyScore: question.metadata.novelty?.maximumRecentSimilarity == null ? 1 : rounded(1 - question.metadata.novelty.maximumRecentSimilarity),
  };
}

function metricSummary(metrics: readonly LatinDifficultyMetrics[]) {
  return {
    averageTargetDepth: rounded(average(metrics.map((item) => item.targetDepth))),
    averageIntermediateCells: rounded(average(metrics.map((item) => item.requiredIntermediateCells))),
    averageMaximumDeductionDepth: rounded(average(metrics.map((item) => item.maxDeductionDepth))),
    averageCandidateEliminations: rounded(average(metrics.map((item) => item.candidateEliminations))),
    averageRowColumnAlternations: rounded(average(metrics.map((item) => item.rowColumnAlternations))),
    averageEssentialClues: rounded(average(metrics.map((item) => item.essentialClueCount))),
    averageRedundantClues: rounded(average(metrics.map((item) => item.redundantClueCount))),
    averageRedundancyRatio: rounded(average(metrics.map((item) => item.redundancyRatio))),
    averageBlanks: rounded(average(metrics.map((item) => 25 - item.visibleClues))),
    averageVisibleClues: rounded(average(metrics.map((item) => item.visibleClues))),
    highestRedundancyRatio: rounded(Math.max(...metrics.map((item) => item.redundancyRatio))),
    lowestRedundancyRatio: rounded(Math.min(...metrics.map((item) => item.redundancyRatio))),
  };
}

function markdown(report: Record<string, unknown>): string {
  return [
    "# Latin Squares reasoning-taxonomy audit",
    "",
    `Accepted: ${report.accepted}; attempts: ${report.totalAttempts}; diversity score: ${report.diversityScore}.`,
    "",
    "## Core metrics",
    "",
    `\`\`\`json\n${JSON.stringify({ rejectionRates: report.rejectionRates, exactDuplicateRate: report.exactDuplicateRate, uniqueStructuralFingerprints: report.uniqueStructuralFingerprints, structuralDuplicateRate: report.structuralDuplicateRate, largestStructuralCluster: report.largestStructuralCluster, averageQuestionsPerStructure: report.averageQuestionsPerStructure, recentNearCloneRateAt090: report.recentNearCloneRateAt090, diversityScore: report.diversityScore }, null, 2)}\n\`\`\``,
    "",
    "## Old vs new",
    "",
    `\`\`\`json\n${JSON.stringify(report.baselineComparison, null, 2)}\n\`\`\``,
    "",
    "## Deduction distribution",
    "",
    `\`\`\`json\n${JSON.stringify(report.deductionDistribution, null, 2)}\n\`\`\``,
    "",
    "## Difficulty and clue quality",
    "",
    `\`\`\`json\n${JSON.stringify(report.difficultyMetrics, null, 2)}\n\`\`\``,
    "",
    "## Uniqueness",
    "",
    `\`\`\`json\n${JSON.stringify(report.uniqueness, null, 2)}\n\`\`\``,
    "",
    "## Reference similarity",
    "",
    `\`\`\`json\n${JSON.stringify(report.referenceSimilarity, null, 2)}\n\`\`\``,
    "",
    "## Development samples (diagnostic only)",
    "",
    `\`\`\`json\n${JSON.stringify(report.developmentSamples, null, 2)}\n\`\`\``,
  ].join("\n");
}

describe.skipIf(!ENABLED)("5,000-question Latin Square reasoning audit", () => {
  it("measures deduction paths, clue quality, uniqueness, and normalized diversity", async () => {
    expect(Number.isSafeInteger(SAMPLE_SIZE) && SAMPLE_SIZE >= 30).toBe(true);
    const startedAt = Date.now();
    const questions: LatinSquareQuestion[] = [];
    const metricsByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => [level, [] as LatinDifficultyMetrics[]]));
    const profiles: StructuralProfile[] = [];
    const acceptedFingerprints = new Set<string>();
    const deductionCounts = Object.fromEntries(DIFFICULTIES.map((level) => [level, Object.fromEntries(LATIN_DEDUCTION_MECHANISM_IDS.map((id) => [id, 0]))])) as Record<string, Record<LatinDeductionMechanismId, number>>;
    const targetCandidateCounts: Record<string, number> = {};
    const fullGridSolutionCounts: Record<string, number> = {};
    let totalAttempts = 0;
    let constructionRejections = 0;
    let uniquenessRejections = 0;
    let difficultyRejections = 0;
    let noveltyRejections = 0;
    let pedagogicalRejections = 0;
    let otherValidationRejections = 0;
    let fullyUnique = 0;
    let targetUniqueGridNonUnique = 0;

    for (let index = 0; index < SAMPLE_SIZE; index += 1) {
      if (index % 25 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
      const requestedDifficulty = DIFFICULTIES[index % DIFFICULTIES.length];
      const configuration = { seed: `latin-taxonomy-v2-${index}`, difficulty: requestedDifficulty, maxAttempts: 500 } as const;
      const recent = profiles.slice(-RECENT_WINDOW);
      const acceptedBefore = new Set(acceptedFingerprints);
      const question = generateValidatedLatinSquare(configuration, acceptedFingerprints, recent);
      totalAttempts += question.metadata.attemptCount;

      for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
        try {
          const candidate = latinSquareGenerator.generate(configuration, attempt);
          const validation = latinSquareValidator.validate(candidate, requestedDifficulty);
          if (!validation.valid) {
            const codes = new Set(validation.issues.map((entry) => entry.code));
            if (codes.has("ambiguous_target") || codes.has("no_completion")) uniquenessRejections += 1;
            else if (codes.has("difficulty_mismatch")) difficultyRejections += 1;
            else if (codes.has("excessive_irrelevant_clues")) pedagogicalRejections += 1;
            else otherValidationRejections += 1;
            continue;
          }
          if (acceptedBefore.has(fingerprintLatinSquare(candidate))) {
            noveltyRejections += 1;
            continue;
          }
          const novelty = assessStructuralNovelty(latinSquareStructuralProfile(candidate), {
            references: referenceProfilesFor("latin_square"), recent,
            weights: LATIN_SQUARE_SIMILARITY_WEIGHTS, ...LATIN_SQUARE_NOVELTY_POLICY,
          });
          if (!novelty.accepted) noveltyRejections += 1;
        } catch {
          constructionRejections += 1;
        }
      }

      acceptedFingerprints.add(question.metadata.fingerprint);
      const profile = latinSquareStructuralProfile(question);
      profiles.push(profile);
      questions.push(question);
      const calculated = calculateLatinDifficulty(question, analyzeLatinDeductions(question));
      if (!calculated) throw new Error("Accepted Latin question lost its deduction analysis.");
      metricsByDifficulty[requestedDifficulty].push(calculated.metrics);
      increment(deductionCounts[requestedDifficulty], calculated.metrics.reasoningClassification);
      const outcome = latinSquareSolver.solve(question);
      increment(targetCandidateCounts, String(outcome.possibleTargetSymbols.length));
      increment(fullGridSolutionCounts, outcome.fullGridSolutionCountCapped ? `${outcome.fullGridSolutionCount}+` : String(outcome.fullGridSolutionCount));
      if (outcome.fullGridSolutionCount === 1 && !outcome.fullGridSolutionCountCapped) fullyUnique += 1;
      else targetUniqueGridNonUnique += 1;
    }

    const semanticFingerprints = questions.map((question) => question.metadata.fingerprint);
    const structuralFingerprints = questions.map((question) => question.metadata.ruleFingerprint!);
    const structureCounts: Record<string, number> = {};
    structuralFingerprints.forEach((fingerprint) => increment(structureCounts, fingerprint));
    const sortedStructures = Object.entries(structureCounts).sort((first, second) => second[1] - first[1]);
    const uniqueStructures = sortedStructures.length;
    const similarities = questions.flatMap((question) => question.metadata.novelty?.maximumRecentSimilarity == null ? [] : [question.metadata.novelty.maximumRecentSimilarity]);
    const nearCloneRate = similarities.filter((value) => value >= 0.9).length / Math.max(1, similarities.length);
    const entropy = normalizedEntropy(structureCounts);
    const diversityScore = 100 * (0.35 * uniqueStructures / questions.length + 0.35 * entropy + 0.3 * (1 - nearCloneRate));
    const comparisonQuestions = questions.slice(0, Math.min(2_000, questions.length));
    const comparisonStructures: Record<string, number> = {};
    comparisonQuestions.forEach((question) => increment(comparisonStructures, question.metadata.ruleFingerprint!));
    const comparisonUnique = Object.keys(comparisonStructures).length;
    const comparisonSimilarities = comparisonQuestions.flatMap((question) => question.metadata.novelty?.maximumRecentSimilarity == null ? [] : [question.metadata.novelty.maximumRecentSimilarity]);
    const comparisonNearClone = comparisonSimilarities.filter((value) => value >= 0.9).length / Math.max(1, comparisonSimilarities.length);
    const comparisonDiversity = 100 * (0.35 * comparisonUnique / comparisonQuestions.length + 0.35 * normalizedEntropy(comparisonStructures) + 0.3 * (1 - comparisonNearClone));
    const report = {
      generatedAt: new Date().toISOString(),
      runtimeSeconds: rounded((Date.now() - startedAt) / 1_000),
      accepted: questions.length,
      requestedDifficultyDistribution: percentageDistribution(questions.reduce((result, question) => { increment(result, question.metadata.requestedDifficulty); return result; }, {} as Record<string, number>), questions.length),
      totalAttempts,
      rejectionRates: {
        construction: rounded(constructionRejections / totalAttempts),
        uniqueness: rounded(uniquenessRejections / totalAttempts),
        difficulty: rounded(difficultyRejections / totalAttempts),
        novelty: rounded(noveltyRejections / totalAttempts),
        pedagogical: rounded(pedagogicalRejections / totalAttempts),
        otherValidation: rounded(otherValidationRejections / totalAttempts),
      },
      rejectionCounts: { constructionRejections, uniquenessRejections, difficultyRejections, noveltyRejections, pedagogicalRejections, otherValidationRejections },
      exactDuplicateRate: rounded(1 - new Set(semanticFingerprints).size / questions.length),
      uniqueStructuralFingerprints: uniqueStructures,
      structuralDuplicateRate: rounded(1 - uniqueStructures / questions.length),
      largestStructuralCluster: { fingerprint: sortedStructures[0]?.[0] ?? null, count: sortedStructures[0]?.[1] ?? 0, percentage: rounded(100 * (sortedStructures[0]?.[1] ?? 0) / questions.length) },
      averageQuestionsPerStructure: rounded(questions.length / uniqueStructures),
      recentNearCloneRateAt090: rounded(nearCloneRate),
      averageStructuralSimilarity: rounded(average(similarities)),
      normalizedReasoningEntropy: rounded(entropy),
      diversityFormula: "100 * (0.35 * uniqueStructuralRatio + 0.35 * normalizedReasoningEntropy + 0.30 * (1 - recentNearCloneRateAt0.90))",
      diversityScore: rounded(diversityScore),
      deductionDistribution: Object.fromEntries(DIFFICULTIES.map((level) => [level, percentageDistribution(deductionCounts[level], metricsByDifficulty[level].length)])),
      difficultyMetrics: Object.fromEntries(DIFFICULTIES.map((level) => [level, metricSummary(metricsByDifficulty[level])])),
      uniqueness: {
        targetCandidateCountDistribution: targetCandidateCounts,
        fullGridSolutionCountDistribution: fullGridSolutionCounts,
        targetUniqueButGridNonUnique: targetUniqueGridNonUnique,
        fullyUnique,
        note: "2+ means enumeration stopped after proving at least two full-grid completions; production continues to require target uniqueness, matching prior behavior.",
      },
      clueQuality: Object.fromEntries(DIFFICULTIES.map((level) => [level, metricSummary(metricsByDifficulty[level])])),
      referenceSimilarity: {
        available: false,
        profileCount: 0,
        reason: "The repository contains Latin rule provenance and reasoning classifications but no normalized structures derived from actual official Latin examples; no profiles were fabricated.",
      },
      developmentSamples: Object.fromEntries(DIFFICULTIES.map((level) => [level, questions.filter((question) => question.metadata.requestedDifficulty === level).slice(0, 10).map((question) => {
        const calculated = calculateLatinDifficulty(question, analyzeLatinDeductions(question));
        if (!calculated) throw new Error("Sample lost its target path.");
        return sampleSummary(question, calculated.metrics);
      })])),
      baselineComparison: {
        oldSampleSize: 2_000,
        oldUniqueStructures: 1_913,
        oldStructuralDuplicateRate: 0.0435,
        oldLargestClusterPercentage: 0.2,
        oldDiversityScore: 96.9917,
        oldValidationFailureRate: 0.9062,
        newSampleSize: comparisonQuestions.length,
        newUniqueStructures: comparisonUnique,
        newStructuralDuplicateRate: rounded(1 - comparisonUnique / comparisonQuestions.length),
        newLargestClusterPercentage: rounded(100 * Math.max(...Object.values(comparisonStructures)) / comparisonQuestions.length),
        newDiversityScore: rounded(comparisonDiversity),
        newValidationFailureRate: rounded((uniquenessRejections + difficultyRejections + pedagogicalRejections + otherValidationRejections) / totalAttempts),
        interpretation: "V2 deliberately merges symbol, row, column, and transpose variants and preserves target deduction topology; raw uniqueness is therefore stricter and not directly equivalent to the clue-mask-heavy V1 count.",
      },
    };

    const directory = resolve(process.cwd(), "reports", "latin-squares");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "taxonomy-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(resolve(directory, "taxonomy-audit.md"), markdown(report));

    expect(report.accepted).toBe(SAMPLE_SIZE);
    expect(report.exactDuplicateRate).toBe(0);
    expect(LATIN_DEDUCTION_MECHANISM_IDS.every((mechanism) =>
      DIFFICULTIES.reduce((sum, level) => sum + deductionCounts[level][mechanism], 0) > 0)).toBe(true);
    expect(targetCandidateCounts).toEqual({ "1": SAMPLE_SIZE });
    expect(report.developmentSamples.easy).toHaveLength(10);
    expect(report.developmentSamples.medium).toHaveLength(10);
    expect(report.developmentSamples.hard).toHaveLength(10);
  }, 1_200_000);
});
