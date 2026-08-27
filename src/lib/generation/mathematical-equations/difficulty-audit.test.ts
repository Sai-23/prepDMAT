import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateEquationDifficulty } from "./difficulty";
import {
  fingerprintMathematicalEquation,
  mathematicalEquationStructuralSignature,
} from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import { generateValidatedMathematicalEquation } from "./pipeline";
import { buildCanonicalSolveTrace, validateSolveTraceRange } from "./solve-trace";
import type {
  EquationOperator,
  MathematicalEquationGenerationConfiguration,
  MathematicalEquationQuestion,
  MathematicalExpression,
} from "./types";
import { mathematicalEquationValidator } from "./validator";

const ENABLED = process.env.DMAT_EQUATION_DIFFICULTY_AUDIT === "1";
const SAMPLE_SIZE = 200;
const STRUCTURAL_SESSION_SIZE = 10;

type Difficulty = "easy" | "medium" | "hard";
type AuditRow = {
  difficulty: Difficulty;
  accepted: number;
  candidatesAttempted: number;
  averageVariableCount: number;
  medianVariableCount: number;
  averageEquationCount: number;
  medianEquationCount: number;
  exactVariableCountPercent: number;
  dependencyDepthDistribution: Record<string, number>;
  averageDependencyDepth: number;
  medianDependencyDepth: number;
  averageSolveSteps: number;
  averageSubstitutions: number;
  averageOperatorVariety: number;
  operatorDistribution: Record<EquationOperator, number>;
  compoundExpressionFrequency: number;
  averageCompoundExpressionCount: number;
  branchFrequency: number;
  recombinationFrequency: number;
  indirectEntryFrequency: number;
  averageWorkingMemory: number;
  averageObviousEntryPointPenalty: number;
  averageComplexityScore: number;
  solverRejections: number;
  solverRejectionRate: number;
  duplicateRejections: number;
  duplicateRejectionRate: number;
  outOfDomainRejections: number;
  outOfDomainRejectionRate: number;
  difficultyRejections: number;
  difficultyRejectionRate: number;
  structuralSignatureCount: number;
  structuralSignatureDiversity: number;
  canonicalStructuralDuplicateRate: number;
  withinSessionStructuralDuplicateRate: number;
  familyDistribution: Record<string, number>;
  relationshipFamilyDistribution: Record<string, number>;
  reasoningFamilyDistribution: Record<string, number>;
  dependencyGraphDistribution: Record<string, number>;
  exactDuplicateRate: number;
  structuralDuplicateRate: number;
  presentationOnlyVariationRate: number;
  maximumEvaluatedIntermediate: number;
  minimumEvaluatedIntermediate: number;
  fractionalTraceCount: number;
  negativeTraceCount: number;
  arithmeticRangeViolationCount: number;
  rejectionReasonDistribution: Record<string, number>;
  elapsedMilliseconds: number;
  acceptedPerSecond: number;
  averageCandidateAttempts: number;
};

const rounded = (value: number) => Number(value.toFixed(3));
const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const median = (values: number[]) => {
  const ordered = [...values].sort((first, second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
};

function collectOperators(expression: MathematicalExpression, counts: Record<EquationOperator, number>) {
  if (expression.kind !== "operation") return;
  counts[expression.operator] += 1;
  collectOperators(expression.left, counts);
  collectOperators(expression.right, counts);
}

function auditDifficulty(difficulty: Difficulty): { row: AuditRow; samples: MathematicalEquationQuestion[] } {
  const startedAt = performance.now();
  const acceptedFingerprints = new Set<string>();
  let sessionStructuralSignatures = new Set<string>();
  const questions: MathematicalEquationQuestion[] = [];
  let candidatesAttempted = 0;
  let solverRejections = 0;
  let duplicateRejections = 0;
  let outOfDomainRejections = 0;
  let difficultyRejections = 0;
  const rejectionReasons: Record<string, number> = {};

  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    if (index % STRUCTURAL_SESSION_SIZE === 0) sessionStructuralSignatures = new Set();
    let question: MathematicalEquationQuestion | null = null;
    let configuration: MathematicalEquationGenerationConfiguration = {
      seed: `official-calibration-${difficulty}-${index}/seed-retry-1`,
      difficulty,
      maxAttempts: 100,
    };
    let lastError: unknown = null;
    for (let seedRetry = 1; seedRetry <= 12 && !question; seedRetry += 1) {
      configuration = {
        seed: `official-calibration-${difficulty}-${index}/seed-retry-${seedRetry}`,
        difficulty,
        maxAttempts: 100,
      };
      try {
        question = generateValidatedMathematicalEquation(
          configuration,
          acceptedFingerprints,
          sessionStructuralSignatures,
        );
      } catch (error) {
        lastError = error;
      }
    }
    if (!question) {
      throw new Error(
        `Audit generation failed at ${difficulty} index ${index} with ${sessionStructuralSignatures.size} structures in the active session.`,
        { cause: lastError },
      );
    }
    candidatesAttempted += question.metadata.attemptCount;
    for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
      let candidate: ReturnType<typeof mathematicalEquationGenerator.generate>;
      try {
        candidate = mathematicalEquationGenerator.generate(configuration, attempt);
      } catch {
        rejectionReasons.CONSTRUCTION_REJECTED = (rejectionReasons.CONSTRUCTION_REJECTED ?? 0) + 1;
        solverRejections += 1;
        continue;
      }
      const validation = mathematicalEquationValidator.validate(candidate, difficulty);
      if (!validation.valid) {
        validation.issues.forEach((entry) => {
          rejectionReasons[entry.code] = (rejectionReasons[entry.code] ?? 0) + 1;
        });
        if (validation.issues.some((issue) => issue.stage === "domain")) outOfDomainRejections += 1;
        else if (validation.issues.some((issue) => issue.stage === "difficulty")) difficultyRejections += 1;
        else solverRejections += 1;
      } else if (
        acceptedFingerprints.has(fingerprintMathematicalEquation(candidate)) ||
        sessionStructuralSignatures.has(mathematicalEquationStructuralSignature(candidate))
      ) {
        duplicateRejections += 1;
        const code = acceptedFingerprints.has(fingerprintMathematicalEquation(candidate))
          ? "duplicate_fingerprint"
          : "duplicate_structural_signature";
        rejectionReasons[code] = (rejectionReasons[code] ?? 0) + 1;
      }
    }
    acceptedFingerprints.add(question.metadata.fingerprint);
    sessionStructuralSignatures.add(mathematicalEquationStructuralSignature(question));
    questions.push(question);
  }

  const metrics = questions.map((question) => calculateEquationDifficulty(question).metrics);
  const depths: Record<string, number> = {};
  const families: Record<string, number> = {};
  const relationshipFamilies: Record<string, number> = {};
  const reasoningFamilies: Record<string, number> = {};
  const dependencyGraphs: Record<string, number> = {};
  const operators: Record<EquationOperator, number> = { add: 0, subtract: 0, multiply: 0, divide: 0 };
  questions.forEach((question, index) => {
    const depth = String(metrics[index].dependencyDepth);
    depths[depth] = (depths[depth] ?? 0) + 1;
    const family = question.structuredData.dependencyModel.family;
    families[family] = (families[family] ?? 0) + 1;
    question.structuredData.dependencyModel.relationshipPrimitives?.forEach((relationship) => {
      relationshipFamilies[relationship] = (relationshipFamilies[relationship] ?? 0) + 1;
    });
    question.structuredData.dependencyModel.reasoningFamilies?.forEach((reasoningFamily) => {
      reasoningFamilies[reasoningFamily] = (reasoningFamilies[reasoningFamily] ?? 0) + 1;
    });
    const graph = `depth-${metrics[index].dependencyDepth}/branch-${metrics[index].branchCount}/recombine-${metrics[index].recombinationCount}/indirect-${metrics[index].indirectCouplingCount}`;
    dependencyGraphs[graph] = (dependencyGraphs[graph] ?? 0) + 1;
    question.structuredData.equations.forEach((equation) => {
      collectOperators(equation.left, operators);
      collectOperators(equation.right, operators);
    });
  });
  const signatures = new Set(questions.map(mathematicalEquationStructuralSignature));
  const fingerprints = new Set(questions.map(fingerprintMathematicalEquation));
  const signatureCounts = questions.reduce((counts, question) => {
    const signature = mathematicalEquationStructuralSignature(question);
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const presentationOnlyVariations = questions.filter((question) =>
    (signatureCounts.get(mathematicalEquationStructuralSignature(question)) ?? 0) > 1,
  ).length;
  const traces = questions.map((question) => buildCanonicalSolveTrace(question, question.correctAnswer));
  const traceRanges = traces.map((trace, index) => validateSolveTraceRange(trace, questionDomain(questions[index])));
  const withinSessionDuplicateCount = Array.from(
    { length: Math.ceil(questions.length / STRUCTURAL_SESSION_SIZE) },
    (_, sessionIndex) => questions.slice(
      sessionIndex * STRUCTURAL_SESSION_SIZE,
      (sessionIndex + 1) * STRUCTURAL_SESSION_SIZE,
    ),
  ).reduce((total, session) =>
    total + session.length - new Set(session.map(mathematicalEquationStructuralSignature)).size,
  0);
  const expectedCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
  const elapsedMilliseconds = performance.now() - startedAt;

  return {
    row: {
      difficulty,
      accepted: questions.length,
      candidatesAttempted,
      averageVariableCount: rounded(average(metrics.map((metric) => metric.variableCount))),
      medianVariableCount: rounded(median(metrics.map((metric) => metric.variableCount))),
      averageEquationCount: rounded(average(metrics.map((metric) => metric.equationCount))),
      medianEquationCount: rounded(median(metrics.map((metric) => metric.equationCount))),
      exactVariableCountPercent: rounded(
        metrics.filter((metric) => metric.variableCount === expectedCount).length / metrics.length * 100,
      ),
      dependencyDepthDistribution: depths,
      averageDependencyDepth: rounded(average(metrics.map((metric) => metric.dependencyDepth))),
      medianDependencyDepth: rounded(median(metrics.map((metric) => metric.dependencyDepth))),
      averageSolveSteps: rounded(average(metrics.map((metric) => metric.solveStepCount))),
      averageSubstitutions: rounded(average(metrics.map((metric) => metric.substitutionCount))),
      averageOperatorVariety: rounded(average(metrics.map((metric) => metric.operatorVariety))),
      operatorDistribution: operators,
      compoundExpressionFrequency: rounded(metrics.filter((metric) => metric.compoundExpressionCount > 0).length / metrics.length),
      averageCompoundExpressionCount: rounded(average(metrics.map((metric) => metric.compoundExpressionCount))),
      branchFrequency: rounded(metrics.filter((metric) => metric.branchCount > 0).length / metrics.length),
      recombinationFrequency: rounded(metrics.filter((metric) => metric.recombinationCount > 0).length / metrics.length),
      indirectEntryFrequency: rounded(metrics.filter((metric) => metric.indirectCouplingCount > 0).length / metrics.length),
      averageWorkingMemory: rounded(average(metrics.map((metric) => metric.workingMemoryEstimate))),
      averageObviousEntryPointPenalty: rounded(average(metrics.map((metric) => metric.obviousEntryPointPenalty))),
      averageComplexityScore: rounded(average(metrics.map((metric) => metric.score))),
      solverRejections,
      solverRejectionRate: rounded(solverRejections / candidatesAttempted),
      duplicateRejections,
      duplicateRejectionRate: rounded(duplicateRejections / candidatesAttempted),
      outOfDomainRejections,
      outOfDomainRejectionRate: rounded(outOfDomainRejections / candidatesAttempted),
      difficultyRejections,
      difficultyRejectionRate: rounded(difficultyRejections / candidatesAttempted),
      structuralSignatureCount: signatures.size,
      structuralSignatureDiversity: rounded(signatures.size / questions.length),
      canonicalStructuralDuplicateRate: rounded(1 - signatures.size / questions.length),
      withinSessionStructuralDuplicateRate: rounded(withinSessionDuplicateCount / questions.length),
      familyDistribution: families,
      relationshipFamilyDistribution: relationshipFamilies,
      reasoningFamilyDistribution: reasoningFamilies,
      dependencyGraphDistribution: dependencyGraphs,
      exactDuplicateRate: rounded(1 - fingerprints.size / questions.length),
      structuralDuplicateRate: rounded(1 - signatures.size / questions.length),
      presentationOnlyVariationRate: rounded(presentationOnlyVariations / questions.length),
      maximumEvaluatedIntermediate: Math.max(...traces.map((trace) => trace.maximumEvaluatedIntermediate)),
      minimumEvaluatedIntermediate: Math.min(...traces.map((trace) => trace.minimumEvaluatedIntermediate)),
      fractionalTraceCount: traces.filter((trace) => trace.hasFractionalIntermediate).length,
      negativeTraceCount: traces.filter((trace) => trace.hasNegativeIntermediate).length,
      arithmeticRangeViolationCount: traceRanges.filter((range) => !range.valid).length,
      rejectionReasonDistribution: rejectionReasons,
      elapsedMilliseconds: rounded(elapsedMilliseconds),
      acceptedPerSecond: rounded(questions.length / elapsedMilliseconds * 1000),
      averageCandidateAttempts: rounded(candidatesAttempted / questions.length),
    },
    samples: questions.slice(0, 15),
  };
}

function questionDomain(question: MathematicalEquationQuestion) {
  return question.structuredData.domain;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formulae(question: MathematicalEquationQuestion): string[] {
  return question.presentation.blocks
    .filter((block): block is { kind: "formula"; expression: string } => block.kind === "formula")
    .map((block) => block.expression);
}

function sampleSvg(question: MathematicalEquationQuestion, index: number): string {
  const metrics = calculateEquationDifficulty(question).metrics;
  const equations = formulae(question).map((equation, equationIndex) =>
    `<rect x="90" y="${78 + equationIndex * 64}" width="820" height="48" rx="7" fill="#fff" stroke="#cbd5e1"/><text x="500" y="${110 + equationIndex * 64}" text-anchor="middle" font-family="monospace" font-size="23" font-weight="600" fill="#0f172a">${escapeXml(equation)}</text>`).join("");
  const inputs = question.structuredData.variables.map((symbol, symbolIndex) =>
    `<text x="${145 + symbolIndex * 220}" y="365" font-family="monospace" font-size="22" font-weight="700" fill="#0f172a">${symbol} =</text><rect x="${195 + symbolIndex * 220}" y="332" width="92" height="46" rx="7" fill="#fff" stroke="#64748b"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="410" viewBox="0 0 1000 410"><rect width="1000" height="410" fill="#f8fafc"/><text x="45" y="34" font-family="sans-serif" font-size="21" font-weight="700" fill="#0f172a">${question.metadata.requestedDifficulty.toUpperCase()} sample ${index + 1}</text><text x="45" y="58" font-family="sans-serif" font-size="14" fill="#475569">${question.structuredData.dependencyModel.family.replaceAll("_", " ")} · depth ${metrics.dependencyDepth} · ${metrics.solveStepCount} estimated steps</text>${equations}${inputs}</svg>`;
}

function writeArtifacts(rows: AuditRow[], samples: MathematicalEquationQuestion[]) {
  const directory = resolve(process.cwd(), "reports", "mathematical-equations");
  mkdirSync(directory, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    sampleSizePerDifficulty: SAMPLE_SIZE,
    structuralSessionSize: STRUCTURAL_SESSION_SIZE,
    rows,
  };
  writeFileSync(resolve(directory, "difficulty-audit.json"), `${JSON.stringify(payload, null, 2)}\n`);
  const markdown = [
    "# Mathematical Equations difficulty audit",
    "",
    `Accepted sample: ${SAMPLE_SIZE} per difficulty (${SAMPLE_SIZE * 3} total).`,
    "",
    "| Difficulty | Variables avg | Equations avg | Exact count | Depth avg | Solve steps avg | Substitutions avg | Operator variety avg | Compound freq. | Branch freq. | Recombine freq. | Indirect-entry freq. | Working memory avg | Obvious-entry penalty | Score avg | Solver reject rate | Difficulty reject rate | Global structural reuse | Within-session duplicate rate |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row.difficulty} | ${row.averageVariableCount} | ${row.averageEquationCount} | ${row.exactVariableCountPercent}% | ${row.averageDependencyDepth} | ${row.averageSolveSteps} | ${row.averageSubstitutions} | ${row.averageOperatorVariety} | ${row.compoundExpressionFrequency} | ${row.branchFrequency} | ${row.recombinationFrequency} | ${row.indirectEntryFrequency} | ${row.averageWorkingMemory} | ${row.averageObviousEntryPointPenalty} | ${row.averageComplexityScore} | ${row.solverRejectionRate} | ${row.difficultyRejectionRate} | ${row.canonicalStructuralDuplicateRate} | ${row.withinSessionStructuralDuplicateRate} |`),
    "",
    "## Operator counts",
    "",
    ...rows.map((row) => `- ${row.difficulty}: add ${row.operatorDistribution.add}, subtract ${row.operatorDistribution.subtract}, multiply ${row.operatorDistribution.multiply}, divide ${row.operatorDistribution.divide}`),
    "",
    "## Structural-family distribution",
    "",
    ...rows.map((row) => `- ${row.difficulty}: ${Object.entries(row.familyDistribution).map(([family, count]) => `${family} ${count}`).join(", ")}`),
    "",
    "## Relationship-family distribution",
    "",
    ...rows.map((row) => `- ${row.difficulty}: ${Object.entries(row.relationshipFamilyDistribution).map(([family, count]) => `${family} ${count}`).join(", ")}`),
    "",
    "## Reasoning-family distribution",
    "",
    ...rows.map((row) => `- ${row.difficulty}: ${Object.entries(row.reasoningFamilyDistribution).map(([family, count]) => `${family} ${count}`).join(", ")}`),
    "",
    "## Dependency-graph distribution",
    "",
    ...rows.map((row) => `- ${row.difficulty}: ${Object.entries(row.dependencyGraphDistribution).map(([graph, count]) => `${graph} ${count}`).join(", ")}`),
    "",
    "## Arithmetic safety and performance",
    "",
    "| Difficulty | Max intermediate | Min intermediate | Fractions | Negatives | Range violations | Attempts / accepted | Accepted / sec |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row.difficulty} | ${row.maximumEvaluatedIntermediate} | ${row.minimumEvaluatedIntermediate} | ${row.fractionalTraceCount} | ${row.negativeTraceCount} | ${row.arithmeticRangeViolationCount} | ${row.averageCandidateAttempts} | ${row.acceptedPerSecond} |`),
    "",
    "## Duplicate and rejection analysis",
    "",
    ...rows.map((row) => `- ${row.difficulty}: exact duplicate rate ${row.exactDuplicateRate}; structural duplicate rate ${row.structuralDuplicateRate}; presentation-only variation rate ${row.presentationOnlyVariationRate}; rejection reasons ${JSON.stringify(row.rejectionReasonDistribution)}`),
    "",
    "## Diversity interpretation",
    "",
    `Canonical structural signatures are rejected within ${STRUCTURAL_SESSION_SIZE}-question audit sessions, exercising the repository's bounded generated-set policy.`,
    "Within-session duplicate rate is therefore the acceptance metric. Global structural reuse is also reported across all 200 questions to show finite catalog saturation, especially for two-variable Easy systems.",
    "",
  ].join("\n");
  writeFileSync(resolve(directory, "difficulty-audit.md"), markdown);
  const cards = samples.map((question, index) => {
    const sampleIndex = index % 15;
    const name = `visual-${question.metadata.requestedDifficulty}-${sampleIndex + 1}.svg`;
    writeFileSync(resolve(directory, name), sampleSvg(question, sampleIndex));
    return `<figure><img alt="${question.metadata.requestedDifficulty} sample ${sampleIndex + 1}" src="./${name}"><figcaption>${question.metadata.requestedDifficulty} ${sampleIndex + 1}</figcaption></figure>`;
  }).join("");
  writeFileSync(resolve(directory, "visual-samples.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mathematical Equations visual samples</title><style>body{font:14px system-ui;background:#e2e8f0;margin:24px}main{display:grid;gap:20px}figure{background:white;border-radius:12px;margin:0;padding:12px}img{display:block;width:100%;height:auto}figcaption{text-align:center;text-transform:capitalize}</style></head><body><h1>Mathematical Equations visual review</h1><main>${cards}</main></body></html>`);
}

describe.skipIf(!ENABLED)("Mathematical Equations 200-per-difficulty audit", () => {
  it("meets the official-reference calibration gates", () => {
    const audited = (["easy", "medium", "hard"] as const).map(auditDifficulty);
    const rows = audited.map((entry) => entry.row);
    writeArtifacts(rows, audited.flatMap((entry) => entry.samples));

    expect(rows.every((row) => row.accepted === SAMPLE_SIZE)).toBe(true);
    expect(rows.map((row) => row.exactVariableCountPercent)).toEqual([100, 100, 100]);
    expect(rows[0].averageVariableCount).toBe(2);
    expect(rows[1].averageVariableCount).toBe(3);
    expect(rows[2].averageVariableCount).toBe(4);
    expect(rows[1].compoundExpressionFrequency).toBeGreaterThanOrEqual(0.8);
    expect(rows[2].compoundExpressionFrequency).toBe(1);
    expect(rows[1].recombinationFrequency + rows[1].branchFrequency).toBeGreaterThanOrEqual(0.7);
    expect(rows[2].recombinationFrequency).toBeGreaterThanOrEqual(0.5);
    expect(rows[2].indirectEntryFrequency).toBeGreaterThan(0.35);
    expect(rows[1].averageSolveSteps).toBeGreaterThan(rows[0].averageSolveSteps);
    expect(rows[2].averageSolveSteps).toBeGreaterThan(rows[1].averageSolveSteps);
    expect(rows[1].averageComplexityScore).toBeGreaterThan(rows[0].averageComplexityScore);
    expect(rows[2].averageComplexityScore).toBeGreaterThan(rows[1].averageComplexityScore);
    expect(rows.every((row) => row.outOfDomainRejections === 0)).toBe(true);
    expect(rows.every((row) => row.difficultyRejections === 0)).toBe(true);
    expect(rows.every((row) => row.withinSessionStructuralDuplicateRate === 0)).toBe(true);
    expect(rows.every((row) => row.exactDuplicateRate === 0)).toBe(true);
    expect(rows.every((row) => row.arithmeticRangeViolationCount === 0)).toBe(true);
    expect(rows.every((row) => row.maximumEvaluatedIntermediate <= 20)).toBe(true);
    expect(rows.every((row) => row.minimumEvaluatedIntermediate >= 1)).toBe(true);
    expect(rows.every((row) => row.fractionalTraceCount === 0)).toBe(true);
    expect(rows.every((row) => row.negativeTraceCount === 0)).toBe(true);
    expect(rows[0].canonicalStructuralDuplicateRate).toBeLessThanOrEqual(0.65);
    expect(rows[1].canonicalStructuralDuplicateRate).toBeLessThanOrEqual(0.4);
    expect(rows[2].canonicalStructuralDuplicateRate).toBeLessThanOrEqual(0.15);
    expect(rows[0].structuralSignatureCount).toBeGreaterThanOrEqual(18);
    expect(rows[1].structuralSignatureCount).toBeGreaterThanOrEqual(30);
    expect(rows[2].structuralSignatureCount).toBeGreaterThanOrEqual(45);
    expect(rows.every((row) => Math.max(...Object.values(row.familyDistribution)) / SAMPLE_SIZE <= 0.45)).toBe(true);
  }, 120_000);
});
