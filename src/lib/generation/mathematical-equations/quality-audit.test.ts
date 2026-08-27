import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { calculateEquationDifficulty } from "./difficulty";
import { fingerprintMathematicalEquation, mathematicalEquationStructuralSignature } from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import { generateValidatedMathematicalEquation } from "./pipeline";
import type { MathematicalEquationQuestion } from "./types";
import { mathematicalEquationValidator } from "./validator";

const ENABLED = process.env.DMAT_EQUATION_QUALITY_AUDIT === "1";
const DISTRIBUTION = { easy: 250, medium: 500, hard: 250 } as const;
const SESSION_SIZE = 20;

type Difficulty = keyof typeof DISTRIBUTION;
type AuditFailureCounts = Record<string, number>;

const rounded = (value: number) => Number(value.toFixed(3));
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const formulae = (question: MathematicalEquationQuestion) => question.presentation.blocks
  .filter((block): block is { kind: "formula"; expression: string } => block.kind === "formula")
  .map((block) => block.expression);

function representativeSamples(
  questions: MathematicalEquationQuestion[],
  difficulty: Difficulty,
  count: number,
): MathematicalEquationQuestion[] {
  const selected: MathematicalEquationQuestion[] = [];
  const seenFamilies = new Set<string>();
  const eligible = questions.filter((question) => question.metadata.requestedDifficulty === difficulty);
  for (const question of eligible) {
    const family = question.structuredData.dependencyModel.family;
    if (!seenFamilies.has(family)) {
      selected.push(question);
      seenFamilies.add(family);
    }
  }
  for (const question of eligible) {
    if (selected.length >= count) break;
    if (!selected.includes(question)) selected.push(question);
  }
  return selected.slice(0, count);
}

function markdownSample(question: MathematicalEquationQuestion, index: number): string {
  const metrics = calculateEquationDifficulty(question).metrics;
  return [
    `## ${index + 1}. ${question.metadata.requestedDifficulty.toUpperCase()} — ${question.structuredData.dependencyModel.family}`,
    "",
    "Equations:",
    "",
    ...formulae(question).map((equation) => `- ${equation}`),
    "",
    `Response: enter ${question.response.kind === "symbol_assignment" ? question.response.symbols.join(", ") : "the answer"}.`,
    "",
    "Answer options: Not applicable — this existing section uses native symbol-assignment inputs, not MCQ.",
    "",
    `Correct answer: ${Object.entries(question.correctAnswer).map(([symbol, value]) => `${symbol} = ${value}`).join(", ")}`,
    "",
    "Reasoning path:",
    "",
    ...question.reasoningPath.map((step, stepIndex) => `${stepIndex + 1}. ${step}`),
    "",
    `Fastest method: ${question.fastestMethod}`,
    "",
    `Complexity score: ${metrics.score} (variables ${metrics.variableCount}, equations ${metrics.equationCount}, reasoning depth ${metrics.meaningfulReasoningSteps}, hidden groups ${metrics.hiddenGroupingCount}, reversals ${metrics.relationshipReversalCount}).`,
    "",
  ].join("\n");
}

describe.skipIf(!ENABLED)("mathematical-equation 1,000-question quality audit", () => {
  it("accepts every returned question and writes statistics plus twenty review samples", () => {
    const questions: MathematicalEquationQuestion[] = [];
    const failures: AuditFailureCounts = {};
    let duplicateRejections = 0;
    let totalCandidates = 0;
    let regenerated = 0;

    for (const difficulty of Object.keys(DISTRIBUTION) as Difficulty[]) {
      let sessionFingerprints = new Set<string>();
      let sessionStructures = new Set<string>();
      for (let index = 0; index < DISTRIBUTION[difficulty]; index += 1) {
        if (index % SESSION_SIZE === 0) {
          sessionFingerprints = new Set();
          sessionStructures = new Set();
        }
        const configuration = { seed: `quality-audit-${difficulty}-${index}`, difficulty, maxAttempts: 100 } as const;
        const question = generateValidatedMathematicalEquation(configuration, sessionFingerprints, sessionStructures);
        totalCandidates += question.metadata.attemptCount;
        if (question.metadata.attemptCount > 1) regenerated += 1;
        for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
          const candidate = mathematicalEquationGenerator.generate(configuration, attempt);
          const validation = mathematicalEquationValidator.validate(candidate, difficulty);
          if (!validation.valid) {
            for (const validationIssue of validation.issues) {
              failures[validationIssue.code] = (failures[validationIssue.code] ?? 0) + 1;
            }
          } else if (
            sessionFingerprints.has(fingerprintMathematicalEquation(candidate)) ||
            sessionStructures.has(mathematicalEquationStructuralSignature(candidate))
          ) {
            duplicateRejections += 1;
            failures.DUPLICATE_FINGERPRINT = (failures.DUPLICATE_FINGERPRINT ?? 0) + 1;
          }
        }
        const independent = mathematicalEquationValidator.validate(question, difficulty);
        expect(independent.valid).toBe(true);
        expect(question.validation.checks.every((check) => check.passed)).toBe(true);
        expect(question.metadata.requestedDifficulty).toBe(difficulty);
        expect(question.metadata.calculatedDifficulty).toBe(difficulty);
        expect(question.response.kind).toBe("symbol_assignment");
        expect(new Set(Object.keys(question.correctAnswer))).toEqual(new Set(question.structuredData.variables));
        expect(Object.values(question.correctAnswer).every((value) => Number.isInteger(value) && value >= 1 && value <= 20)).toBe(true);
        expect(formulae(question).every((equation) => equation.includes("=") && !equation.includes("*") && !equation.includes("/"))).toBe(true);
        sessionFingerprints.add(question.metadata.fingerprint);
        sessionStructures.add(mathematicalEquationStructuralSignature(question));
        questions.push(question);
      }
    }

    const byDifficulty = Object.fromEntries((Object.keys(DISTRIBUTION) as Difficulty[]).map((difficulty) => {
      const selected = questions.filter((question) => question.metadata.requestedDifficulty === difficulty);
      const metrics = selected.map((question) => calculateEquationDifficulty(question).metrics);
      return [difficulty, {
        count: selected.length,
        averageVariables: rounded(average(metrics.map((item) => item.variableCount))),
        averageEquations: rounded(average(metrics.map((item) => item.equationCount))),
        averageReasoningDepth: rounded(average(metrics.map((item) => item.meaningfulReasoningSteps))),
        averageComplexityScore: rounded(average(metrics.map((item) => item.score))),
      }];
    }));
    const dependencyGraphDistribution = questions.reduce<Record<string, number>>((counts, question) => {
      const family = question.structuredData.dependencyModel.family;
      counts[family] = (counts[family] ?? 0) + 1;
      return counts;
    }, {});
    const samples = [
      ...representativeSamples(questions, "easy", 5),
      ...representativeSamples(questions, "medium", 10),
      ...representativeSamples(questions, "hard", 5),
    ];
    const statistics = {
      generatedAt: new Date().toISOString(),
      totalGenerated: questions.length,
      totalAccepted: questions.length,
      totalRejected: totalCandidates - questions.length,
      totalRegenerated: regenerated,
      candidatesAttempted: totalCandidates,
      requestedDifficultyDistribution: DISTRIBUTION,
      byDifficulty,
      dependencyGraphDistribution,
      positiveIntegerSolutionPercent: 100,
      decimalOrFractionalSolutionPercent: 0,
      validationFailuresByReason: failures,
      duplicateRejectionCount: duplicateRejections,
      responseMode: "symbol_assignment",
      mcqOptionValidation: "not_applicable",
      uniqueFingerprintCount: new Set(questions.map((question) => question.metadata.fingerprint)).size,
      uniqueStructuralSignatureCount: new Set(questions.map(mathematicalEquationStructuralSignature)).size,
    };
    const directory = resolve(process.cwd(), "reports", "mathematical-equations");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "quality-audit.json"), `${JSON.stringify(statistics, null, 2)}\n`);
    writeFileSync(resolve(directory, "manual-review.md"), [
      "# Mathematical Equations manual quality review",
      "",
      "Twenty deterministic samples from the 1,000-question audit: 5 Easy, 10 Medium, and 5 Hard.",
      "",
      ...samples.map(markdownSample),
    ].join("\n"));

    expect(questions).toHaveLength(1_000);
    expect(Object.values(dependencyGraphDistribution).every((count) => count > 0)).toBe(true);
    expect(Object.keys(dependencyGraphDistribution).length).toBeGreaterThanOrEqual(5);
    expect(samples).toHaveLength(20);
    expect(failures).toEqual(duplicateRejections ? { DUPLICATE_FINGERPRINT: duplicateRejections } : {});
  }, 120_000);
});
