import { describe, expect, it } from "vitest";

import {
  DEFAULT_LATIN_SYMBOLS,
  generateValidatedLatinSquare,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "../generation/latin-squares";
import {
  buildLatinSquareWalkthrough,
} from "./latin-square-explanation";
import { createVerifiedLatinExplanationTrace } from "./latin-square-explanation-trace";
import {
  explanationNavigationReducer,
  type ExplanationNavigationState,
} from "./explanation-navigation";

function fixture(difficulty: "easy" | "medium" | "hard") {
  return generateValidatedLatinSquare({
    seed: `latin-practice-explanation-${difficulty}`,
    difficulty,
    maxAttempts: 5_000,
  });
}

function verifiedTrace(question: ReturnType<typeof fixture>) {
  return createVerifiedLatinExplanationTrace(
    question.structuredData,
    question.deductionTrace,
    question.correctAnswer,
    question.completedGrid,
  );
}

function missingFromRow(grid: VisibleLatinGrid, row: number): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !grid[row].includes(symbol));
}

function missingFromColumn(grid: VisibleLatinGrid, column: number): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) =>
    !grid.some((row) => row[column] === symbol),
  );
}

describe("Latin-square Practice explanation mapping", () => {
  it.each([
    ["easy", 4],
    ["medium", 5],
    ["hard", 6],
  ] as const)("creates a concise, trace-backed %s walkthrough", (difficulty, minimumSteps) => {
    const question = fixture(difficulty);
    const walkthrough = buildLatinSquareWalkthrough(
      question.structuredData,
      verifiedTrace(question),
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(true);
    expect(walkthrough.steps.length).toBeGreaterThanOrEqual(minimumSteps);
    expect(walkthrough.steps.map((step) => step.type)).toEqual(expect.arrayContaining([
      "target_row",
      "target_column",
      "compare",
      "final",
    ]));
    expect(walkthrough.steps.at(-1)?.type).toBe("final");
    expect(walkthrough.steps.at(-1)?.symbol).toBe(question.correctAnswer);
    walkthrough.steps.filter((step) => step.type === "intermediate").forEach((step) => {
      expect(question.deductionTrace.some((deduction) =>
        deduction.coordinate.row === step.coordinate.row &&
        deduction.coordinate.column === step.coordinate.column &&
        deduction.symbol === step.symbol,
      )).toBe(true);
    });
  });

  it.each(["easy", "medium", "hard"] as const)(
    "derives the correct target row, column, candidate sets, and intersection for %s",
    (difficulty) => {
      const question = fixture(difficulty);
      const walkthrough = buildLatinSquareWalkthrough(
        question.structuredData,
        verifiedTrace(question),
        question.correctAnswer,
      );
      const rowStep = walkthrough.steps.find((step) => step.type === "target_row");
      const columnStep = walkthrough.steps.find((step) => step.type === "target_column");
      const compareStep = walkthrough.steps.find((step) => step.type === "compare");
      expect(rowStep?.coordinate).toEqual(question.structuredData.target);
      expect(columnStep?.coordinate).toEqual(question.structuredData.target);
      expect(rowStep?.rowCandidates).toEqual(
        missingFromRow(rowStep?.previewGrid ?? [], question.structuredData.target.row),
      );
      expect(columnStep?.columnCandidates).toEqual(
        missingFromColumn(columnStep?.previewGrid ?? [], question.structuredData.target.column),
      );
      expect(compareStep?.commonCandidates).toEqual(
        rowStep?.rowCandidates.filter((symbol) => columnStep?.columnCandidates.includes(symbol)),
      );
      expect(compareStep?.commonCandidates).toContain(question.correctAnswer);
    },
  );

  it.each(["easy", "medium", "hard"] as const)(
    "finishes with the generator's complete verified grid for %s",
    (difficulty) => {
      const question = fixture(difficulty);
      const walkthrough = buildLatinSquareWalkthrough(
        question.structuredData,
        verifiedTrace(question),
        question.correctAnswer,
      );
      const completedGrid = walkthrough.completedGrid;
      expect(completedGrid).not.toBeNull();
      expect(completedGrid?.[question.structuredData.target.row][question.structuredData.target.column])
        .toBe(question.correctAnswer);
      completedGrid?.forEach((row, rowIndex) => {
        expect(question.structuredData.grid[rowIndex].every((clue, columnIndex) =>
          clue === null || completedGrid[rowIndex][columnIndex] === clue,
        )).toBe(true);
        expect([...row].sort()).toEqual([...DEFAULT_LATIN_SYMBOLS].sort());
      });
    },
  );

  it("falls back safely while retaining the verified target in a proof grid when a trace is invalid", () => {
    const question = fixture("hard");
    const walkthrough = buildLatinSquareWalkthrough(
      question.structuredData,
      [{ coordinate: question.structuredData.target, symbol: "A" }],
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(false);
    expect(walkthrough.steps).toEqual([]);
    expect(walkthrough.completedGrid).toBeNull();
    expect(walkthrough.fallbackMessage).toContain(`verified answer is ${question.correctAnswer}`);
  });

  it("validates older stored traces that predate dependency metadata", () => {
    const question = fixture("medium");
    const legacyTrace = question.deductionTrace.map((deduction) => ({
      coordinate: deduction.coordinate,
      symbol: deduction.symbol,
      reason: deduction.reason,
      round: deduction.round,
      depth: deduction.depth,
    }));
    const walkthrough = buildLatinSquareWalkthrough(
      question.structuredData,
      legacyTrace,
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(false);
    expect(walkthrough.fallbackMessage).toContain("earlier question");
  });

  it("supports bounded Previous, Next, and Show all navigation", () => {
    const initial: ExplanationNavigationState = { open: false, view: "step", stepIndex: 0 };
    const open = explanationNavigationReducer(initial, { type: "open" });
    const next = explanationNavigationReducer(open, { type: "next", stepCount: 3 });
    const final = explanationNavigationReducer(next, { type: "next", stepCount: 3 });
    expect(final.stepIndex).toBe(2);
    expect(explanationNavigationReducer(final, { type: "next", stepCount: 3 }).stepIndex).toBe(2);
    expect(explanationNavigationReducer(final, { type: "previous" }).stepIndex).toBe(1);
    const all = explanationNavigationReducer(final, { type: "show_all" });
    expect(all.view).toBe("all");
    expect(explanationNavigationReducer(all, { type: "show_step", stepCount: 3 }).view).toBe("step");
  });
});
