import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { generateValidatedFigureSequence } from "../generation/figure-sequences";
import { generateValidatedMathematicalEquation } from "../generation/mathematical-equations";
import { DEFAULT_LATIN_SYMBOLS, generateValidatedLatinSquare } from "../generation/latin-squares";
import {
  buildEquationEducationalExplanation,
  buildFigureEducationalExplanation,
  buildLatinEducationalExplanation,
  diagnoseEquationMistake,
  diagnoseFigureMistake,
  diagnoseLatinMistake,
  isEducationalExplanation,
  type EducationalExplanation,
  type MistakeFeedback,
} from "./educational-explanation";
import { createVerifiedEquationExplanationTrace } from "./mathematical-equation-explanation-trace";
import { createVerifiedFigureExplanationTrace } from "./figure-sequence-explanation-trace";
import { createVerifiedLatinExplanationTrace } from "./latin-square-explanation-trace";

const ENABLED = process.env.RUN_PHASE7_EXPLANATION_AUDIT === "1";
const MODULE = process.env.PHASE7_AUDIT_MODULE ?? "figure_sequence";
const TOTAL = Number(process.env.PHASE7_AUDIT_PER_MODULE ?? "1000");
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];
type AuditSample = {
  seed: string;
  module: string;
  difficulty: Difficulty;
  classification: string;
  correctAnswer: unknown;
  sampleStudentAnswer: unknown;
  feedback: MistakeFeedback | null;
  summary: string;
  steps: EducationalExplanation["steps"];
  takeaway: string;
  internalMetadata: unknown;
};

type DifficultyStats = { requested: number; accepted: number; failed: number; totalSteps: number };

function prohibitedClaim(explanation: EducationalExplanation): boolean {
  const learnerText = [
    explanation.summary,
    explanation.observation,
    explanation.answerConclusion,
    explanation.takeaway,
    ...explanation.steps.flatMap((step) => [step.title, step.description]),
  ].join(" ");
  return /\b(careless|rushed|too slow|guessed|did not try|didn't try)\b/i.test(learnerText);
}

function makeOne(module: string, difficulty: Difficulty, seed: string) {
  if (module === "figure_sequence") {
    const question = generateValidatedFigureSequence({ seed, difficulty, maxAttempts: 5_000 });
    const trace = createVerifiedFigureExplanationTrace(question.sequence, { rules: question.structuredData.rules }, question.correctAnswer, question.solutionFrames);
    const explanation = buildFigureEducationalExplanation(question.sequence, trace, question.correctAnswer, difficulty);
    const wrong = question.sequence.missingMatrices.map((matrix, index) =>
      matrix.candidates.find((candidate) => candidate.id !== question.correctAnswer[index])?.id ?? "",
    );
    return {
      explanation,
      correctAnswer: question.correctAnswer,
      wrong,
      diagnosis: diagnoseFigureMistake(question.sequence, wrong, question.correctAnswer),
      internalMetadata: { rules: question.structuredData.rules, generatorVersion: question.metadata.generatorVersion },
    };
  }
  if (module === "mathematical_equation") {
    const question = generateValidatedMathematicalEquation({ seed, difficulty, maxAttempts: 100 });
    const trace = createVerifiedEquationExplanationTrace(question.structuredData, question.solutionPath, question.correctAnswer);
    const explanation = buildEquationEducationalExplanation(question.structuredData, trace, question.correctAnswer, difficulty);
    const wrong = { ...question.correctAnswer };
    wrong[question.structuredData.variables[0]] += 1;
    return {
      explanation,
      correctAnswer: question.correctAnswer,
      wrong,
      diagnosis: diagnoseEquationMistake(question.structuredData, trace, wrong, question.correctAnswer),
      internalMetadata: {
        solutionPath: question.solutionPath,
        dependencyModel: question.structuredData.dependencyModel,
        fastestMethod: question.fastestMethod,
        generatorVersion: question.metadata.generatorVersion,
      },
    };
  }
  const question = generateValidatedLatinSquare({ seed, difficulty, maxAttempts: 5_000 });
  const trace = createVerifiedLatinExplanationTrace(question.structuredData, question.deductionTrace, question.correctAnswer, question.completedGrid);
  const explanation = buildLatinEducationalExplanation(question.structuredData, trace, question.correctAnswer, difficulty);
  const wrong = DEFAULT_LATIN_SYMBOLS.find((symbol) => symbol !== question.correctAnswer) ?? null;
  return {
    explanation,
    correctAnswer: question.correctAnswer,
    wrong,
    diagnosis: diagnoseLatinMistake(question.structuredData, question.deductionTrace, wrong, question.correctAnswer),
    internalMetadata: { deductionTrace: question.deductionTrace, generatorVersion: question.metadata.generatorVersion },
  };
}

describe.skipIf(!ENABLED)("Phase 7 deterministic explanation audit", () => {
  it(`audits ${TOTAL} balanced ${MODULE} explanations`, () => {
    const byDifficulty = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, {
      requested: 0,
      accepted: 0,
      failed: 0,
      totalSteps: 0,
    }])) as Record<Difficulty, DifficultyStats>;
    const failures: Array<{ seed: string; difficulty: Difficulty; reason: string }> = [];
    const samples: AuditSample[] = [];
    let accepted = 0;
    let missingReasoningData = 0;
    let fallbackExplanations = 0;
    let supportedDiagnoses = 0;
    let unsupportedDiagnoses = 0;
    let unsupportedClaims = 0;
    let totalSteps = 0;

    for (let index = 0; index < TOTAL; index += 1) {
      const difficulty = DIFFICULTIES[index % DIFFICULTIES.length];
      const seed = `phase7-${MODULE}-${difficulty}-${index}`;
      byDifficulty[difficulty].requested += 1;
      try {
        const result = makeOne(MODULE, difficulty, seed);
        if (!result.explanation || !isEducationalExplanation(result.explanation)) {
          missingReasoningData += 1;
          fallbackExplanations += 1;
          byDifficulty[difficulty].failed += 1;
          failures.push({ seed, difficulty, reason: "No validated educational explanation." });
          continue;
        }
        accepted += 1;
        byDifficulty[difficulty].accepted += 1;
        byDifficulty[difficulty].totalSteps += result.explanation.steps.length;
        totalSteps += result.explanation.steps.length;
        if (prohibitedClaim(result.explanation)) unsupportedClaims += 1;
        if (result.diagnosis?.supported) supportedDiagnoses += 1;
        else unsupportedDiagnoses += 1;
        if (samples.filter((sample) => sample.difficulty === difficulty).length < 5) {
          samples.push({
            seed,
            module: MODULE,
            difficulty,
            classification: result.explanation.reasoningClassification,
            correctAnswer: result.correctAnswer,
            sampleStudentAnswer: result.wrong,
            feedback: result.diagnosis,
            summary: result.explanation.summary,
            steps: result.explanation.steps,
            takeaway: result.explanation.takeaway,
            internalMetadata: result.internalMetadata,
          });
        }
      } catch (error) {
        byDifficulty[difficulty].failed += 1;
        failures.push({ seed, difficulty, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    const report = {
      version: "phase7-explanation-audit@1",
      module: MODULE,
      requested: TOTAL,
      accepted,
      failures,
      failureCount: failures.length,
      unsupportedClaims,
      missingReasoningData,
      fallbackExplanations,
      diagnosis: { supported: supportedDiagnoses, neutralOrUnsupported: unsupportedDiagnoses },
      averageSteps: accepted ? Number((totalSteps / accepted).toFixed(3)) : 0,
      byDifficulty: Object.fromEntries(Object.entries(byDifficulty).map(([difficulty, stats]) => [difficulty, {
        ...stats,
        averageSteps: stats.accepted ? Number((stats.totalSteps / stats.accepted).toFixed(3)) : 0,
      }])),
      samples,
    };
    const reportDirectory = resolve(process.cwd(), "reports", "phase7");
    mkdirSync(reportDirectory, { recursive: true });
    writeFileSync(resolve(reportDirectory, `${MODULE}-audit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");

    expect(failures).toEqual([]);
    expect(accepted).toBe(TOTAL);
    expect(unsupportedClaims).toBe(0);
    expect(missingReasoningData).toBe(0);
    expect(fallbackExplanations).toBe(0);
    expect(samples).toHaveLength(Math.min(15, TOTAL));
  }, 30 * 60 * 1_000);
});
