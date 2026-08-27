import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { afterAll, describe, expect, it } from "vitest";

import {
  canonicalRenderedMatrix,
  figureSequenceGenerator,
  figureSequenceValidator,
  figureStructuralSignature,
  figureSymbolRenderModel,
  generateValidatedFigureSequence,
  replayFigureSequence,
  validateFigureHardConstraints,
  type FigureFrame,
  type FigureSequenceQuestion,
} from "./figure-sequences";
import {
  calculateEquationDifficulty,
  EQUATION_RELATIONSHIP_REGISTRY,
  evaluateExpression,
  generateValidatedMathematicalEquation,
  inspectMathematicalEquationStyle,
  inspectPublicEquationPresentation,
  mathematicalEquationGenerator,
  mathematicalEquationStructuralSignature,
  mathematicalEquationValidator,
  type MathematicalEquationQuestion,
  type MathematicalExpression,
} from "./mathematical-equations";
import type { GenerationDifficulty } from "./types";

const ENABLED = process.env.DMAT_PRODUCTION_GATE_AUDIT === "1";
const TOTAL = Number(process.env.DMAT_PRODUCTION_GATE_ACCEPTED ?? "10000");
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const REPORT_DIRECTORY = join(process.cwd(), "reports", "generator-production-gate");
const SAMPLE_COUNT = 30;

type SeedGroup = "sequential" | "hashed" | "edge-case" | "retry-heavy" | "regression";
type Distribution = Record<string, number>;
type Latency = { p50: number; p95: number; p99: number; maximum: number; mean: number };

type AuditSummary = {
  module: "mathematical_equation" | "figure_sequence";
  requestedAccepted: number;
  accepted: number;
  acceptedByDifficulty: Distribution;
  acceptedBySeedGroup: Distribution;
  generationAttempts: number;
  attemptsPerAccepted: number;
  rejectionReasons: Distribution;
  latencyMilliseconds: Latency;
  exactDuplicateFingerprints: number;
  structuralReuseCount: number;
  invariantFailures: Distribution;
  distributions: Record<string, Distribution>;
};

type RankedSample<TQuestion> = { rank: string; question: TQuestion };

const results: AuditSummary[] = [];

function increment(target: Distribution, key: string, amount = 1): void {
  target[key] = (target[key] ?? 0) + amount;
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function latency(values: readonly number[]): Latency {
  const sorted = [...values].sort((first, second) => first - second);
  const percentile = (ratio: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
  return {
    p50: rounded(percentile(0.5)),
    p95: rounded(percentile(0.95)),
    p99: rounded(percentile(0.99)),
    maximum: rounded(sorted.at(-1) ?? 0),
    mean: rounded(sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length)),
  };
}

function seedFor(module: AuditSummary["module"], index: number): { seed: string; group: SeedGroup } {
  const group = (["sequential", "hashed", "edge-case", "retry-heavy", "regression"] as const)[index % 5];
  if (group === "hashed") {
    return { group, seed: createHash("sha256").update(`${module}:${index}`).digest("hex") };
  }
  if (group === "edge-case") {
    const cases = ["0", "00", "unicode-Δ", "spaces retained", "boundary-999999", "mixed_CASE-20"];
    return { group, seed: `${cases[index % cases.length]}:${module}:${index}` };
  }
  if (group === "retry-heavy") return { group, seed: `retry-heavy:${module}:${index * 7919}` };
  if (group === "regression") {
    const cases = [
      "observed-visible-total-regression",
      "render-duplicate",
      "tamper-options",
      "stable-family",
      "retry-stable-composition",
    ];
    return { group, seed: `${cases[index % cases.length]}:${index}` };
  }
  return { group, seed: `production-gate:${module}:${index}` };
}

function addSample<TQuestion>(
  samples: Record<GenerationDifficulty, RankedSample<TQuestion>[]>,
  difficulty: GenerationDifficulty,
  seed: string,
  question: TQuestion,
): void {
  const rank = createHash("sha256").update(`visual:${seed}`).digest("hex");
  const bucket = samples[difficulty];
  bucket.push({ rank, question });
  bucket.sort((first, second) => first.rank.localeCompare(second.rank));
  if (bucket.length > SAMPLE_COUNT) bucket.pop();
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function equationSampleSvg(question: MathematicalEquationQuestion, sampleIndex: number): string {
  const formulae = inspectPublicEquationPresentation(
    question.presentation.blocks,
    question.structuredData.equations,
  ).formulae;
  const metrics = calculateEquationDifficulty(question).metrics;
  const equations = formulae.map((formula, index) =>
    `<rect x="70" y="${72 + index * 62}" width="860" height="46" rx="7" fill="#fff" stroke="#cbd5e1"/><text x="500" y="${103 + index * 62}" text-anchor="middle" font-family="monospace" font-size="22" font-weight="600" fill="#0f172a">${escapeXml(formula)}</text>`).join("");
  const inputs = question.structuredData.variables.map((symbol, index) =>
    `<text x="${125 + index * 220}" y="365" font-family="monospace" font-size="22" font-weight="700">${symbol} =</text><rect x="${175 + index * 220}" y="332" width="90" height="46" rx="7" fill="#fff" stroke="#64748b"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="410" viewBox="0 0 1000 410"><rect width="1000" height="410" fill="#f8fafc"/><text x="35" y="30" font-family="sans-serif" font-size="20" font-weight="700">${question.metadata.requestedDifficulty.toUpperCase()} ${sampleIndex + 1}</text><text x="35" y="53" font-family="sans-serif" font-size="13" fill="#475569">${question.structuredData.dependencyModel.family} · ${metrics.solveStepCount} steps · visible max ${inspectMathematicalEquationStyle(question).maximumDisplayedConstant}</text>${equations}${inputs}</svg>`;
}

function figureShapeMarkup(frame: FigureFrame, symbolIndex: number): string {
  const symbol = frame.symbols[symbolIndex];
  const model = figureSymbolRenderModel(symbol);
  const x = symbol.column * 36 + 18;
  const y = symbol.row * 36 + 18;
  const common = `fill="${model.fill}" stroke="${model.stroke}" stroke-width="2.5"`;
  const shape = model.shape === "circle"
    ? `<circle ${common} r="10"/>`
    : model.shape === "square"
      ? `<rect ${common} x="-9" y="-9" width="18" height="18" rx="1"/>`
      : model.shape === "triangle"
        ? `<polygon ${common} points="0,-12 11,9 -11,9"/>`
        : model.shape === "diamond"
          ? `<polygon ${common} points="0,-12 12,0 0,12 -12,0"/>`
          : `<polygon ${common} points="0,-13 11,1 5,1 5,12 -5,12 -5,1 -11,1"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${model.orientation})">${shape}</g>`;
}

function matrixMarkup(frame: FigureFrame): string {
  const lines = Array.from({ length: 6 }, (_, index) =>
    `<path d="M ${index * 36} 0 V 180 M 0 ${index * 36} H 180"/>`).join("");
  return `<rect width="180" height="180" fill="white"/><g stroke="#94a3b8" stroke-width="1">${lines}</g>${frame.symbols.map((_, index) => figureShapeMarkup(frame, index)).join("")}`;
}

function positionedMatrix(frame: FigureFrame, label: string, x: number, y: number): string {
  return `<svg x="${x}" y="${y}" width="145" height="145" viewBox="0 0 180 180">${matrixMarkup(frame)}</svg><text x="${x + 72}" y="${y + 160}" text-anchor="middle" font-size="12">${label}</text>`;
}

function figureSampleSvg(question: FigureSequenceQuestion, sampleIndex: number): string {
  const visible = question.sequence.visibleFrames.map((frame, index) =>
    positionedMatrix(frame, `Visible ${index + 1}`, 15 + index * 155, 55)).join("");
  const choices = question.sequence.missingMatrices.flatMap((matrix, slot) =>
    matrix.candidates.map((candidate, index) => positionedMatrix(
      candidate.frame,
      `M${slot + 1} ${candidate.label}${candidate.id === question.correctAnswer[slot] ? " ✓" : ""}`,
      95 + slot * 590 + index * 155,
      265,
    ))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="450" viewBox="0 0 1280 450"><rect width="1280" height="450" fill="#f8fafc"/><text x="20" y="28" font-family="sans-serif" font-size="20" font-weight="700">${question.metadata.requestedDifficulty.toUpperCase()} ${sampleIndex + 1}</text><text x="20" y="47" font-family="sans-serif" font-size="13" fill="#475569">${question.structuredData.rules.length} rule streams · both missing matrices shown below</text><g font-family="sans-serif">${visible}${choices}</g></svg>`;
}

function writeSamples<TQuestion>(
  module: "equation" | "figure",
  samples: Record<GenerationDifficulty, RankedSample<TQuestion>[]>,
  render: (question: TQuestion, index: number) => string,
): void {
  for (const difficulty of DIFFICULTIES) {
    samples[difficulty].forEach(({ question }, index) => {
      writeFileSync(
        join(REPORT_DIRECTORY, `visual-${module}-${difficulty}-${String(index + 1).padStart(2, "0")}.svg`),
        render(question, index),
      );
    });
  }
}

function writeResult(result: AuditSummary): void {
  mkdirSync(REPORT_DIRECTORY, { recursive: true });
  writeFileSync(
    join(REPORT_DIRECTORY, `${result.module}-10000-audit.json`),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), ...result }, null, 2)}\n`,
  );
}

function collectExpressionCoefficients(expression: MathematicalExpression, output: Distribution): void {
  if (expression.kind !== "operation") return;
  if (expression.operator === "multiply") {
    const coefficient = expression.left.kind === "constant"
      ? expression.left.value
      : expression.right.kind === "constant"
        ? expression.right.value
        : "unsupported";
    increment(output, String(coefficient));
  }
  collectExpressionCoefficients(expression.left, output);
  collectExpressionCoefficients(expression.right, output);
}

function hasInvalidDivision(
  expression: MathematicalExpression,
  assignment: Readonly<Record<string, number>>,
): boolean {
  if (expression.kind !== "operation") return false;
  const currentInvalid = expression.operator === "divide" &&
    !evaluateExpression(expression, assignment).valid;
  return currentInvalid ||
    hasInvalidDivision(expression.left, assignment) ||
    hasInvalidDivision(expression.right, assignment);
}

describe.skipIf(!ENABLED)("Core generator production gate audit", () => {
  if (!Number.isSafeInteger(TOTAL) || TOTAL < 1 || TOTAL > 10_000) {
    throw new RangeError("DMAT_PRODUCTION_GATE_ACCEPTED must be from 1 through 10000.");
  }

  it("audits 10,000 accepted Mathematical Equation questions", async () => {
    const invariantFailures: Distribution = {
      hidden_value_outside_1_20: 0,
      visible_constant_outside_1_20: 0,
      non_integer_hidden_value: 0,
      non_unique_solution: 0,
      zero_solution: 0,
      unsatisfied_equation: 0,
      invalid_division: 0,
      unsupported_mechanic: 0,
      stored_answer_mismatch: 0,
      difficulty_mismatch: 0,
      accepted_invalid: 0,
      public_presentation_mismatch: 0,
    };
    const acceptedByDifficulty: Distribution = {};
    const acceptedBySeedGroup: Distribution = {};
    const rejectionReasons: Distribution = {};
    const graph: Distribution = {};
    const relationship: Distribution = {};
    const coefficient: Distribution = {};
    const hiddenValue: Distribution = {};
    const fingerprints = new Set<string>();
    const signatures = new Set<string>();
    const latencies: number[] = [];
    const samples: Record<GenerationDifficulty, RankedSample<MathematicalEquationQuestion>[]> = {
      easy: [], medium: [], hard: [],
    };
    let attempts = 0;
    let exactDuplicates = 0;
    let structuralReuse = 0;

    for (let index = 0; index < TOTAL; index += 1) {
      const difficulty = DIFFICULTIES[index % DIFFICULTIES.length];
      const { seed, group } = seedFor("mathematical_equation", index);
      const started = performance.now();
      const question = generateValidatedMathematicalEquation({ seed, difficulty, maxAttempts: 100 });
      latencies.push(performance.now() - started);
      attempts += question.metadata.attemptCount;
      increment(acceptedByDifficulty, difficulty);
      increment(acceptedBySeedGroup, group);
      for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
        try {
          const candidate = mathematicalEquationGenerator.generate({ seed, difficulty }, attempt);
          const validation = mathematicalEquationValidator.validate(candidate, difficulty);
          if (validation.valid) increment(rejectionReasons, "NOVELTY_REJECTION");
          else validation.issues.forEach((entry) => increment(rejectionReasons, entry.code));
        } catch {
          increment(rejectionReasons, "CONSTRUCTION_FAILURE");
        }
      }

      const style = inspectMathematicalEquationStyle(question);
      const publicInspection = inspectPublicEquationPresentation(
        question.presentation.blocks,
        question.structuredData.equations,
      );
      const validation = mathematicalEquationValidator.validate(question, difficulty);
      const independentAssignment = validation.valid ? validation.solution.assignment : {};
      const hiddenValues = Object.values(question.correctAnswer);
      const hiddenInvalid = hiddenValues.some((value) => value < 1 || value > 20);
      const nonInteger = hiddenValues.some((value) => !Number.isSafeInteger(value));
      const visibleInvalid = style.visibleConstants.some((value) =>
        !Number.isSafeInteger(value) || value < 1 || value > 20) ||
        publicInspection.visibleConstants.some((value) => value < 1 || value > 20);
      const unsatisfied = question.structuredData.equations.some((equation) => {
        const left = evaluateExpression(equation.left, independentAssignment);
        const right = evaluateExpression(equation.right, independentAssignment);
        return !left.known || !left.valid || !right.known || !right.valid || left.value !== right.value;
      });
      const invalidDivision = question.structuredData.equations.some((equation) =>
        hasInvalidDivision(equation.left, independentAssignment) ||
        hasInvalidDivision(equation.right, independentAssignment));
      const supported = question.structuredData.dependencyModel.relationshipPrimitives?.every((primitive) =>
        EQUATION_RELATIONSHIP_REGISTRY.some((definition) =>
          definition.id === primitive && definition.productionEnabled)) ?? false;
      const answerMismatch = !validation.valid ||
        question.structuredData.variables.some((symbol) =>
          independentAssignment[symbol] !== question.correctAnswer[symbol]);
      if (hiddenInvalid) increment(invariantFailures, "hidden_value_outside_1_20");
      if (nonInteger) increment(invariantFailures, "non_integer_hidden_value");
      if (visibleInvalid) increment(invariantFailures, "visible_constant_outside_1_20");
      if (!validation.valid && validation.issues.some((entry) => entry.code === "no_solution")) {
        increment(invariantFailures, "zero_solution");
      }
      if (!validation.valid && validation.issues.some((entry) =>
        entry.code === "no_solution" || entry.code === "multiple_solutions" || entry.code === "solver_rejected")) {
        increment(invariantFailures, "non_unique_solution");
      }
      if (unsatisfied) increment(invariantFailures, "unsatisfied_equation");
      if (invalidDivision) increment(invariantFailures, "invalid_division");
      if (!supported) increment(invariantFailures, "unsupported_mechanic");
      if (answerMismatch) increment(invariantFailures, "stored_answer_mismatch");
      if (!publicInspection.validFormulaShape) increment(invariantFailures, "public_presentation_mismatch");
      if (question.metadata.calculatedDifficulty !== difficulty) increment(invariantFailures, "difficulty_mismatch");
      if (!validation.valid || hiddenInvalid || nonInteger || visibleInvalid || unsatisfied || invalidDivision || !supported || answerMismatch || !publicInspection.validFormulaShape) {
        increment(invariantFailures, "accepted_invalid");
      }

      if (fingerprints.has(question.metadata.fingerprint)) exactDuplicates += 1;
      fingerprints.add(question.metadata.fingerprint);
      const signature = mathematicalEquationStructuralSignature(question);
      if (signatures.has(signature)) structuralReuse += 1;
      signatures.add(signature);
      increment(graph, question.structuredData.dependencyModel.family);
      question.structuredData.dependencyModel.relationshipPrimitives?.forEach((value) => increment(relationship, value));
      hiddenValues.forEach((value) => increment(hiddenValue, String(value)));
      question.structuredData.equations.forEach((equation) => {
        collectExpressionCoefficients(equation.left, coefficient);
        collectExpressionCoefficients(equation.right, coefficient);
      });
      addSample(samples, difficulty, seed, question);
      if ((index + 1) % 250 === 0) {
        console.info(`Equation production audit: ${index + 1}/${TOTAL} accepted`);
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    const result: AuditSummary = {
      module: "mathematical_equation",
      requestedAccepted: TOTAL,
      accepted: TOTAL,
      acceptedByDifficulty,
      acceptedBySeedGroup,
      generationAttempts: attempts,
      attemptsPerAccepted: rounded(attempts / TOTAL),
      rejectionReasons,
      latencyMilliseconds: latency(latencies),
      exactDuplicateFingerprints: exactDuplicates,
      structuralReuseCount: structuralReuse,
      invariantFailures,
      distributions: { graph, relationship, coefficient, hiddenValue },
    };
    results.push(result);
    writeResult(result);
    writeSamples("equation", samples, equationSampleSvg);
    expect(Object.values(invariantFailures).every((value) => value === 0)).toBe(true);
  }, 1_800_000);

  it("audits 10,000 accepted Figure Sequence questions", async () => {
    const invariantFailures: Distribution = {
      duplicate_rendered_candidates: 0,
      zero_correct_candidate_sets: 0,
      multiple_correct_candidate_sets: 0,
      correct_answer_mismatch: 0,
      object_disappearance: 0,
      illegal_overlap: 0,
      out_of_grid: 0,
      boundary_rule_violation: 0,
      rule_replay_failure: 0,
      render_contract_failure: 0,
      difficulty_mismatch: 0,
      accepted_invalid: 0,
    };
    const acceptedByDifficulty: Distribution = {};
    const acceptedBySeedGroup: Distribution = {};
    const rejectionReasons: Distribution = {};
    const movement: Distribution = {};
    const symbolCount: Distribution = {};
    const fingerprints = new Set<string>();
    const signatures = new Set<string>();
    const latencies: number[] = [];
    const samples: Record<GenerationDifficulty, RankedSample<FigureSequenceQuestion>[]> = {
      easy: [], medium: [], hard: [],
    };
    let attempts = 0;
    let exactDuplicates = 0;
    let structuralReuse = 0;

    for (let index = 0; index < TOTAL; index += 1) {
      const difficulty = DIFFICULTIES[index % DIFFICULTIES.length];
      const { seed, group } = seedFor("figure_sequence", index);
      const started = performance.now();
      const question = generateValidatedFigureSequence({ seed, difficulty, maxAttempts: 5_000 });
      latencies.push(performance.now() - started);
      attempts += question.metadata.attemptCount;
      increment(acceptedByDifficulty, difficulty);
      increment(acceptedBySeedGroup, group);
      for (let attempt = 1; attempt < question.metadata.attemptCount; attempt += 1) {
        try {
          const candidate = figureSequenceGenerator.generate({ seed, difficulty }, attempt);
          const validation = figureSequenceValidator.validate(candidate, difficulty);
          if (validation.valid) increment(rejectionReasons, "NOVELTY_REJECTION");
          else validation.issues.forEach((entry) => increment(rejectionReasons, entry.code));
        } catch {
          increment(rejectionReasons, "CONSTRUCTION_FAILURE");
        }
      }

      const validation = figureSequenceValidator.validate(question, difficulty);
      const hardIssues = validateFigureHardConstraints(question);
      let localInvalid = !validation.valid;
      let replay: FigureFrame[] = [];
      try {
        replay = replayFigureSequence(
          question.structuredData.grid,
          question.structuredData.visibleFrames[0],
          question.structuredData.rules,
          5,
        );
      } catch {
        increment(invariantFailures, "rule_replay_failure");
        localInvalid = true;
      }
      question.sequence.missingMatrices.forEach((matrix, slot) => {
        const values = matrix.candidates.map((candidate) => canonicalRenderedMatrix(candidate.frame));
        const expected = replay[slot + 4] ? canonicalRenderedMatrix(replay[slot + 4]) : null;
        const matches = matrix.candidates.filter((candidate) =>
          expected !== null && canonicalRenderedMatrix(candidate.frame) === expected);
        if (new Set(values).size !== 3) {
          increment(invariantFailures, "duplicate_rendered_candidates");
          localInvalid = true;
        }
        if (matches.length === 0) {
          increment(invariantFailures, "zero_correct_candidate_sets");
          localInvalid = true;
        }
        if (matches.length > 1) {
          increment(invariantFailures, "multiple_correct_candidate_sets");
          localInvalid = true;
        }
        if (matches.length !== 1 || matches[0].id !== question.correctAnswer[slot]) {
          increment(invariantFailures, "correct_answer_mismatch");
          localInvalid = true;
        }
      });
      hardIssues.forEach((entry) => {
        if (entry.constraint === "OBJECTS_CANNOT_DISAPPEAR") increment(invariantFailures, "object_disappearance");
        else if (entry.constraint === "OBJECTS_CANNOT_OVERLAP") increment(invariantFailures, "illegal_overlap");
        else if (entry.constraint === "OBJECTS_CANNOT_LEAVE_GRID") increment(invariantFailures, "out_of_grid");
        else increment(invariantFailures, "boundary_rule_violation");
        localInvalid = true;
      });
      if (question.metadata.calculatedDifficulty !== difficulty) {
        increment(invariantFailures, "difficulty_mismatch");
        localInvalid = true;
      }
      if (localInvalid) increment(invariantFailures, "accepted_invalid");

      if (fingerprints.has(question.metadata.fingerprint)) exactDuplicates += 1;
      fingerprints.add(question.metadata.fingerprint);
      const signature = figureStructuralSignature(question);
      if (signatures.has(signature)) structuralReuse += 1;
      signatures.add(signature);
      increment(symbolCount, String(question.structuredData.visibleFrames[0].symbols.length));
      question.structuredData.rules.forEach((rule) => increment(movement, rule.movement?.kind ?? "none"));
      addSample(samples, difficulty, seed, question);
      if ((index + 1) % 250 === 0) {
        console.info(`Figure production audit: ${index + 1}/${TOTAL} accepted`);
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    const result: AuditSummary = {
      module: "figure_sequence",
      requestedAccepted: TOTAL,
      accepted: TOTAL,
      acceptedByDifficulty,
      acceptedBySeedGroup,
      generationAttempts: attempts,
      attemptsPerAccepted: rounded(attempts / TOTAL),
      rejectionReasons,
      latencyMilliseconds: latency(latencies),
      exactDuplicateFingerprints: exactDuplicates,
      structuralReuseCount: structuralReuse,
      invariantFailures,
      distributions: { movement, symbolCount },
    };
    results.push(result);
    writeResult(result);
    writeSamples("figure", samples, figureSampleSvg);
    expect(Object.values(invariantFailures).every((value) => value === 0)).toBe(true);
  }, 1_800_000);

  afterAll(() => {
    if (results.length !== 2) return;
    writeFileSync(
      join(REPORT_DIRECTORY, "production-gate-summary.json"),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
    );
  });
});
