import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { calculateStructuralSimilarity, type StructuralProfile } from "./novelty";
import { referenceProfilesFor } from "./reference-protection";
import {
  calculateFigureDifficulty,
  FIGURE_SEQUENCE_SIMILARITY_WEIGHTS,
  figureSequenceGenerator,
  figureSequenceStructuralProfile,
  figureSequenceValidator,
  generateValidatedFigureSequence,
  type FigureSequenceQuestion,
} from "./figure-sequences";
import {
  analyzeLatinDeductions,
  calculateLatinDifficulty,
  generateValidatedLatinSquare,
  LATIN_SQUARE_SIMILARITY_WEIGHTS,
  latinSquareGenerator,
  latinSquareStructuralProfile,
  latinSquareValidator,
  type LatinSquareQuestion,
} from "./latin-squares";
import {
  generateValidatedMathematicalEquation,
  MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
  mathematicalEquationGenerator,
  mathematicalEquationStructuralProfile,
  mathematicalEquationValidator,
  type MathematicalEquationQuestion,
} from "./mathematical-equations";

const ENABLED = process.env.DMAT_GENERATION_DIVERSITY_AUDIT === "1";
const SAMPLE_SIZE = Number(process.env.DMAT_DIVERSITY_SAMPLE_SIZE ?? 2_000);
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const RECENT_WINDOW = 3;

type ModuleName = StructuralProfile["namespace"];
type AuditQuestion = FigureSequenceQuestion | MathematicalEquationQuestion | LatinSquareQuestion;

type ModuleAudit = {
  module: ModuleName;
  accepted: number;
  candidatesAttempted: number;
  validationFailures: number;
  constructionFailures: number;
  noveltyOrDuplicateRejections: number;
  validationFailureRate: number;
  exactDuplicateRate: number;
  structuralDuplicateRate: number;
  uniqueFingerprints: number;
  uniqueRuleFingerprints: number;
  averageQuestionsPerRuleFingerprint: number;
  normalizedRuleEntropy: number;
  nearCloneRate: number;
  averageRecentSimilarity: number | null;
  diversityScore: number;
  largestStructureShare: number;
  topStructuralFingerprints: Array<{ fingerprint: string; count: number; share: number }>;
  difficultyDistribution: Record<string, number>;
  ruleDistribution: Record<string, number>;
  referenceSimilarity: {
    tracked: boolean;
    maximum: number | null;
    mean: number | null;
    above090: number;
    above080: number;
    above070: number;
  };
  averageDeductionDepth?: number;
  dependencyGraphDistribution?: Record<string, number>;
  objectCountDistribution?: Record<string, number>;
};

const rounded = (value: number) => Number(value.toFixed(4));
const average = (values: readonly number[]) => values.length
  ? values.reduce((total, value) => total + value, 0) / values.length
  : 0;

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function normalizedEntropy(distribution: Readonly<Record<string, number>>): number {
  const counts = Object.values(distribution).filter((count) => count > 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (counts.length <= 1 || total === 0) return 0;
  const entropy = -counts.reduce((sum, count) => {
    const probability = count / total;
    return sum + probability * Math.log(probability);
  }, 0);
  return entropy / Math.log(counts.length);
}

function referenceSimilarities(
  module: ModuleName,
  profiles: readonly StructuralProfile[],
  weights: Readonly<Record<string, number>>,
) {
  const references = referenceProfilesFor(module);
  if (references.length === 0) return [];
  return profiles.map((profile) => Math.max(...references.map((reference) =>
    calculateStructuralSimilarity(profile, reference, weights),
  )));
}

function finalize(
  module: ModuleName,
  questions: readonly AuditQuestion[],
  profiles: readonly StructuralProfile[],
  candidatesAttempted: number,
  validationFailures: number,
  constructionFailures: number,
  ruleDistribution: Record<string, number>,
  weights: Readonly<Record<string, number>>,
): ModuleAudit {
  const fingerprints = questions.map((question) => question.metadata.fingerprint);
  const ruleFingerprints = questions.map((question) => question.metadata.ruleFingerprint ?? "missing");
  const uniqueFingerprints = new Set(fingerprints).size;
  const uniqueRuleFingerprints = new Set(ruleFingerprints).size;
  const exactDuplicateRate = 1 - uniqueFingerprints / questions.length;
  const structuralDuplicateRate = 1 - uniqueRuleFingerprints / questions.length;
  const recentSimilarities = questions.flatMap((question) =>
    question.metadata.novelty?.maximumRecentSimilarity == null
      ? []
      : [question.metadata.novelty.maximumRecentSimilarity],
  );
  const nearCloneRate = recentSimilarities.filter((value) => value >= 0.9).length /
    Math.max(1, recentSimilarities.length);
  const entropy = normalizedEntropy(ruleDistribution);
  const uniqueStructuralRatio = uniqueRuleFingerprints / questions.length;
  const diversityScore = 100 * (
    0.35 * uniqueStructuralRatio +
    0.35 * entropy +
    0.3 * (1 - nearCloneRate)
  );
  const structureCounts = ruleFingerprints.reduce<Record<string, number>>((counts, fingerprint) => {
    increment(counts, fingerprint);
    return counts;
  }, {});
  const topStructuralFingerprints = Object.entries(structureCounts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 10)
    .map(([fingerprint, count]) => ({ fingerprint, count, share: rounded(count / questions.length) }));
  const similarities = referenceSimilarities(module, profiles, weights);
  const difficultyDistribution: Record<string, number> = {};
  questions.forEach((question) => increment(difficultyDistribution, question.metadata.calculatedDifficulty));
  return {
    module,
    accepted: questions.length,
    candidatesAttempted,
    validationFailures,
    constructionFailures,
    noveltyOrDuplicateRejections: Math.max(0, candidatesAttempted - questions.length - validationFailures - constructionFailures),
    validationFailureRate: rounded(validationFailures / candidatesAttempted),
    exactDuplicateRate: rounded(exactDuplicateRate),
    structuralDuplicateRate: rounded(structuralDuplicateRate),
    uniqueFingerprints,
    uniqueRuleFingerprints,
    averageQuestionsPerRuleFingerprint: rounded(questions.length / uniqueRuleFingerprints),
    normalizedRuleEntropy: rounded(entropy),
    nearCloneRate: rounded(nearCloneRate),
    averageRecentSimilarity: recentSimilarities.length ? rounded(average(recentSimilarities)) : null,
    diversityScore: rounded(diversityScore),
    largestStructureShare: topStructuralFingerprints[0]?.share ?? 0,
    topStructuralFingerprints,
    difficultyDistribution,
    ruleDistribution,
    referenceSimilarity: {
      tracked: similarities.length > 0,
      maximum: similarities.length ? rounded(Math.max(...similarities)) : null,
      mean: similarities.length ? rounded(average(similarities)) : null,
      above090: similarities.filter((value) => value > 0.9).length,
      above080: similarities.filter((value) => value > 0.8).length,
      above070: similarities.filter((value) => value > 0.7).length,
    },
  };
}

function difficulty(index: number) {
  return DIFFICULTIES[index % DIFFICULTIES.length];
}

async function auditFigures(): Promise<ModuleAudit> {
  const questions: FigureSequenceQuestion[] = [];
  const profiles: StructuralProfile[] = [];
  const fingerprints = new Set<string>();
  const rules: Record<string, number> = {};
  const objectCounts: Record<string, number> = {};
  let candidatesAttempted = 0;
  let validationFailures = 0;
  let constructionFailures = 0;
  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    if (index % 50 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    const configuration = { seed: `diversity-figure-${index}`, difficulty: difficulty(index), maxAttempts: 5_000 } as const;
    const question = generateValidatedFigureSequence(configuration, fingerprints, profiles.slice(-RECENT_WINDOW));
    for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
      try {
        const candidate = figureSequenceGenerator.generate(configuration, attempt);
        if (!figureSequenceValidator.validate(candidate, configuration.difficulty).valid) validationFailures += 1;
      } catch { constructionFailures += 1; }
    }
    candidatesAttempted += question.metadata.attemptCount;
    fingerprints.add(question.metadata.fingerprint);
    const profile = figureSequenceStructuralProfile(question);
    profiles.push(profile);
    (profile.features.movementKinds as readonly string[]).forEach((kind) => increment(rules, kind));
    increment(objectCounts, String(calculateFigureDifficulty(question).metrics.symbolCount));
    questions.push(question);
  }
  return { ...finalize("figure_sequence", questions, profiles, candidatesAttempted, validationFailures, constructionFailures, rules, FIGURE_SEQUENCE_SIMILARITY_WEIGHTS), objectCountDistribution: objectCounts };
}

async function auditEquations(): Promise<ModuleAudit> {
  const questions: MathematicalEquationQuestion[] = [];
  const profiles: StructuralProfile[] = [];
  const fingerprints = new Set<string>();
  const rules: Record<string, number> = {};
  const graphs: Record<string, number> = {};
  let candidatesAttempted = 0;
  let validationFailures = 0;
  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    if (index % 50 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    const configuration = { seed: `diversity-equation-${index}`, difficulty: difficulty(index), maxAttempts: 100 } as const;
    const question = generateValidatedMathematicalEquation(configuration, fingerprints, new Set(), profiles.slice(-RECENT_WINDOW));
    for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
      const candidate = mathematicalEquationGenerator.generate(configuration, attempt);
      if (!mathematicalEquationValidator.validate(candidate, configuration.difficulty).valid) validationFailures += 1;
    }
    candidatesAttempted += question.metadata.attemptCount;
    fingerprints.add(question.metadata.fingerprint);
    const profile = mathematicalEquationStructuralProfile(question);
    profiles.push(profile);
    increment(rules, question.structuredData.dependencyModel.family);
    increment(graphs, question.structuredData.dependencyModel.family);
    questions.push(question);
  }
  return { ...finalize("mathematical_equation", questions, profiles, candidatesAttempted, validationFailures, 0, rules, MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS), dependencyGraphDistribution: graphs };
}

async function auditLatinSquares(): Promise<ModuleAudit> {
  const questions: LatinSquareQuestion[] = [];
  const profiles: StructuralProfile[] = [];
  const fingerprints = new Set<string>();
  const rules: Record<string, number> = {};
  const depths: number[] = [];
  let candidatesAttempted = 0;
  let validationFailures = 0;
  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    if (index % 50 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    const configuration = { seed: `diversity-latin-${index}`, difficulty: difficulty(index), maxAttempts: 5_000 } as const;
    const question = generateValidatedLatinSquare(configuration, fingerprints, profiles.slice(-RECENT_WINDOW));
    for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
      const candidate = latinSquareGenerator.generate(configuration, attempt);
      if (!latinSquareValidator.validate(candidate, configuration.difficulty).valid) validationFailures += 1;
    }
    candidatesAttempted += question.metadata.attemptCount;
    fingerprints.add(question.metadata.fingerprint);
    const analysis = analyzeLatinDeductions(question);
    const metrics = calculateLatinDifficulty(question, analysis)?.metrics;
    const profile = latinSquareStructuralProfile(question);
    profiles.push(profile);
    increment(rules, String(profile.features.classification));
    if (metrics) depths.push(metrics.targetDepth);
    questions.push(question);
  }
  return { ...finalize("latin_square", questions, profiles, candidatesAttempted, validationFailures, 0, rules, LATIN_SQUARE_SIMILARITY_WEIGHTS), averageDeductionDepth: rounded(average(depths)) };
}

function markdown(audits: readonly ModuleAudit[]): string {
  return [
    "# Generator health report",
    "",
    `Accepted ${audits.reduce((sum, audit) => sum + audit.accepted, 0)} questions (${SAMPLE_SIZE} per module).`,
    "",
    "Diversity score = 100 × (0.35 × unique structural ratio + 0.35 × normalized rule-distribution entropy + 0.30 × (1 − recent near-clone rate)). A near-clone has similarity ≥ 0.90.",
    "",
    "| Module | Diversity | Unique structures | Avg questions/structure | Structural duplicate rate | Exact duplicate rate | Avg recent similarity | Validation failure rate | Reference max/mean | >.90/.80/.70 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...audits.map((audit) => `| ${audit.module} | ${audit.diversityScore} | ${audit.uniqueRuleFingerprints} | ${audit.averageQuestionsPerRuleFingerprint} | ${audit.structuralDuplicateRate} | ${audit.exactDuplicateRate} | ${audit.averageRecentSimilarity ?? "n/a"} | ${audit.validationFailureRate} | ${audit.referenceSimilarity.tracked ? `${audit.referenceSimilarity.maximum}/${audit.referenceSimilarity.mean}` : "not tracked"} | ${audit.referenceSimilarity.above090}/${audit.referenceSimilarity.above080}/${audit.referenceSimilarity.above070} |`),
    "",
    "Reference similarity is reported only where normalized reference evidence is present in the repository. No official question bodies are stored.",
    "",
    ...audits.flatMap((audit) => [
      `## ${audit.module}`,
      "",
      `- Difficulty distribution: ${JSON.stringify(audit.difficultyDistribution)}`,
      `- Rule distribution: ${JSON.stringify(audit.ruleDistribution)}`,
      `- Candidate attempts: ${audit.candidatesAttempted}; validation failures: ${audit.validationFailures}; construction failures: ${audit.constructionFailures}; novelty/duplicate rejections: ${audit.noveltyOrDuplicateRejections}.`,
      `- Largest exact structural cluster: ${(audit.largestStructureShare * 100).toFixed(2)}%; top fingerprints: ${audit.topStructuralFingerprints.map((item) => `${item.fingerprint}=${item.count}`).join(", ")}.`,
      ...(audit.dependencyGraphDistribution ? [`- Dependency graphs: ${JSON.stringify(audit.dependencyGraphDistribution)}`] : []),
      ...(audit.objectCountDistribution ? [`- Figure object counts: ${JSON.stringify(audit.objectCountDistribution)}`] : []),
      ...(audit.averageDeductionDepth !== undefined ? [`- Average target deduction depth: ${audit.averageDeductionDepth}.`] : []),
      "",
    ]),
    "## Recommended improvements",
    "",
    "- Figure Sequences: add more specification-supported low-complexity compositions and rebalance the largest movement clusters.",
    "- Mathematical Equations: broaden easy two-variable relationship shapes while preserving the 1-20 integer domain and independent uniqueness proof.",
    "- Latin Squares: make clue removal more goal-directed to reduce the high rejected-candidate rate without relaxing validation.",
    "- Reference protection: add normalized profiles for the actual Figure and Latin reference questions when those source structures are available.",
    "",
  ].join("\n");
}

describe.skipIf(!ENABLED)("6,000-question generator diversity audit", () => {
  it("measures validation, structural diversity, rule coverage, and reference similarity", async () => {
    expect(Number.isSafeInteger(SAMPLE_SIZE) && SAMPLE_SIZE > 0).toBe(true);
    const audits = [await auditFigures(), await auditEquations(), await auditLatinSquares()];
    const report = {
      generatedAt: new Date().toISOString(),
      sampleSizePerModule: SAMPLE_SIZE,
      totalAccepted: audits.reduce((sum, audit) => sum + audit.accepted, 0),
      diversityFormula: "100 * (0.35 * uniqueStructuralRatio + 0.35 * normalizedRuleEntropy + 0.30 * (1 - recentNearCloneRateAt0.90))",
      audits,
    };
    const directory = resolve(process.cwd(), "reports");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "generator-health.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(resolve(directory, "generator-health.md"), markdown(audits));
    expect(report.totalAccepted).toBe(SAMPLE_SIZE * 3);
    expect(audits.every((audit) => audit.exactDuplicateRate === 0)).toBe(true);
    expect(audits.every((audit) => audit.difficultyDistribution.easy > 0 && audit.difficultyDistribution.medium > 0 && audit.difficultyDistribution.hard > 0)).toBe(true);
  }, 1_200_000);
});
