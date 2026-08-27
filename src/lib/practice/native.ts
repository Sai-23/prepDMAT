import type { PracticeAnswer, PracticeQuestion, PracticeResponse } from "./schemas";
import type { FigureSequencePresentation } from "../generation/figure-sequences";
import type { MathematicalEquationStructuredData } from "../generation/mathematical-equations";
import type { LatinSquareStructuredData } from "../generation/latin-squares";
import {
  buildEquationEducationalExplanation,
  buildFigureEducationalExplanation,
  buildLatinEducationalExplanation,
  type EducationalExplanation,
} from "./educational-explanation";
import { createVerifiedEquationExplanationTrace } from "./mathematical-equation-explanation-trace";
import type { EquationExplanationTrace } from "./mathematical-equation-explanation";
import {
  createVerifiedFigureExplanationTrace,
  type FigureExplanationTrace,
} from "./figure-sequence-explanation-trace";
import {
  createVerifiedLatinExplanationTrace,
  type LatinExplanationTrace,
} from "./latin-square-explanation-trace";

type Option = { id: string; label: string; content: string };
type Source = Omit<PracticeQuestion, "structuredData" | "response" | "options"> & {
  structuredData: unknown;
  metadata: unknown;
  explanation: string;
  options: Option[];
  correctOptionId: string | null;
  sourceType: string;
};

export type PrivatePracticeSnapshot = {
  correctAnswer: unknown;
  explanation: string;
  explanationTrace?: unknown;
  figureExplanationTrace?: FigureExplanationTrace;
  latinExplanationTrace?: LatinExplanationTrace;
  mathematicalExplanationTrace?: EquationExplanationTrace;
  educationalExplanation?: EducationalExplanation;
  provenance: Record<string, unknown>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function createPracticeSnapshots(source: Source): { publicQuestion: PracticeQuestion; privateSnapshot: PrivatePracticeSnapshot } {
  const stored = record(structuredClone(source.structuredData)) ?? {};
  const metadata = record(structuredClone(source.metadata)) ?? {};
  const generation = record(metadata.generation) ?? {};
  let structuredData: unknown = {};
  let response: PracticeResponse;
  let correctAnswer: unknown;
  let explanationTrace: unknown;
  let explanationStructuredData: unknown;
  let mathematicalExplanationTrace: EquationExplanationTrace | null = null;
  let figureExplanationTrace: FigureExplanationTrace | null = null;
  let latinExplanationTrace: LatinExplanationTrace | null = null;

  if (source.sourceType !== "generated") {
    response = { kind: "single_choice", options: source.options };
    correctAnswer = source.correctOptionId;
  } else if (source.questionType === "mathematical_equation") {
    const specification = record(stored.response);
    const equationTask = record(stored.task) ?? {};
    structuredData = {
      variables: structuredClone(equationTask.variables),
      equations: structuredClone(equationTask.equations),
      domain: structuredClone(equationTask.domain),
    };
    explanationStructuredData = stored.task;
    response = { kind: "symbol_assignment", symbols: Array.isArray(specification?.symbols) ? specification.symbols.filter((item): item is string => typeof item === "string") : [] };
    correctAnswer = metadata.correctAnswer;
    explanationTrace = structuredClone(stored.solutionPath);
    mathematicalExplanationTrace = createVerifiedEquationExplanationTrace(
      explanationStructuredData as MathematicalEquationStructuredData,
      explanationTrace,
      correctAnswer,
    );
  } else if (source.questionType === "latin_square") {
    const specification = record(stored.response);
    const sourceOptions = Array.isArray(specification?.options) ? specification.options : [];
    structuredData = stored.task;
    response = { kind: "single_choice", options: sourceOptions.map((item, index) => {
      const option = record(item);
      return { id: String(option?.id ?? index), label: String(option?.label ?? ""), content: String(option?.content ?? "") };
    }) };
    correctAnswer = metadata.correctAnswer;
    explanationTrace = structuredClone(stored.deductionTrace);
    latinExplanationTrace = createVerifiedLatinExplanationTrace(
      structuredData as LatinSquareStructuredData,
      explanationTrace,
      correctAnswer,
      stored.completedGrid,
    );
  } else if (source.questionType === "figure_sequence") {
    const storedSequence = record(stored.sequence) ?? {};
    const sequence = {
      grid: structuredClone(storedSequence.grid),
      visibleFrames: structuredClone(storedSequence.visibleFrames),
      missingMatrices: structuredClone(storedSequence.missingMatrices),
    } as { missingMatrices?: Array<{ candidates?: Array<{ id: string }> }> };
    const storedAnswers = Array.isArray(metadata.correctAnswer) ? metadata.correctAnswer.map(String) : [];
    const publicAnswers: string[] = [];
    sequence.missingMatrices?.forEach((matrix, matrixIndex) => matrix.candidates?.forEach((candidate, candidateIndex) => {
      const originalId = candidate.id;
      candidate.id = `candidate-${matrixIndex + 1}-${candidateIndex + 1}`;
      if (storedAnswers[matrixIndex] === originalId) publicAnswers[matrixIndex] = candidate.id;
    }));
    structuredData = sequence;
    response = { kind: "two_stage_single_choice" };
    correctAnswer = publicAnswers;
    explanationTrace = { rules: structuredClone(record(stored.task)?.rules) };
    figureExplanationTrace = createVerifiedFigureExplanationTrace(
      structuredData as FigureSequencePresentation,
      explanationTrace,
      correctAnswer,
      stored.solutionFrames,
    );
  } else {
    throw new Error("Unsupported generated practice response type.");
  }

  const publicQuestion: PracticeQuestion = {
      id: source.id,
      module: source.module,
      questionType: source.questionType,
      topic: source.topic,
      subtopic: source.subtopic,
      difficulty: source.difficulty,
      questionText: source.questionText,
      passage: source.passage,
      code: source.code,
      formula: source.formula,
      tableData: source.tableData,
      imageUrl: source.imageUrl,
      estimatedTimeSeconds: source.estimatedTimeSeconds,
      structuredData,
      response,
      options: response.kind === "single_choice" ? response.options : [],
    };
  const educationalExplanation = source.sourceType === "generated"
    ? source.questionType === "figure_sequence"
      ? buildFigureEducationalExplanation(structuredData as FigureSequencePresentation, figureExplanationTrace, correctAnswer, source.difficulty)
      : source.questionType === "mathematical_equation"
        ? buildEquationEducationalExplanation(
            explanationStructuredData as MathematicalEquationStructuredData,
            mathematicalExplanationTrace,
            correctAnswer,
            source.difficulty,
          )
        : source.questionType === "latin_square"
          ? buildLatinEducationalExplanation(structuredData as LatinSquareStructuredData, latinExplanationTrace, correctAnswer, source.difficulty)
          : null
    : null;
  return {
    publicQuestion,
    privateSnapshot: {
      correctAnswer,
      explanation: source.explanation,
      ...(explanationTrace === undefined ? {} : { explanationTrace }),
      ...(figureExplanationTrace ? { figureExplanationTrace } : {}),
      ...(latinExplanationTrace ? { latinExplanationTrace } : {}),
      ...(mathematicalExplanationTrace ? { mathematicalExplanationTrace } : {}),
      ...(educationalExplanation ? { educationalExplanation } : {}),
      provenance: generation,
    },
  };
}

export function gradePracticeAnswer(answer: PracticeAnswer, privateSnapshot: PrivatePracticeSnapshot): boolean {
  const expected = privateSnapshot.correctAnswer;
  if (answer.kind === "single_choice") return answer.optionId === expected;
  if (answer.kind === "symbol_assignment") return JSON.stringify(answer.values, Object.keys(answer.values).sort()) === JSON.stringify(expected, Object.keys(record(expected) ?? {}).sort());
  return JSON.stringify(answer.optionIds) === JSON.stringify(expected);
}
