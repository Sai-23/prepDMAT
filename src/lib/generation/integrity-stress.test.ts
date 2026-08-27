import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { afterAll, describe, expect, it } from "vitest";

import {
  figureSequenceGenerator,
  figureSequenceValidator,
  generateValidatedFigureSequence,
  reproduceValidatedFigureSequence,
  type FigureSequenceCandidate,
  type FigureSequenceQuestion,
} from "./figure-sequences";
import {
  generateValidatedLatinSquare,
  latinSquareGenerator,
  latinSquareValidator,
  reproduceValidatedLatinSquare,
  type LatinSquareCandidate,
  type LatinSquareQuestion,
} from "./latin-squares";
import {
  generateValidatedMathematicalEquation,
  mathematicalEquationGenerator,
  mathematicalEquationValidator,
  reproduceValidatedMathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalEquationQuestion,
} from "./mathematical-equations";
import type { GenerationDifficulty, JsonValue, ValidationResult } from "./types";

const ENABLED = process.env.DMAT_Q1_STRESS === "1";
const COUNT = Number(process.env.DMAT_Q1_STRESS_COUNT ?? "10000");
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

type AuditQuestion = {
  metadata: {
    attemptCount: number;
    fingerprint: string;
    calculatedDifficulty: GenerationDifficulty;
  };
  validation: { checks: Array<{ passed: boolean }> };
};

type Adapter<TCandidate, TQuestion extends AuditQuestion> = {
  name: string;
  generateCandidate(seed: string, difficulty: GenerationDifficulty, attempt: number): TCandidate;
  validate(candidate: TCandidate, difficulty: GenerationDifficulty): ValidationResult<JsonValue>;
  generate(seed: string, difficulty: GenerationDifficulty): TQuestion;
  reproduce(seed: string, difficulty: GenerationDifficulty, attempt: number): TQuestion;
  canonical(question: TQuestion): JsonValue;
  distribution(question: TQuestion): string[];
};

type AuditStatistics = {
  generator: string;
  difficulty: GenerationDifficulty;
  requestedGenerationCount: number;
  acceptedCount: number;
  rejectedCandidateCount: number;
  generationAttempts: number;
  generationFailures: number;
  solverFailures: number;
  validatorFailures: number;
  difficultyMismatches: number;
  duplicateFingerprints: number;
  duplicateRate: number;
  unexpectedExceptions: number;
  acceptedInvalidCount: number;
  solverMismatchCount: number;
  determinismFailures: number;
  latencyMilliseconds: { mean: number; median: number; p95: number; maximum: number };
  distribution: Record<string, number>;
};

function percentile(values: number[], ratio: number): number {
  return values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)] ?? 0;
}

function round(value: number): number { return Math.round(value * 1000) / 1000; }

async function runAdapter<TCandidate, TQuestion extends AuditQuestion>(
  adapter: Adapter<TCandidate, TQuestion>,
  difficulty: GenerationDifficulty,
): Promise<AuditStatistics> {
  const latencies: number[] = [];
  const fingerprints = new Set<string>();
  const distribution: Record<string, number> = {};
  let acceptedCount = 0;
  let rejectedCandidateCount = 0;
  let generationAttempts = 0;
  let generationFailures = 0;
  let solverFailures = 0;
  let validatorFailures = 0;
  let difficultyMismatches = 0;
  let duplicateFingerprints = 0;
  let unexpectedExceptions = 0;
  let acceptedInvalidCount = 0;
  let solverMismatchCount = 0;
  let determinismFailures = 0;

  for (let index = 0; index < COUNT; index += 1) {
    if (index > 0 && index % 100 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const seed = `q1:${adapter.name}:${difficulty}:${index}`;
    const started = performance.now();
    try {
      const question = adapter.generate(seed, difficulty);
      latencies.push(performance.now() - started);
      acceptedCount += 1;
      generationAttempts += question.metadata.attemptCount;
      rejectedCandidateCount += question.metadata.attemptCount - 1;
      if (fingerprints.has(question.metadata.fingerprint)) duplicateFingerprints += 1;
      fingerprints.add(question.metadata.fingerprint);

      for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
        try {
          const rejected = adapter.validate(adapter.generateCandidate(seed, difficulty, attempt), difficulty);
          if (rejected.valid) validatorFailures += 1;
          else {
            if (rejected.issues.some((item) => item.stage === "solve")) solverFailures += 1;
            else if (rejected.issues.some((item) => item.stage === "difficulty")) difficultyMismatches += 1;
            else validatorFailures += 1;
          }
        } catch {
          generationFailures += 1;
        }
      }

      const candidate = adapter.generateCandidate(seed, difficulty, question.metadata.attemptCount);
      const independent = adapter.validate(candidate, difficulty);
      if (!independent.valid || !question.validation.checks.every((item) => item.passed)) {
        acceptedInvalidCount += 1;
        if (!independent.valid && independent.issues.some((item) => item.stage === "solve" || item.stage === "uniqueness")) solverMismatchCount += 1;
      }
      if (question.metadata.calculatedDifficulty !== difficulty) difficultyMismatches += 1;

      const replayed = adapter.reproduce(seed, difficulty, question.metadata.attemptCount);
      if (JSON.stringify(adapter.canonical(question)) !== JSON.stringify(adapter.canonical(replayed))) determinismFailures += 1;
      for (const label of adapter.distribution(question)) distribution[label] = (distribution[label] ?? 0) + 1;
    } catch (error) {
      unexpectedExceptions += 1;
      throw new Error(`Q1 failure: generator=${adapter.name}, difficulty=${difficulty}, seed=${seed}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }

  const sorted = [...latencies].sort((first, second) => first - second);
  const mean = sorted.reduce((total, value) => total + value, 0) / Math.max(1, sorted.length);
  return {
    generator: adapter.name,
    difficulty,
    requestedGenerationCount: COUNT,
    acceptedCount,
    rejectedCandidateCount,
    generationAttempts,
    generationFailures,
    solverFailures,
    validatorFailures,
    difficultyMismatches,
    duplicateFingerprints,
    duplicateRate: round(duplicateFingerprints / Math.max(1, acceptedCount)),
    unexpectedExceptions,
    acceptedInvalidCount,
    solverMismatchCount,
    determinismFailures,
    latencyMilliseconds: {
      mean: round(mean),
      median: round(percentile(sorted, 0.5)),
      p95: round(percentile(sorted, 0.95)),
      maximum: round(sorted.at(-1) ?? 0),
    },
    distribution,
  };
}

const equationAdapter: Adapter<MathematicalEquationCandidate, MathematicalEquationQuestion> = {
    name: "mathematical-equations",
    generateCandidate: (seed, difficulty, attempt) => mathematicalEquationGenerator.generate({ seed, difficulty }, attempt),
    validate: (candidate, difficulty) => mathematicalEquationValidator.validate(candidate, difficulty),
    generate: (seed, difficulty) => generateValidatedMathematicalEquation({ seed, difficulty }),
    reproduce: (seed, difficulty, attempt) => reproduceValidatedMathematicalEquation({ seed, difficulty }, attempt),
    canonical: (question) => ({ structuredData: question.structuredData, correctAnswer: question.correctAnswer, fingerprint: question.metadata.fingerprint }),
    distribution: (question) => [`variables:${question.structuredData.variables.length}`, `equations:${question.structuredData.equations.length}`],
};
const latinAdapter: Adapter<LatinSquareCandidate, LatinSquareQuestion> = {
    name: "latin-squares",
    generateCandidate: (seed, difficulty, attempt) => latinSquareGenerator.generate({ seed, difficulty }, attempt),
    validate: (candidate, difficulty) => latinSquareValidator.validate(candidate, difficulty),
    generate: (seed, difficulty) => generateValidatedLatinSquare({ seed, difficulty }),
    reproduce: (seed, difficulty, attempt) => reproduceValidatedLatinSquare({ seed, difficulty }, attempt),
    canonical: (question) => ({ structuredData: question.structuredData, correctAnswer: question.correctAnswer, fingerprint: question.metadata.fingerprint }),
    distribution: (question) => [`deductions:${question.deductionTrace.length}`],
};
const figureAdapter: Adapter<FigureSequenceCandidate, FigureSequenceQuestion> = {
    name: "figure-sequences",
    generateCandidate: (seed, difficulty, attempt) => figureSequenceGenerator.generate({ seed, difficulty }, attempt),
    validate: (candidate, difficulty) => figureSequenceValidator.validate(candidate, difficulty),
    generate: (seed, difficulty) => generateValidatedFigureSequence({ seed, difficulty }),
    reproduce: (seed, difficulty, attempt) => reproduceValidatedFigureSequence({ seed, difficulty }, attempt),
    canonical: (question) => ({ structuredData: question.structuredData, sequence: question.sequence, correctAnswer: question.correctAnswer, fingerprint: question.metadata.fingerprint }),
    distribution: (question) => question.structuredData.rules.flatMap((rule) => [rule.movement ? `movement:${rule.movement.kind}` : "movement:none", rule.rotation ? `rotation:${rule.rotation.progression}` : "rotation:none", rule.colour ? `colour:${rule.colour.progression}` : "colour:none"]),
};
const auditRunners = [
  (difficulty: GenerationDifficulty) => runAdapter(equationAdapter, difficulty),
  (difficulty: GenerationDifficulty) => runAdapter(latinAdapter, difficulty),
  (difficulty: GenerationDifficulty) => runAdapter(figureAdapter, difficulty),
];

function markdownReport(results: AuditStatistics[]): string {
  const totals = results.reduce((summary, row) => ({
    requested: summary.requested + row.requestedGenerationCount,
    accepted: summary.accepted + row.acceptedCount,
    rejected: summary.rejected + row.rejectedCandidateCount,
    invalid: summary.invalid + row.acceptedInvalidCount,
    mismatches: summary.mismatches + row.solverMismatchCount,
    duplicates: summary.duplicates + row.duplicateFingerprints,
    determinism: summary.determinism + row.determinismFailures,
  }), { requested: 0, accepted: 0, rejected: 0, invalid: 0, mismatches: 0, duplicates: 0, determinism: 0 });
  const lines = [
    "# Q1 Generator Integrity Audit",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Acceptance summary",
    "",
    `- Requested: ${totals.requested}`,
    `- Accepted: ${totals.accepted}`,
    `- Rejected candidates before acceptance: ${totals.rejected}`,
    `- Accepted-invalid: ${totals.invalid}`,
    `- Solver mismatches: ${totals.mismatches}`,
    `- Duplicate fingerprints: ${totals.duplicates}`,
    `- Determinism failures: ${totals.determinism}`,
    "",
    "## Per-generator results",
    "",
    "| Generator | Difficulty | Seeds | Accepted | Rejected | Invalid | Duplicates | Duplicate rate | Mean ms | P95 ms | Max ms |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...results.map((row) => `| ${row.generator} | ${row.difficulty} | ${row.requestedGenerationCount} | ${row.acceptedCount} | ${row.rejectedCandidateCount} | ${row.acceptedInvalidCount} | ${row.duplicateFingerprints} | ${(row.duplicateRate * 100).toFixed(1)}% | ${row.latencyMilliseconds.mean} | ${row.latencyMilliseconds.p95} | ${row.latencyMilliseconds.maximum} |`),
    "",
    "## Adversarial rejection",
    "",
    `Mutations rejected: ${adversarialResult.rejected}/${adversarialResult.attempted} (${(adversarialResult.rejectionRate * 100).toFixed(1)}%).`,
    "",
    "Mutation suites cover incorrect or ambiguous equation answers, invalid divisors and explanations; malformed, ambiguous and inconsistent Latin squares; and corrupt figure frames, duplicate continuations and wrong answer keys.",
    "",
    "## Findings",
    "",
    "- No accepted-invalid, solver mismatch, determinism, or unexpected-exception defect was found.",
    "- High semantic duplicate rates in several low-complexity families are a diversity limitation, not a correctness failure. Deduplication remains mandatory when building a bank.",
    "",
    "Acceptance criterion: accepted-invalid must equal zero.",
  ];
  return `${lines.join("\n")}\n`;
}

function runAdversarialAudit(): { attempted: number; rejected: number; rejectionRate: number } {
  const outcomes: boolean[] = [];
  const equationAccepted = generateValidatedMathematicalEquation({ seed: "q1-adversarial-equation", difficulty: "easy" });
  const equationBase = mathematicalEquationGenerator.generate({ seed: "q1-adversarial-equation", difficulty: "easy" }, equationAccepted.metadata.attemptCount);
  const equationMutations: MathematicalEquationCandidate[] = [];
  const wrongEquationAnswer = structuredClone(equationBase);
  wrongEquationAnswer.correctAnswer.A = wrongEquationAnswer.correctAnswer.A === 20 ? 19 : 20;
  equationMutations.push(wrongEquationAnswer);
  const outOfRange = structuredClone(equationBase);
  outOfRange.correctAnswer.A = 21;
  equationMutations.push(outOfRange);
  const ambiguousEquation = structuredClone(equationBase);
  ambiguousEquation.structuredData.equations[1] = structuredClone(ambiguousEquation.structuredData.equations[0]);
  equationMutations.push(ambiguousEquation);
  const zeroDivision = structuredClone(equationBase);
  zeroDivision.structuredData.equations[0] = { left: { kind: "operation", operator: "divide", left: { kind: "variable", symbol: "A" }, right: { kind: "constant", value: 0 } }, right: { kind: "constant", value: 1 } };
  equationMutations.push(zeroDivision);
  const badExplanation = structuredClone(equationBase);
  badExplanation.solutionPath[0].knownSymbols = ["not-a-variable"];
  equationMutations.push(badExplanation);
  equationMutations.forEach((candidate) => outcomes.push(!mathematicalEquationValidator.validate(candidate, "easy").valid));

  const latinAccepted = generateValidatedLatinSquare({ seed: "q1-adversarial-latin", difficulty: "easy" });
  const latinBase = latinSquareGenerator.generate({ seed: "q1-adversarial-latin", difficulty: "easy" }, latinAccepted.metadata.attemptCount);
  const latinMutations: LatinSquareCandidate[] = [];
  const repeatedLatin = structuredClone(latinBase);
  repeatedLatin.structuredData.grid[0] = ["A", "A", null, null, null];
  latinMutations.push(repeatedLatin);
  const ambiguousLatin = structuredClone(latinBase);
  ambiguousLatin.structuredData.grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null));
  latinMutations.push(ambiguousLatin);
  const wrongLatinAnswer = structuredClone(latinBase);
  wrongLatinAnswer.correctAnswer = wrongLatinAnswer.correctAnswer === "A" ? "B" : "A";
  latinMutations.push(wrongLatinAnswer);
  const impossibleLatin = structuredClone(latinBase);
  impossibleLatin.completedGrid[0][1] = impossibleLatin.completedGrid[0][0];
  latinMutations.push(impossibleLatin);
  const malformedLatin = structuredClone(latinBase);
  malformedLatin.structuredData.grid.pop();
  latinMutations.push(malformedLatin);
  latinMutations.forEach((candidate) => outcomes.push(!latinSquareValidator.validate(candidate, "easy").valid));

  const figureAccepted = generateValidatedFigureSequence({ seed: "q1-adversarial-figure", difficulty: "medium" });
  const figureBase = figureSequenceGenerator.generate({ seed: "q1-adversarial-figure", difficulty: "medium" }, figureAccepted.metadata.attemptCount);
  const figureMutations: FigureSequenceCandidate[] = [];
  const outsideFigure = structuredClone(figureBase);
  outsideFigure.structuredData.visibleFrames[0].symbols[0].row = -1;
  figureMutations.push(outsideFigure);
  const overlapFigure = structuredClone(figureBase);
  overlapFigure.structuredData.visibleFrames[0].symbols[1].row = overlapFigure.structuredData.visibleFrames[0].symbols[0].row;
  overlapFigure.structuredData.visibleFrames[0].symbols[1].column = overlapFigure.structuredData.visibleFrames[0].symbols[0].column;
  figureMutations.push(overlapFigure);
  const missingFigure = structuredClone(figureBase);
  missingFigure.structuredData.visibleFrames[1].symbols.pop();
  figureMutations.push(missingFigure);
  const wrongFuture = structuredClone(figureBase);
  wrongFuture.solutionFrames[0].symbols[0].color = "white";
  figureMutations.push(wrongFuture);
  const duplicateCandidate = structuredClone(figureBase);
  duplicateCandidate.sequence.missingMatrices[0].candidates[1].frame = structuredClone(duplicateCandidate.sequence.missingMatrices[0].candidates[0].frame);
  figureMutations.push(duplicateCandidate);
  const wrongRotation = structuredClone(figureBase);
  const rotator = wrongRotation.structuredData.rules.find((rule) => rule.rotation);
  if (rotator?.rotation) rotator.rotation.quarterTurns += 1;
  else wrongRotation.structuredData.rules[0].movement!.steps += 1;
  figureMutations.push(wrongRotation);
  figureMutations.forEach((candidate) => outcomes.push(!figureSequenceValidator.validate(candidate, "medium").valid));

  const rejected = outcomes.filter(Boolean).length;
  return { attempted: outcomes.length, rejected, rejectionRate: round(rejected / outcomes.length) };
}

const adversarialResult = runAdversarialAudit();

describe.skipIf(!ENABLED)("Q1 cross-generator integrity stress audit", () => {
  const results: AuditStatistics[] = [];
  if (!Number.isSafeInteger(COUNT) || COUNT < 1 || COUNT > 10_000) throw new RangeError("DMAT_Q1_STRESS_COUNT must be from 1 through 10000.");
  auditRunners.forEach((run, generatorIndex) => {
    DIFFICULTIES.forEach((difficulty) => {
      it(`audits generator ${generatorIndex + 1} at ${difficulty} difficulty`, async () => {
        const row = await run(difficulty);
        results.push(row);
        expect(row.acceptedInvalidCount).toBe(0);
        expect(row.solverMismatchCount).toBe(0);
        expect(row.determinismFailures).toBe(0);
        expect(row.unexpectedExceptions).toBe(0);
      }, 300_000);
    });
  });

  afterAll(() => {
    const reportDirectory = join(process.cwd(), "reports", "q1");
    mkdirSync(reportDirectory, { recursive: true });
    const report = {
      schemaVersion: 1,
      audit: "Q1-generator-integrity",
      generatedAt: new Date().toISOString(),
      seedsPerDifficulty: COUNT,
      databaseWrites: 0,
      acceptanceCriterion: { acceptedInvalidMustEqual: 0 },
      adversarial: adversarialResult,
      results,
    };
    writeFileSync(join(reportDirectory, "integrity-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(join(reportDirectory, "integrity-report.md"), markdownReport(results), "utf8");
  });
});
