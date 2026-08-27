import { describe, expect, it } from "vitest";
import {
  generateValidatedFigureSequence,
  generateValidatedLatinSquare,
  generateValidatedMathematicalEquation,
} from "../generation";
import { createPracticeSnapshots, gradePracticeAnswer } from "./native";

describe("native practice snapshots", () => {
  it("removes figure answer identifiers from the browser snapshot", () => {
    const question = generateValidatedFigureSequence({ seed: "practice-figure", difficulty: "easy" });
    const result = createPracticeSnapshots({ id: "id", module: "core", questionType: "figure_sequence", topic: "Figure", subtopic: null, difficulty: "easy", questionText: "Next?", passage: null, code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 60, structuredData: { task: question.structuredData, sequence: question.sequence, solutionFrames: question.solutionFrames, response: question.response }, metadata: { generation: question.metadata, correctAnswer: question.correctAnswer }, explanation: question.explanation, options: [], correctOptionId: null, sourceType: "generated" });
    expect(JSON.stringify(result.publicQuestion)).not.toContain("-correct");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("rules");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("figure-sequence-explanation-trace@1");
    expect(result.privateSnapshot.explanationTrace).toEqual({ rules: question.structuredData.rules });
    expect(result.privateSnapshot.figureExplanationTrace?.version).toBe("figure-sequence-explanation-trace@1");
    expect(result.privateSnapshot.educationalExplanation?.version).toBe("educational-explanation@1");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("educational-explanation@1");
    expect(gradePracticeAnswer({ kind: "two_stage_single_choice", optionIds: result.privateSnapshot.correctAnswer as [string, string] }, result.privateSnapshot)).toBe(true);
  });

  it("grades native assignments independently from browser state", () => {
    expect(gradePracticeAnswer({ kind: "symbol_assignment", values: { A: 4, B: 7 } }, { correctAnswer: { A: 4, B: 7 }, explanation: "", provenance: {} })).toBe(true);
    expect(gradePracticeAnswer({ kind: "symbol_assignment", values: { A: 4, B: 8 } }, { correctAnswer: { A: 4, B: 7 }, explanation: "", provenance: {} })).toBe(false);
  });

  it("keeps the Latin deduction trace private until answer feedback", () => {
    const question = generateValidatedLatinSquare({
      seed: "practice-private-latin-trace",
      difficulty: "hard",
      maxAttempts: 5_000,
    });
    const result = createPracticeSnapshots({
      id: "latin-id", module: "core", questionType: "latin_square", topic: "Latin Squares",
      subtopic: null, difficulty: "hard", questionText: "Which letter?", passage: null,
      code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 90,
      structuredData: {
        task: question.structuredData,
        response: question.response,
        deductionTrace: question.deductionTrace,
        completedGrid: question.completedGrid,
      },
      metadata: { generation: question.metadata, correctAnswer: question.correctAnswer },
      explanation: question.explanation, options: [], correctOptionId: null, sourceType: "generated",
    });
    expect(JSON.stringify(result.publicQuestion)).not.toContain("deductionTrace");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("correctAnswer");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("completedGrid");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("latin-square-explanation-trace@1");
    expect(result.privateSnapshot.explanationTrace).toEqual(question.deductionTrace);
    expect(result.privateSnapshot.latinExplanationTrace?.completedGrid).toEqual(question.completedGrid);
    expect(result.privateSnapshot.educationalExplanation?.validation.source).toBe("deduction_graph");
  });

  it("keeps the Equation solution path private until answer feedback", () => {
    const question = generateValidatedMathematicalEquation({
      seed: "practice-private-equation-trace",
      difficulty: "medium",
    });
    const result = createPracticeSnapshots({
      id: "equation-id", module: "core", questionType: "mathematical_equation",
      topic: "Mathematical Equations", subtopic: null, difficulty: "medium",
      questionText: "Find every value.", passage: null, code: null, formula: null,
      tableData: null, imageUrl: null, estimatedTimeSeconds: 90,
      structuredData: {
        task: question.structuredData,
        response: question.response,
        solutionPath: question.solutionPath,
      },
      metadata: { generation: question.metadata, correctAnswer: question.correctAnswer },
      explanation: question.explanation, options: [], correctOptionId: null, sourceType: "generated",
    });
    expect(JSON.stringify(result.publicQuestion)).not.toContain("solutionPath");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("dependencyModel");
    expect(JSON.stringify(result.publicQuestion)).not.toContain("solveOrder");
    expect(result.privateSnapshot.explanationTrace).toEqual(question.solutionPath);
    expect(result.privateSnapshot.mathematicalExplanationTrace?.version).toBe("mathematical-equation-explanation-trace@1");
    expect(result.privateSnapshot.mathematicalExplanationTrace?.solveTrace.resolvedAssignment).toEqual(question.correctAnswer);
    expect(result.privateSnapshot.educationalExplanation?.validation.source).toBe("solver");
  });
});
