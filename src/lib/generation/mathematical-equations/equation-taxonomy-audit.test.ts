import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { assessStructuralNovelty, calculateStructuralSimilarity, fingerprintStructuralProfile, type StructuralProfile } from "../novelty";
import { referenceProfilesFor } from "../reference-protection";
import { calculateEquationDifficulty } from "./difficulty";
import {
  fingerprintMathematicalEquation,
  MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
  mathematicalEquationStructuralProfile,
} from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import { generateValidatedMathematicalEquation } from "./pipeline";
import { equationVariables, mathematicalEquationSolver } from "./solver";
import { inspectMathematicalEquationStyle } from "./style";
import { EQUATION_GRAPH_REGISTRY, EQUATION_RELATIONSHIP_REGISTRY } from "./taxonomy";
import type {
  MathematicalExpression,
  MathematicalEquationQuestion,
} from "./types";
import { mathematicalEquationValidator } from "./validator";

const ENABLED = process.env.DMAT_EQUATION_TAXONOMY_AUDIT === "1";
const SAMPLE_SIZE = Number(process.env.DMAT_EQUATION_AUDIT_SAMPLE_SIZE ?? 5_000);
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const RECENT_WINDOW = 3;

const rounded = (value: number) => Number(value.toFixed(4));
const average = (values: readonly number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function entropy(distribution: Readonly<Record<string, number>>): number {
  const counts = Object.values(distribution).filter((count) => count > 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (counts.length <= 1 || total === 0) return 0;
  return -counts.reduce((sum, count) => {
    const probability = count / total;
    return sum + probability * Math.log(probability);
  }, 0) / Math.log(counts.length);
}

function difficulty(index: number): typeof DIFFICULTIES[number] {
  return DIFFICULTIES[index % DIFFICULTIES.length];
}

function percentageDistribution(distribution: Readonly<Record<string, number>>, total: number) {
  return Object.fromEntries(Object.entries(distribution).map(([key, count]) => [key, {
    count,
    percentage: rounded(100 * count / total),
  }]));
}

function expressionConstants(expression: MathematicalExpression): number[] {
  if (expression.kind === "constant") return [expression.value];
  if (expression.kind === "variable") return [];
  return [...expressionConstants(expression.left), ...expressionConstants(expression.right)];
}

function percentile(values: readonly number[], percentage: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.max(0, Math.ceil(percentage * sorted.length) - 1)];
}

function numericSummary(values: readonly number[]) {
  return {
    count: values.length,
    buckets: {
      "<=20": values.filter((value) => value <= 20).length,
      "21-30": values.filter((value) => value >= 21 && value <= 30).length,
      "31-40": values.filter((value) => value >= 31 && value <= 40).length,
      "41-60": values.filter((value) => value >= 41 && value <= 60).length,
      ">60": values.filter((value) => value > 60).length,
    },
    mean: rounded(average(values)),
    median: percentile(values, 0.5),
    maximum: Math.max(0, ...values),
    p90: percentile(values, 0.9),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
  };
}

function initializedValueDistribution(): Record<string, number> {
  return Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 0]));
}

function hiddenValueSummary(distribution: Readonly<Record<string, number>>) {
  const values = Object.entries(distribution).flatMap(([value, count]) =>
    Array.from({ length: count }, () => Number(value)),
  );
  const total = values.length;
  const largest = Object.entries(distribution).sort((first, second) => second[1] - first[1])[0];
  return {
    frequencies: distribution,
    mean: rounded(average(values)),
    median: percentile(values, 0.5),
    entropy: rounded(entropy(distribution)),
    largestValueShare: total ? rounded((largest?.[1] ?? 0) / total) : 0,
    largestValue: largest?.[0] ?? null,
  };
}

function formulas(question: MathematicalEquationQuestion): string[] {
  return question.presentation.blocks.flatMap((block) => block.kind === "formula" ? [block.expression] : []);
}

function developmentSample(question: MathematicalEquationQuestion) {
  const novelty = question.metadata.novelty;
  const similarities = [novelty?.maximumReferenceSimilarity, novelty?.maximumRecentSimilarity]
    .filter((value): value is number => value !== null && value !== undefined);
  return {
    seed: question.metadata.seed,
    equations: formulas(question),
    hiddenSolution: question.correctAnswer,
    targetVariable: question.structuredData.dependencyModel.targetSymbol,
    graphFamily: question.structuredData.dependencyModel.family,
    relationshipPrimitives: question.structuredData.dependencyModel.relationshipPrimitives,
    visibleConstants: inspectMathematicalEquationStyle(question).visibleConstants,
    mentalArithmeticCost: calculateEquationDifficulty(question).metrics.mentalArithmeticCost,
    calculatedDifficulty: question.metadata.calculatedDifficulty,
    structuralFingerprint: question.metadata.ruleFingerprint,
    noveltyScore: rounded(1 - (similarities.length ? Math.max(...similarities) : 0)),
  };
}

function markdown(report: Record<string, unknown>): string {
  const graph = report.graphDistribution as Record<string, { count: number; percentage: number }>;
  const relationships = report.relationshipDistribution as Record<string, { count: number; percentage: number }>;
  const samples = report.developmentSamples as Record<string, ReturnType<typeof developmentSample>[]>;
  return [
    "# Mathematical Equations taxonomy audit",
    "",
    `Accepted: ${report.accepted}; attempts: ${report.totalGenerationAttempts}.`,
    `Diversity score: ${report.diversityScore}. Formula: ${report.diversityFormula}.`,
    `Unique structural fingerprints: ${report.uniqueStructuralFingerprints}; structural duplicate rate: ${report.structuralDuplicateRate}; average questions per structure: ${report.averageQuestionsPerStructure}.`,
    `Largest structural cluster: ${JSON.stringify(report.largestStructuralCluster)}.`,
    "",
    "## Like-for-like comparison",
    "",
    `\`\`\`json\n${JSON.stringify(report.baselineComparison, null, 2)}\n\`\`\``,
    "",
    "## Rejections",
    "",
    `- Validator rejection rate: ${report.validatorRejectionRate}`,
    `- Style rejection rate: ${report.styleRejectionRate}`,
    `- Difficulty rejection rate: ${report.difficultyRejectionRate}`,
    `- Novelty rejection rate: ${report.noveltyRejectionRate}`,
    `- Semantic-duplicate rejection rate: ${report.semanticDuplicateRejectionRate}`,
    `- Reference-near-clone rejection rate: ${report.referenceNearCloneRejectionRate}`,
    `- Recent-near-clone rejection rate: ${report.recentNearCloneRejectionRate}`,
    `- Construction rejection rate: ${report.constructionRejectionRate}`,
    "",
    "## Graph distribution",
    "",
    "| Graph | Count | Percentage |",
    "| --- | ---: | ---: |",
    ...Object.entries(graph).map(([name, value]) => `| ${name} | ${value.count} | ${value.percentage}% |`),
    "",
    "## Relationship distribution",
    "",
    "| Relationship | Count | Percentage |",
    "| --- | ---: | ---: |",
    ...Object.entries(relationships).map(([name, value]) => `| ${name} | ${value.count} | ${value.percentage}% |`),
    "",
    "## Style audit",
    "",
    `\`\`\`json\n${JSON.stringify(report.styleAudit, null, 2)}\n\`\`\``,
    "",
    "## Visible constants by difficulty",
    "",
    `\`\`\`json\n${JSON.stringify(report.visibleConstantsByDifficulty, null, 2)}\n\`\`\``,
    "",
    "## Visible constants by relationship",
    "",
    `\`\`\`json\n${JSON.stringify(report.visibleConstantsByRelationship, null, 2)}\n\`\`\``,
    "",
    "## Graph distribution by difficulty",
    "",
    `\`\`\`json\n${JSON.stringify(report.graphDistributionByDifficulty, null, 2)}\n\`\`\``,
    "",
    "## Relationship distribution by difficulty",
    "",
    `\`\`\`json\n${JSON.stringify(report.relationshipDistributionByDifficulty, null, 2)}\n\`\`\``,
    "",
    "## Hidden value distribution",
    "",
    `\`\`\`json\n${JSON.stringify(report.hiddenValueAudit, null, 2)}\n\`\`\``,
    "",
    "## Mental arithmetic cost",
    "",
    `\`\`\`json\n${JSON.stringify(report.mentalArithmeticCostByDifficulty, null, 2)}\n\`\`\``,
    "",
    "## Efficiency comparison",
    "",
    `\`\`\`json\n${JSON.stringify(report.efficiencyComparison, null, 2)}\n\`\`\``,
    "",
    "## Previous-audit comparison",
    "",
    `\`\`\`json\n${JSON.stringify(report.previousAuditComparison, null, 2)}\n\`\`\``,
    "",
    "## Reasoning audit",
    "",
    `\`\`\`json\n${JSON.stringify(report.reasoningAudit, null, 2)}\n\`\`\``,
    "",
    "## Reference similarity",
    "",
    `\`\`\`json\n${JSON.stringify(report.referenceSimilarity, null, 2)}\n\`\`\``,
    "",
    "## Development samples (hidden solutions; never student-facing)",
    "",
    ...Object.entries(samples).flatMap(([level, items]) => [
      `### ${level}`,
      "",
      ...items.flatMap((sample, index) => [
        `#### ${index + 1}. ${sample.graphFamily}`,
        "",
        ...sample.equations.map((equation) => `- ${equation}`),
        `- Seed: ${sample.seed}`,
        `- Hidden solution: ${JSON.stringify(sample.hiddenSolution)}`,
        `- Target: ${sample.targetVariable}`,
        `- Relationships: ${sample.relationshipPrimitives?.join(", ")}`,
        `- Visible constants: ${sample.visibleConstants.join(", ")}`,
        `- Mental arithmetic cost: ${sample.mentalArithmeticCost}`,
        `- Calculated difficulty: ${sample.calculatedDifficulty}`,
        `- Structural fingerprint: ${sample.structuralFingerprint}`,
        `- Novelty score: ${sample.noveltyScore}`,
        "",
      ]),
    ]),
  ].join("\n");
}

describe.skipIf(!ENABLED)("5,000-question Mathematical Equations taxonomy audit", () => {
  it("measures structural diversity, graph balance, style, reasoning, and reference similarity", async () => {
    expect(Number.isSafeInteger(SAMPLE_SIZE) && SAMPLE_SIZE >= 30).toBe(true);
    const questions: MathematicalEquationQuestion[] = [];
    const profiles: StructuralProfile[] = [];
    const acceptedFingerprints = new Set<string>();
    const graphCounts = Object.fromEntries(EQUATION_GRAPH_REGISTRY.map((item) => [item.id, 0]));
    const relationshipCounts = Object.fromEntries(EQUATION_RELATIONSHIP_REGISTRY.map((item) => [item.id, 0]));
    const graphCountsByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => [
      level,
      Object.fromEntries(EQUATION_GRAPH_REGISTRY.map((item) => [item.id, 0])),
    ])) as Record<typeof DIFFICULTIES[number], Record<string, number>>;
    const relationshipCountsByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => [
      level,
      Object.fromEntries(EQUATION_RELATIONSHIP_REGISTRY.map((item) => [item.id, 0])),
    ])) as Record<typeof DIFFICULTIES[number], Record<string, number>>;
    const constantsByDifficulty: Record<typeof DIFFICULTIES[number], number[]> = { easy: [], medium: [], hard: [] };
    const constantsByRelationship = Object.fromEntries(EQUATION_RELATIONSHIP_REGISTRY.map((item) => [item.id, []])) as Record<string, number[]>;
    const hiddenValues = initializedValueDistribution();
    const hiddenValuesByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => [level, initializedValueDistribution()])) as Record<typeof DIFFICULTIES[number], Record<string, number>>;
    const hiddenValuesByRelationship = Object.fromEntries(EQUATION_RELATIONSHIP_REGISTRY.map((item) => [item.id, initializedValueDistribution()])) as Record<string, Record<string, number>>;
    const mentalCostsByDifficulty: Record<typeof DIFFICULTIES[number], number[]> = { easy: [], medium: [], hard: [] };
    const evidenceCounts: Record<string, number> = {};
    const targetCounts: Record<string, number> = {};
    const reasoningDistributions = {
      variableCount: {} as Record<string, number>,
      equationCount: {} as Record<string, number>,
      dependencyDepth: {} as Record<string, number>,
      substitutionDepth: {} as Record<string, number>,
      targetDepth: {} as Record<string, number>,
      difficulty: {} as Record<string, number>,
      graphFamily: {} as Record<string, number>,
      operatorVariety: {} as Record<string, number>,
    };
    let totalGenerationAttempts = 0;
    let validatorRejections = 0;
    let styleRejections = 0;
    let difficultyRejections = 0;
    let noveltyRejections = 0;
    let semanticDuplicateRejections = 0;
    let referenceNearCloneRejections = 0;
    let recentNearCloneRejections = 0;
    let constructionRejections = 0;

    for (let index = 0; index < SAMPLE_SIZE; index += 1) {
      if (index % 50 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
      const requestedDifficulty = difficulty(index);
      const configuration = {
        seed: `equation-taxonomy-audit-${index}`,
        difficulty: requestedDifficulty,
        maxAttempts: 100,
      } as const;
      const recent = profiles.slice(-RECENT_WINDOW);
      const acceptedBefore = new Set(acceptedFingerprints);
      let question: MathematicalEquationQuestion;
      try {
        question = generateValidatedMathematicalEquation(configuration, acceptedFingerprints, new Set(), recent);
      } catch (error) {
        console.error(`Equation audit failed at index ${index}, difficulty ${requestedDifficulty}.`);
        throw error;
      }
      totalGenerationAttempts += question.metadata.attemptCount;

      for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
        try {
          const candidate = mathematicalEquationGenerator.generate(configuration, attempt);
          const validation = mathematicalEquationValidator.validate(candidate, requestedDifficulty);
          if (!validation.valid) {
            if (validation.issues.some((item) => item.code.startsWith("style_"))) styleRejections += 1;
            else if (validation.issues.some((item) => item.code === "difficulty_mismatch")) difficultyRejections += 1;
            else validatorRejections += 1;
            continue;
          }
          if (acceptedBefore.has(fingerprintMathematicalEquation(candidate))) {
            noveltyRejections += 1;
            semanticDuplicateRejections += 1;
            continue;
          }
          const novelty = assessStructuralNovelty(mathematicalEquationStructuralProfile(candidate), {
            references: referenceProfilesFor("mathematical_equation"),
            recent,
            weights: MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
          });
          if (!novelty.accepted) {
            noveltyRejections += 1;
            if (novelty.maximumReferenceSimilarity !== null &&
              novelty.maximumReferenceSimilarity >= novelty.referenceThreshold) referenceNearCloneRejections += 1;
            else recentNearCloneRejections += 1;
          }
        } catch {
          constructionRejections += 1;
        }
      }

      acceptedFingerprints.add(question.metadata.fingerprint);
      const profile = mathematicalEquationStructuralProfile(question);
      profiles.push(profile);
      questions.push(question);
      const dependency = question.structuredData.dependencyModel;
      increment(graphCounts, dependency.family);
      increment(graphCountsByDifficulty[requestedDifficulty], dependency.family);
      (dependency.relationshipPrimitives ?? []).forEach((relationship) => {
        increment(relationshipCounts, relationship);
        increment(relationshipCountsByDifficulty[requestedDifficulty], relationship);
      });
      increment(evidenceCounts, dependency.evidenceLevel ?? "missing");
      increment(targetCounts, dependency.targetSymbol ?? "missing");
      const metrics = calculateEquationDifficulty(question).metrics;
      mentalCostsByDifficulty[requestedDifficulty].push(metrics.mentalArithmeticCost);
      increment(reasoningDistributions.variableCount, String(metrics.variableCount));
      increment(reasoningDistributions.equationCount, String(metrics.equationCount));
      increment(reasoningDistributions.dependencyDepth, String(metrics.dependencyDepth));
      increment(reasoningDistributions.substitutionDepth, String(metrics.substitutionCount));
      increment(reasoningDistributions.targetDepth, String(metrics.targetDepth));
      increment(reasoningDistributions.difficulty, question.metadata.calculatedDifficulty);
      increment(reasoningDistributions.graphFamily, dependency.family);
      increment(reasoningDistributions.operatorVariety, String(metrics.operatorVariety));
      Object.values(question.correctAnswer).forEach((value) => {
        increment(hiddenValues, String(value));
        increment(hiddenValuesByDifficulty[requestedDifficulty], String(value));
      });
      question.structuredData.equations.forEach((equation, equationIndex) => {
        const relationship = dependency.relationshipPrimitives?.[equationIndex] ?? "missing";
        const displayed = [...expressionConstants(equation.left), ...expressionConstants(equation.right)];
        constantsByDifficulty[requestedDifficulty].push(...displayed);
        constantsByRelationship[relationship] ??= [];
        constantsByRelationship[relationship].push(...displayed);
        hiddenValuesByRelationship[relationship] ??= initializedValueDistribution();
        equationVariables(equation).forEach((symbol) =>
          increment(hiddenValuesByRelationship[relationship], String(question.correctAnswer[symbol])),
        );
      });
    }

    const semanticFingerprints = questions.map((question) => question.metadata.fingerprint);
    const structuralFingerprints = questions.map((question) =>
      question.metadata.ruleFingerprint ?? fingerprintStructuralProfile(mathematicalEquationStructuralProfile(question)),
    );
    const structureCounts: Record<string, number> = {};
    structuralFingerprints.forEach((fingerprint) => increment(structureCounts, fingerprint));
    const uniqueStructuralFingerprints = Object.keys(structureCounts).length;
    const recentSimilarities = questions.flatMap((question) =>
      question.metadata.novelty?.maximumRecentSimilarity == null
        ? []
        : [question.metadata.novelty.maximumRecentSimilarity],
    );
    const nearCloneRate = recentSimilarities.filter((value) => value >= 0.9).length / Math.max(1, recentSimilarities.length);
    const graphEntropy = entropy(graphCounts);
    const diversityScore = 100 * (
      0.35 * uniqueStructuralFingerprints / questions.length +
      0.35 * graphEntropy +
      0.3 * (1 - nearCloneRate)
    );
    const references = referenceProfilesFor("mathematical_equation");
    const referenceSimilarities = profiles.map((profile) => Math.max(...references.map((reference) =>
      calculateStructuralSimilarity(profile, reference, MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS),
    )));
    const styleMetrics = questions.map(inspectMathematicalEquationStyle);
    const visibleConstants = styleMetrics.flatMap((metrics) => metrics.visibleConstants);
    const coefficients = styleMetrics.flatMap((metrics) => metrics.coefficients);
    const coefficientCounts: Record<string, number> = {};
    coefficients.forEach((coefficient) => increment(coefficientCounts, String(coefficient)));
    const allSolutions = questions.map((question) => mathematicalEquationSolver.solve(question));
    const developmentSamples = Object.fromEntries(DIFFICULTIES.map((level) => [
      level,
      questions.filter((question) => question.metadata.calculatedDifficulty === level).slice(0, 10).map(developmentSample),
    ]));
    const sortedStructures = Object.entries(structureCounts).sort((first, second) => second[1] - first[1]);
    const comparisonQuestions = questions.slice(0, Math.min(2_000, questions.length));
    const comparisonStructures = new Set(comparisonQuestions.map((question) => question.metadata.ruleFingerprint));
    const comparisonGraphs: Record<string, number> = {};
    comparisonQuestions.forEach((question) => increment(comparisonGraphs, question.structuredData.dependencyModel.family));
    const comparisonRecentSimilarities = comparisonQuestions.flatMap((question) =>
      question.metadata.novelty?.maximumRecentSimilarity == null
        ? []
        : [question.metadata.novelty.maximumRecentSimilarity],
    );
    const comparisonNearCloneRate = comparisonRecentSimilarities.filter((value) => value >= 0.9).length /
      Math.max(1, comparisonRecentSimilarities.length);
    const comparisonStructuralDuplicateRate = 1 - comparisonStructures.size / comparisonQuestions.length;
    const comparisonDiversityScore = 100 * (
      0.35 * comparisonStructures.size / comparisonQuestions.length +
      0.35 * entropy(comparisonGraphs) +
      0.3 * (1 - comparisonNearCloneRate)
    );
    const graphDistributionByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => {
      const total = questions.filter((question) => question.metadata.requestedDifficulty === level).length;
      return [level, percentageDistribution(graphCountsByDifficulty[level], total)];
    }));
    const relationshipDistributionByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => {
      const total = Object.values(relationshipCountsByDifficulty[level]).reduce((sum, count) => sum + count, 0);
      return [level, percentageDistribution(relationshipCountsByDifficulty[level], total)];
    }));
    const visibleConstantsByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) =>
      [level, numericSummary(constantsByDifficulty[level])],
    ));
    const visibleConstantsByRelationship = Object.fromEntries(EQUATION_RELATIONSHIP_REGISTRY.map((definition) =>
      [definition.id, numericSummary(constantsByRelationship[definition.id] ?? [])],
    ));
    const hiddenValueAudit = {
      overall: hiddenValueSummary(hiddenValues),
      byDifficulty: Object.fromEntries(DIFFICULTIES.map((level) =>
        [level, hiddenValueSummary(hiddenValuesByDifficulty[level])],
      )),
      byRelationship: Object.fromEntries(EQUATION_RELATIONSHIP_REGISTRY.map((definition) =>
        [definition.id, hiddenValueSummary(hiddenValuesByRelationship[definition.id])],
      )),
    };
    const mentalArithmeticCostByDifficulty = Object.fromEntries(DIFFICULTIES.map((level) => [level, {
      mean: rounded(average(mentalCostsByDifficulty[level])),
      median: percentile(mentalCostsByDifficulty[level], 0.5),
      p90: percentile(mentalCostsByDifficulty[level], 0.9),
      maximum: Math.max(0, ...mentalCostsByDifficulty[level]),
    }]));
    const relationshipTotal = Object.values(relationshipCounts).reduce((sum, count) => sum + count, 0);
    const relationshipShare = (relationship: string) => rounded((relationshipCounts[relationship] ?? 0) / relationshipTotal);
    const easyGraphCounts = graphCountsByDifficulty.easy;
    const easyTotal = Object.values(easyGraphCounts).reduce((sum, count) => sum + count, 0);
    const easySorted = Object.entries(easyGraphCounts).sort((first, second) => second[1] - first[1]);
    const report = {
      generatedAt: new Date().toISOString(),
      accepted: questions.length,
      totalGenerationAttempts,
      validatorRejectionRate: rounded(validatorRejections / totalGenerationAttempts),
      styleRejectionRate: rounded(styleRejections / totalGenerationAttempts),
      difficultyRejectionRate: rounded(difficultyRejections / totalGenerationAttempts),
      noveltyRejectionRate: rounded(noveltyRejections / totalGenerationAttempts),
      semanticDuplicateRejectionRate: rounded(semanticDuplicateRejections / totalGenerationAttempts),
      referenceNearCloneRejectionRate: rounded(referenceNearCloneRejections / totalGenerationAttempts),
      recentNearCloneRejectionRate: rounded(recentNearCloneRejections / totalGenerationAttempts),
      constructionRejectionRate: rounded(constructionRejections / totalGenerationAttempts),
      exactDuplicateRate: rounded(1 - new Set(semanticFingerprints).size / questions.length),
      structuralDuplicateRate: rounded(1 - uniqueStructuralFingerprints / questions.length),
      uniqueStructuralFingerprints,
      averageQuestionsPerStructure: rounded(questions.length / uniqueStructuralFingerprints),
      largestStructuralCluster: {
        fingerprint: sortedStructures[0]?.[0] ?? null,
        count: sortedStructures[0]?.[1] ?? 0,
        percentage: rounded(100 * (sortedStructures[0]?.[1] ?? 0) / questions.length),
      },
      topStructuralFingerprints: sortedStructures.slice(0, 10).map(([fingerprint, count]) => ({ fingerprint, count })),
      diversityFormula: "100 * (0.35 * uniqueStructuralRatio + 0.35 * normalizedGraphEntropy + 0.30 * (1 - recentNearCloneRateAt0.90))",
      diversityScore: rounded(diversityScore),
      averageStructuralSimilarity: rounded(average(recentSimilarities)),
      recentNearCloneRateAt090: rounded(nearCloneRate),
      graphEntropy: rounded(graphEntropy),
      graphDistribution: percentageDistribution(graphCounts, questions.length),
      graphDistributionByDifficulty,
      easyGraphSummary: {
        largestGraph: easySorted[0]?.[0] ?? null,
        largestGraphShare: rounded((easySorted[0]?.[1] ?? 0) / easyTotal),
        directShare: rounded((easyGraphCounts.direct ?? 0) / easyTotal),
        nonDirectShare: rounded(1 - (easyGraphCounts.direct ?? 0) / easyTotal),
      },
      relationshipDistribution: percentageDistribution(
        relationshipCounts,
        relationshipTotal,
      ),
      relationshipDistributionByDifficulty,
      evidenceDistribution: evidenceCounts,
      targetVariableDistribution: targetCounts,
      referenceSimilarity: {
        maximum: rounded(Math.max(...referenceSimilarities)),
        mean: rounded(average(referenceSimilarities)),
        above090: referenceSimilarities.filter((value) => value > 0.9).length,
        above080: referenceSimilarities.filter((value) => value > 0.8).length,
        above070: referenceSimilarities.filter((value) => value > 0.7).length,
      },
      styleAudit: {
        variablesOutsideOneToTwenty: questions.reduce((count, question) =>
          count + Object.values(question.correctAnswer).filter((value) => value < 1 || value > 20).length, 0),
        nonIntegerSolutions: questions.reduce((count, question) =>
          count + Object.values(question.correctAnswer).filter((value) => !Number.isInteger(value)).length, 0),
        nonUniqueSystems: allSolutions.filter((outcome) => outcome.status !== "unique").length,
        negativeDisplayedConstants: visibleConstants.filter((value) => value < 0).length,
        constantsAbove20: visibleConstants.filter((value) => value > 20).length,
        maximumDisplayedConstant: Math.max(...visibleConstants),
        averageDisplayedConstant: rounded(average(visibleConstants)),
        averageCoefficient: rounded(average(coefficients)),
        maximumCoefficient: Math.max(...coefficients),
        coefficientDistribution: percentageDistribution(coefficientCounts, coefficients.length),
        mentalArithmeticCost: numericSummary(styleMetrics.map((metrics) => metrics.mentalArithmeticCost)),
        presentationPenalty: numericSummary(styleMetrics.map((metrics) => metrics.presentationPenalty)),
      },
      visibleConstants: numericSummary(visibleConstants),
      visibleConstantsByDifficulty,
      visibleConstantsByRelationship,
      hiddenValueAudit,
      mentalArithmeticCostByDifficulty,
      efficiencyComparison: {
        oldAccepted: 5_000,
        oldAttempts: 5_776,
        oldAttemptsPerAccepted: 1.1552,
        phase4Accepted: questions.length,
        phase4Attempts: totalGenerationAttempts,
        phase4AttemptsPerAccepted: rounded(totalGenerationAttempts / questions.length),
        oldObservedConstructionRejectionRate: 0,
        phase4ObservedConstructionRejectionRate: rounded(constructionRejections / totalGenerationAttempts),
        relationshipFeasibility: {
          scale: { oldShare: 0.010467, phase4Share: relationshipShare("scale") },
          divideByConstant: { oldShare: 0.015534, phase4Share: relationshipShare("divide_by_constant") },
          weightedSum: { oldShare: 0.161211, phase4Share: relationshipShare("weighted_sum") },
          note: "The previous generator did not expose internal per-relationship value-resampling failures. Comparison therefore uses accepted occurrence and observed construction rejection without fabricating unavailable failure counts.",
        },
      },
      previousAuditComparison: {
        oldVisibleConstants: {
          constantsAbove20: 4_508,
          maximum: 40,
          mean: 14.0336,
          detailedBuckets: "unavailable: the Phase 3 baseline audit did not record 21-30/31-40/41-60/>60, percentiles, or per-difficulty buckets",
          above20ByRelationshipFromFirstAttemptDiagnostic: {
            complement: 975,
            multi_variable_balance: 138,
            multi_variable_sum: 745,
            sum: 982,
            weighted_sum: 1_660,
          },
        },
        phase4VisibleConstants: numericSummary(visibleConstants),
        oldRelationshipDistribution: {
          direct_value: 0.165811,
          offset_add: 0.052403,
          offset_subtract: 0.05407,
          scale: 0.010467,
          divide_by_constant: 0.015534,
          sum: 0.122475,
          difference: 0.108874,
          complement: 0.120875,
          weighted_sum: 0.161211,
          multi_variable_sum: 0.058671,
          multi_variable_balance: 0.129609,
        },
        phase4RelationshipDistribution: percentageDistribution(relationshipCounts, relationshipTotal),
        oldEasyGraphDistribution: { direct: 1, nonDirect: 0 },
        phase4EasyGraphSummary: {
          largestGraph: easySorted[0]?.[0] ?? null,
          largestGraphShare: rounded((easySorted[0]?.[1] ?? 0) / easyTotal),
          directShare: rounded((easyGraphCounts.direct ?? 0) / easyTotal),
          nonDirectShare: rounded(1 - (easyGraphCounts.direct ?? 0) / easyTotal),
        },
        oldFirstAttemptHiddenValues: hiddenValueSummary({
          "1": 765, "2": 812, "3": 824, "4": 851, "5": 786,
          "6": 823, "7": 751, "8": 797, "9": 696, "10": 753,
          "11": 705, "12": 782, "13": 688, "14": 757, "15": 689,
          "16": 729, "17": 698, "18": 666, "19": 695, "20": 732,
        }),
        phase4HiddenValues: hiddenValueSummary(hiddenValues),
      },
      reasoningAudit: reasoningDistributions,
      dominantGraphFlags: Object.entries(graphCounts)
        .filter(([, count]) => count / questions.length > 0.4)
        .map(([family, count]) => ({ family, count, percentage: rounded(100 * count / questions.length) })),
      developmentSamples,
      baselineComparison: {
        oldSampleSize: 2_000,
        oldUniqueStructures: 549,
        oldStructuralDuplicateRate: 0.7255,
        oldDiversityScore: 70.5652,
        newSampleSize: comparisonQuestions.length,
        newUniqueStructures: comparisonStructures.size,
        newStructuralDuplicateRate: rounded(comparisonStructuralDuplicateRate),
        newDiversityScore: rounded(comparisonDiversityScore),
        uniqueStructureIncreasePercent: rounded(100 * (comparisonStructures.size - 549) / 549),
        structuralDuplicateRateImprovementPoints: rounded(100 * (0.7255 - comparisonStructuralDuplicateRate)),
        diversityScoreIncrease: rounded(comparisonDiversityScore - 70.5652),
        fingerprintCompatibility: "unchanged Structural Fingerprint V2 semantics and weights",
      },
    };

    const directory = resolve(process.cwd(), "reports", "mathematical-equations");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "taxonomy-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(resolve(directory, "taxonomy-audit.md"), markdown(report));

    expect(report.accepted).toBe(SAMPLE_SIZE);
    expect(report.exactDuplicateRate).toBe(0);
    expect(report.styleAudit.variablesOutsideOneToTwenty).toBe(0);
    expect(report.styleAudit.nonIntegerSolutions).toBe(0);
    expect(report.styleAudit.nonUniqueSystems).toBe(0);
    expect(report.styleAudit.negativeDisplayedConstants).toBe(0);
    expect(report.relationshipDistribution.scale.percentage).toBeGreaterThan(3);
    expect(report.relationshipDistribution.divide_by_constant.percentage).toBeGreaterThan(3);
    expect(report.easyGraphSummary.nonDirectShare).toBeGreaterThan(0.5);
    expect(report.hiddenValueAudit.overall.entropy).toBeGreaterThan(0.97);
    expect(report.hiddenValueAudit.overall.largestValueShare).toBeLessThan(0.085);
    expect(report.mentalArithmeticCostByDifficulty.easy.mean)
      .toBeLessThan(report.mentalArithmeticCostByDifficulty.hard.mean);
    expect(report.developmentSamples.easy).toHaveLength(10);
    expect(report.developmentSamples.medium).toHaveLength(10);
    expect(report.developmentSamples.hard).toHaveLength(10);
  }, 1_200_000);
});
