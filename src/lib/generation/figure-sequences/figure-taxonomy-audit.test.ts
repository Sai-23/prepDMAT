import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessStructuralNovelty, calculateStructuralSimilarity, fingerprintStructuralProfile, type StructuralProfile } from "../novelty";
import { referenceProfilesFor } from "../reference-protection";
import { figurePrimitivesForRule } from "./compatibility";
import { calculateFigureDifficulty } from "./difficulty";
import { FIGURE_PRIMITIVE_IDS } from "./evidence";
import {
  FIGURE_SEQUENCE_NOVELTY_POLICY,
  FIGURE_SEQUENCE_SIMILARITY_WEIGHTS,
  fingerprintFigureSequence,
  figureSequenceStructuralProfile,
} from "./fingerprint";
import { figureSequenceGenerator } from "./generator";
import { generateValidatedFigureSequence } from "./pipeline";
import type { FigureSequenceQuestion, FigureSymbolRuleSet } from "./types";
import { figureSequenceValidator } from "./validator";

const ENABLED = process.env.DMAT_FIGURE_TAXONOMY_AUDIT === "1";
const SAMPLE_SIZE = Number(process.env.DMAT_FIGURE_AUDIT_SAMPLE_SIZE ?? 5_000);
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const RECENT_WINDOW = 3;
const rounded = (value: number) => Number(value.toFixed(4));
const average = (values: readonly number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
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

function percentageDistribution(distribution: Readonly<Record<string, number>>, total: number) {
  return Object.fromEntries(Object.entries(distribution).map(([key, count]) => [key, {
    count,
    percentage: rounded(100 * count / Math.max(1, total)),
  }]));
}

function ruleSummary(rule: FigureSymbolRuleSet) {
  const movement = rule.movement?.kind === "linear"
    ? `linear:${rule.movement.direction}`
    : rule.movement?.kind === "border"
      ? `border:${rule.movement.direction}`
      : rule.movement?.kind === "direction_cycle"
        ? `direction-cycle:${rule.movement.directions.join(">")}`
        : "none";
  return {
    movement,
    step: rule.movement ? `${rule.movement.steps}:${rule.movement.progression}` : "none",
    boundary: rule.movement?.kind === "border" ? "follow" : rule.movement?.boundary ?? "none",
    rotation: rule.rotation ? `${rule.rotation.direction}:${rule.rotation.quarterTurns}:${rule.rotation.progression}` : "none",
    colour: rule.colour ? `${rule.colour.cycle.length}:${rule.colour.steps}:${rule.colour.progression}` : "none",
  };
}

function sampleSummary(question: FigureSequenceQuestion) {
  const metrics = calculateFigureDifficulty(question).metrics;
  return {
    seed: question.metadata.seed,
    requestedDifficulty: question.metadata.requestedDifficulty,
    calculatedDifficulty: question.metadata.calculatedDifficulty,
    objectCount: metrics.symbolCount,
    objectRules: question.structuredData.rules.map(ruleSummary),
    combinedStatePeriod: metrics.combinedStatePeriod,
    structuralFingerprint: question.metadata.ruleFingerprint,
    recentNoveltyScore: question.metadata.novelty?.maximumRecentSimilarity == null
      ? 1
      : rounded(1 - question.metadata.novelty.maximumRecentSimilarity),
    referenceSimilarity: question.metadata.novelty?.maximumReferenceSimilarity ?? null,
  };
}

function compoundLabels(rule: FigureSymbolRuleSet): string[] {
  const labels: string[] = [];
  if (!rule.rotation && !rule.colour && rule.movement?.progression !== "incrementing") labels.push("movement only");
  if (rule.movement) labels.push("movement + boundary");
  if (rule.rotation) labels.push("movement + rotation");
  if (rule.colour) labels.push("movement + colour");
  if (rule.rotation && rule.colour) labels.push("movement + rotation + colour");
  if (rule.movement?.progression === "incrementing") labels.push("movement + progressive step");
  if (rule.rotation?.progression === "incrementing") labels.push("movement + progressive rotation");
  return labels;
}

function markdown(report: Record<string, unknown>): string {
  return [
    "# Figure Sequences taxonomy audit",
    "",
    `Accepted: ${report.accepted}; attempts: ${report.totalAttempts}.`,
    `Diversity score: ${report.diversityScore}.`,
    "",
    "## Core metrics",
    "",
    `\`\`\`json\n${JSON.stringify({
      rejectionRates: report.rejectionRates,
      exactDuplicateRate: report.exactDuplicateRate,
      uniqueStructuralFingerprints: report.uniqueStructuralFingerprints,
      structuralDuplicateRate: report.structuralDuplicateRate,
      averageQuestionsPerStructure: report.averageQuestionsPerStructure,
      largestStructuralCluster: report.largestStructuralCluster,
      recentNearCloneRateAt090: report.recentNearCloneRateAt090,
      averageStructuralSimilarity: report.averageStructuralSimilarity,
      diversityScore: report.diversityScore,
    }, null, 2)}\n\`\`\``,
    "",
    "## Old vs new",
    "",
    `\`\`\`json\n${JSON.stringify(report.baselineComparison, null, 2)}\n\`\`\``,
    "",
    "## Rule distribution",
    "",
    `\`\`\`json\n${JSON.stringify(report.ruleDistribution, null, 2)}\n\`\`\``,
    "",
    "## Compound-rule distribution",
    "",
    `\`\`\`json\n${JSON.stringify(report.compoundRuleDistribution, null, 2)}\n\`\`\``,
    "",
    "## Object counts",
    "",
    `\`\`\`json\n${JSON.stringify(report.objectCountDistribution, null, 2)}\n\`\`\``,
    "",
    "## Periodicity",
    "",
    `\`\`\`json\n${JSON.stringify(report.periodicity, null, 2)}\n\`\`\``,
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

describe.skipIf(!ENABLED)("5,000-question Figure Sequence taxonomy audit", () => {
  it("measures evidence coverage, composition, difficulty, periodicity, and structural diversity", async () => {
    expect(Number.isSafeInteger(SAMPLE_SIZE) && SAMPLE_SIZE >= 30).toBe(true);
    const questions: FigureSequenceQuestion[] = [];
    const profiles: StructuralProfile[] = [];
    const acceptedFingerprints = new Set<string>();
    const primitiveCounts = Object.fromEntries(FIGURE_PRIMITIVE_IDS.map((id) => [id, 0]));
    const compoundCounts: Record<string, number> = {};
    const objectCounts = Object.fromEntries(DIFFICULTIES.map((level) => [level, { "1": 0, "2": 0, "3": 0, "4": 0 }])) as Record<string, Record<string, number>>;
    const periodByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => [level, [] as ReturnType<typeof calculateFigureDifficulty>["metrics"][]]));
    let totalAttempts = 0;
    let constructionRejections = 0;
    let constraintRejections = 0;
    let difficultyRejections = 0;
    let noveltyRejections = 0;

    for (let index = 0; index < SAMPLE_SIZE; index += 1) {
      if (index % 50 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
      const requestedDifficulty = DIFFICULTIES[index % DIFFICULTIES.length];
      const configuration = { seed: `figure-taxonomy-v2-${index}`, difficulty: requestedDifficulty, maxAttempts: 500 } as const;
      const recent = profiles.slice(-RECENT_WINDOW);
      const acceptedBefore = new Set(acceptedFingerprints);
      const question = generateValidatedFigureSequence(configuration, acceptedFingerprints, recent);
      totalAttempts += question.metadata.attemptCount;

      for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
        try {
          const candidate = figureSequenceGenerator.generate(configuration, attempt);
          const validation = figureSequenceValidator.validate(candidate, requestedDifficulty);
          if (!validation.valid) {
            if (validation.issues.some((entry) => entry.code === "difficulty_mismatch")) difficultyRejections += 1;
            else constraintRejections += 1;
            continue;
          }
          if (acceptedBefore.has(fingerprintFigureSequence(candidate))) {
            noveltyRejections += 1;
            continue;
          }
          const novelty = assessStructuralNovelty(figureSequenceStructuralProfile(candidate), {
            references: referenceProfilesFor("figure_sequence"),
            recent,
            weights: FIGURE_SEQUENCE_SIMILARITY_WEIGHTS,
            ...FIGURE_SEQUENCE_NOVELTY_POLICY,
          });
          if (!novelty.accepted) noveltyRejections += 1;
        } catch {
          constructionRejections += 1;
        }
      }

      acceptedFingerprints.add(question.metadata.fingerprint);
      const profile = figureSequenceStructuralProfile(question);
      profiles.push(profile);
      questions.push(question);
      const metrics = calculateFigureDifficulty(question).metrics;
      periodByDifficulty[requestedDifficulty].push(metrics);
      increment(objectCounts[requestedDifficulty], String(metrics.symbolCount));
      question.structuredData.rules.forEach((rule) => {
        figurePrimitivesForRule(rule).forEach((primitive) => increment(primitiveCounts, primitive));
        compoundLabels(rule).forEach((label) => increment(compoundCounts, label));
      });
      if (new Set(question.structuredData.rules.map((rule) => JSON.stringify(ruleSummary(rule)))).size > 1) {
        increment(compoundCounts, "multi-object mixed rules");
      }
    }

    const semanticFingerprints = questions.map((question) => question.metadata.fingerprint);
    const structuralFingerprints = questions.map((question) => question.metadata.ruleFingerprint ?? fingerprintStructuralProfile(figureSequenceStructuralProfile(question)));
    const structureCounts: Record<string, number> = {};
    structuralFingerprints.forEach((fingerprint) => increment(structureCounts, fingerprint));
    const uniqueStructuralFingerprints = Object.keys(structureCounts).length;
    const sortedStructures = Object.entries(structureCounts).sort((first, second) => second[1] - first[1]);
    const recentSimilarities = questions.flatMap((question) => question.metadata.novelty?.maximumRecentSimilarity == null ? [] : [question.metadata.novelty.maximumRecentSimilarity]);
    const nearCloneRate = recentSimilarities.filter((value) => value >= 0.9).length / Math.max(1, recentSimilarities.length);
    const ruleEntropy = normalizedEntropy(structureCounts);
    const diversityScore = 100 * (0.35 * uniqueStructuralFingerprints / questions.length + 0.35 * ruleEntropy + 0.3 * (1 - nearCloneRate));
    const comparisonQuestions = questions.slice(0, Math.min(2_000, questions.length));
    const comparisonStructures: Record<string, number> = {};
    comparisonQuestions.forEach((question) => increment(comparisonStructures, question.metadata.ruleFingerprint!));
    const comparisonSimilarities = comparisonQuestions.flatMap((question) => question.metadata.novelty?.maximumRecentSimilarity == null ? [] : [question.metadata.novelty.maximumRecentSimilarity]);
    const comparisonNearCloneRate = comparisonSimilarities.filter((value) => value >= 0.9).length / Math.max(1, comparisonSimilarities.length);
    const comparisonUnique = Object.keys(comparisonStructures).length;
    const comparisonDuplicateRate = 1 - comparisonUnique / comparisonQuestions.length;
    const comparisonScore = 100 * (0.35 * comparisonUnique / comparisonQuestions.length + 0.35 * normalizedEntropy(comparisonStructures) + 0.3 * (1 - comparisonNearCloneRate));
    const references = referenceProfilesFor("figure_sequence");
    const referenceSimilarities = references.length ? profiles.map((profile) => Math.max(...references.map((reference) => calculateStructuralSimilarity(profile, reference, FIGURE_SEQUENCE_SIMILARITY_WEIGHTS)))) : [];
    const allMetrics = Object.values(periodByDifficulty).flat();
    const periodSummary = (metrics: typeof allMetrics) => ({
      averageMovementPeriod: rounded(average(metrics.map((item) => item.averageMovementPeriod))),
      averageRotationPeriod: rounded(average(metrics.map((item) => item.averageRotationPeriod))),
      averageColourPeriod: rounded(average(metrics.map((item) => item.averageColourPeriod))),
      averageCombinedStatePeriod: rounded(average(metrics.map((item) => item.combinedStatePeriod))),
      trivialCycleCount: metrics.reduce((sum, item) => sum + item.trivialCycleCount, 0),
      combinedStatePeriodDistribution: metrics.reduce((result, item) => { increment(result, String(item.combinedStatePeriod)); return result; }, {} as Record<string, number>),
    });
    const totalObjectProfiles = questions.reduce((sum, question) => sum + question.structuredData.rules.length, 0);
    const report = {
      generatedAt: new Date().toISOString(),
      accepted: questions.length,
      requestedDifficultyDistribution: percentageDistribution(questions.reduce((result, question) => { increment(result, question.metadata.requestedDifficulty); return result; }, {} as Record<string, number>), questions.length),
      totalAttempts,
      rejectionRates: {
        construction: rounded(constructionRejections / totalAttempts),
        constraint: rounded(constraintRejections / totalAttempts),
        difficulty: rounded(difficultyRejections / totalAttempts),
        novelty: rounded(noveltyRejections / totalAttempts),
      },
      rejectionCounts: { constructionRejections, constraintRejections, difficultyRejections, noveltyRejections },
      exactDuplicateRate: rounded(1 - new Set(semanticFingerprints).size / questions.length),
      uniqueStructuralFingerprints,
      structuralDuplicateRate: rounded(1 - uniqueStructuralFingerprints / questions.length),
      averageQuestionsPerStructure: rounded(questions.length / uniqueStructuralFingerprints),
      largestStructuralCluster: { fingerprint: sortedStructures[0]?.[0] ?? null, count: sortedStructures[0]?.[1] ?? 0, percentage: rounded(100 * (sortedStructures[0]?.[1] ?? 0) / questions.length) },
      recentNearCloneRateAt090: rounded(nearCloneRate),
      averageStructuralSimilarity: rounded(average(recentSimilarities)),
      normalizedRuleEntropy: rounded(ruleEntropy),
      diversityFormula: "100 * (0.35 * uniqueStructuralRatio + 0.35 * normalizedRuleEntropy + 0.30 * (1 - recentNearCloneRateAt0.90))",
      diversityScore: rounded(diversityScore),
      ruleDistribution: percentageDistribution(primitiveCounts, totalObjectProfiles),
      compoundRuleDistribution: Object.fromEntries(Object.entries(compoundCounts).map(([key, count]) => [key, { count, percentage: rounded(100 * count / (key === "multi-object mixed rules" ? questions.length : totalObjectProfiles)) }])),
      dominantCompoundFlags: Object.entries(compoundCounts).filter(([key, count]) => count / (key === "multi-object mixed rules" ? questions.length : totalObjectProfiles) > 0.75).map(([combination, count]) => ({ combination, count })),
      objectCountDistribution: Object.fromEntries(DIFFICULTIES.map((level) => [level, percentageDistribution(objectCounts[level], periodByDifficulty[level].length)])),
      periodicity: { overall: periodSummary(allMetrics), byDifficulty: Object.fromEntries(DIFFICULTIES.map((level) => [level, periodSummary(periodByDifficulty[level])])) },
      referenceSimilarity: references.length ? {
        available: true,
        profileCount: references.length,
        maximum: rounded(Math.max(...referenceSimilarities)),
        mean: rounded(average(referenceSimilarities)),
        above090: referenceSimilarities.filter((value) => value > 0.9).length,
        above080: referenceSimilarities.filter((value) => value > 0.8).length,
        above070: referenceSimilarities.filter((value) => value > 0.7).length,
      } : {
        available: false,
        profileCount: 0,
        reason: "The repository contains official provenance and abstract Figure rule evidence, but no normalized reasoning structures derived from actual official Figure examples; fabricating profiles would violate reference-protection policy.",
      },
      developmentSamples: Object.fromEntries(DIFFICULTIES.map((level) => [level, questions.filter((question) => question.metadata.requestedDifficulty === level).slice(0, 10).map(sampleSummary)])),
      baselineComparison: {
        oldSampleSize: 2_000,
        oldUniqueStructures: 788,
        oldStructuralDuplicateRate: 0.606,
        oldLargestClusterPercentage: 10.95,
        oldDiversityScore: 71.9735,
        newSampleSize: comparisonQuestions.length,
        newUniqueStructures: comparisonUnique,
        newStructuralDuplicateRate: rounded(comparisonDuplicateRate),
        newLargestClusterPercentage: rounded(100 * Math.max(...Object.values(comparisonStructures)) / comparisonQuestions.length),
        newDiversityScore: rounded(comparisonScore),
        uniqueStructureIncreasePercent: rounded(100 * (comparisonUnique - 788) / 788),
        structuralDuplicateRateImprovementPoints: rounded(100 * (0.606 - comparisonDuplicateRate)),
        diversityScoreIncrease: rounded(comparisonScore - 71.9735),
      },
    };

    const directory = resolve(process.cwd(), "reports", "figure-sequences");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "taxonomy-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(resolve(directory, "taxonomy-audit.md"), markdown(report));

    expect(report.accepted).toBe(SAMPLE_SIZE);
    expect(report.exactDuplicateRate).toBe(0);
    expect(Object.values(primitiveCounts).every((count) => count > 0)).toBe(true);
    expect(report.developmentSamples.easy).toHaveLength(10);
    expect(report.developmentSamples.medium).toHaveLength(10);
    expect(report.developmentSamples.hard).toHaveLength(10);
  }, 1_200_000);
});
