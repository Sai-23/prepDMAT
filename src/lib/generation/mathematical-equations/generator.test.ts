import { describe, expect, it } from "vitest";

import type { MathematicalExpression, VariableAssignment } from "./types";
import { calculateEquationDifficulty } from "./difficulty";
import { mathematicalEquationStructuralSignature } from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import { inspectMathematicalEquationStyle } from "./style";
import { buildCanonicalSolveTrace, validateSolveTraceRange } from "./solve-trace";
import { MATHEMATICAL_EQUATION_DOMAIN } from "./types";

function evaluate(expression: MathematicalExpression, values: VariableAssignment): number {
  if (expression.kind === "constant") return expression.value;
  if (expression.kind === "variable") return values[expression.symbol];
  const left = evaluate(expression.left, values);
  const right = evaluate(expression.right, values);
  if (expression.operator === "add") return left + right;
  if (expression.operator === "subtract") return left - right;
  if (expression.operator === "multiply") return left * right;
  return left / right;
}

describe("MathematicalEquationGenerator", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "is deterministic for %s configuration",
    (difficulty) => {
      const configuration = { seed: "stable-seed", difficulty };
      expect(mathematicalEquationGenerator.generate(configuration, 1)).toEqual(
        mathematicalEquationGenerator.generate(configuration, 1),
      );
    },
    20_000,
  );

  it.each(["easy", "medium", "hard"] as const)(
    "constructs clean solution-first %s candidates",
    (difficulty) => {
      for (let seed = 0; seed < 250; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate(
          { seed: `construction-${seed}`, difficulty },
          1,
        );
        const answer = candidate.correctAnswer;
        const variableCount = candidate.structuredData.variables.length;
        if (difficulty === "easy") expect(variableCount).toBe(2);
        else if (difficulty === "hard") expect(variableCount).toBe(4);
        else expect([3, 4]).toContain(variableCount);
        expect(candidate.structuredData.equations).toHaveLength(variableCount);
        expect(Object.keys(answer).sort()).toEqual([...candidate.structuredData.variables].sort());
        expect(Object.values(answer).every(Number.isInteger)).toBe(true);
        expect(Object.values(answer).every((value) => value >= 1 && value <= 20)).toBe(true);
        expect(candidate.response).toEqual({ kind: "symbol_assignment", symbols: candidate.structuredData.variables });
        expect(candidate.reasoningPath.length).toBeGreaterThanOrEqual(2);
        expect(candidate.fastestMethod.length).toBeGreaterThan(20);
        expect(candidate.presentation.blocks.every((block) =>
          block.kind !== "formula" || (!block.expression.includes("*") && !block.expression.includes("/")),
        )).toBe(true);
        for (const equation of candidate.structuredData.equations) {
          expect(evaluate(equation.left, answer)).toBe(evaluate(equation.right, answer));
        }
      }
    },
    20_000,
  );

  it("uses the attempt to produce a deterministic retry candidate", () => {
    const configuration = { seed: "retry", difficulty: "hard" as const };
    expect(mathematicalEquationGenerator.generate(configuration, 1)).not.toEqual(
      mathematicalEquationGenerator.generate(configuration, 2),
    );
  });

  it("rejects invalid attempts and empty seeds", () => {
    expect(() => mathematicalEquationGenerator.generate({ seed: "bad", difficulty: "easy" }, 0)).toThrow(RangeError);
    expect(() => mathematicalEquationGenerator.generate({ seed: "  ", difficulty: "easy" }, 1)).toThrow(/non-empty/);
  });

  it.each(["easy", "medium", "hard"] as const)(
    "calibrates %s by structural reasoning rather than number size",
    (difficulty) => {
      const families = new Set<string>();
      const firstEquationPositions = new Set<number>();
      for (let seed = 0; seed < 200; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate({ seed: `calibration-${difficulty}-${seed}`, difficulty }, 1);
        const metrics = calculateEquationDifficulty(candidate).metrics;
        families.add(candidate.structuredData.dependencyModel.family);
        firstEquationPositions.add(candidate.solutionPath[0].equationIndex);
        expect(calculateEquationDifficulty(candidate).difficulty).toBe(difficulty);
        expect(metrics.coefficientComplexity).toBeLessThanOrEqual(6);
        expect(candidate.structuredData.dependencyModel.relationshipPrimitives).toHaveLength(metrics.variableCount);
        expect(candidate.structuredData.variables).toContain(
          candidate.structuredData.dependencyModel.targetSymbol,
        );
        if (difficulty === "easy") {
          expect(metrics.variableCount).toBe(2);
          expect(metrics.meaningfulReasoningSteps).toBeGreaterThanOrEqual(2);
          expect(metrics.meaningfulReasoningSteps).toBeLessThanOrEqual(3);
          expect(metrics.hiddenGroupingCount).toBeLessThanOrEqual(1);
          expect(metrics.targetDepth).toBeLessThanOrEqual(1);
          expect(metrics.mentalArithmeticCost).toBeLessThanOrEqual(9);
        } else if (difficulty === "medium") {
          expect([3, 4]).toContain(metrics.variableCount);
          expect(metrics.meaningfulReasoningSteps).toBeGreaterThanOrEqual(3);
          expect(metrics.meaningfulReasoningSteps).toBeLessThanOrEqual(5);
          expect(metrics.dependencyDepth + metrics.recombinationCount + metrics.multiVariableConstraintCount)
            .toBeGreaterThanOrEqual(1);
        } else {
          expect(metrics.variableCount).toBe(4);
          expect(metrics.meaningfulReasoningSteps).toBeGreaterThanOrEqual(4);
          if (candidate.solutionPath[0].reasoning === "combine_equations") {
            expect(candidate.solutionPath[0].supportingEquationIndices?.length).toBeGreaterThanOrEqual(1);
          } else {
            expect(metrics.directEntryPointCount).toBeGreaterThanOrEqual(1);
          }
        }
      }
      expect(families.size).toBeGreaterThanOrEqual(difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 6);
      expect(firstEquationPositions.size).toBeGreaterThan(1);
    },
    20_000,
  );

  it("composes many structures from a small graph-and-relationship taxonomy", () => {
    const byFamily = new Map<string, ReturnType<typeof mathematicalEquationGenerator.generate>>();
    const structures = new Set<string>();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 50; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate({ seed: `family-${difficulty}-${seed}`, difficulty }, 1);
        byFamily.set(`${difficulty}:${candidate.structuredData.dependencyModel.family}`, candidate);
        structures.add(mathematicalEquationStructuralSignature(candidate));
      }
    }
    expect(byFamily.size).toBeGreaterThanOrEqual(8);
    expect(structures.size).toBeGreaterThan(30);
    expect([...byFamily.values()].filter((candidate) =>
      (candidate.structuredData.dependencyModel.hiddenGroupingCount ?? 0) > 0,
    ).length).toBeGreaterThanOrEqual(6);
  });

  it("covers the production relationship vocabulary without unsafe display arithmetic", () => {
    const relationships = new Set<string>();
    const reasoningFamilies = new Set<string>();
    const familySamples = new Map<string, ReturnType<typeof mathematicalEquationGenerator.generate>>();
    const reasoningFamilySamples = new Map<string, ReturnType<typeof mathematicalEquationGenerator.generate>>();
    const hardTargets = new Set<string>();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 500; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate({ seed: `coverage-${difficulty}-${seed}`, difficulty }, 1);
        candidate.structuredData.dependencyModel.relationshipPrimitives?.forEach((item) => {
          relationships.add(item);
          if (!familySamples.has(item)) familySamples.set(item, candidate);
        });
        candidate.structuredData.dependencyModel.reasoningFamilies?.forEach((item) => {
          reasoningFamilies.add(item);
          if (!reasoningFamilySamples.has(item)) reasoningFamilySamples.set(item, candidate);
        });
        if (difficulty === "hard") hardTargets.add(candidate.structuredData.dependencyModel.targetSymbol ?? "");
        const style = inspectMathematicalEquationStyle(candidate);
        expect(style.negativeDisplayedConstantCount).toBe(0);
        expect(style.maximumDisplayedConstant).toBeLessThanOrEqual(20);
        expect(style.maximumCoefficient).toBeLessThanOrEqual(6);
      }
    }
    expect(relationships).toEqual(new Set([
      "offset_add", "offset_subtract", "scale", "divide_by_constant", "sum",
      "difference", "complement", "weighted_sum", "multi_variable_sum",
      "multi_variable_balance",
    ]));
    expect(reasoningFamilies).toEqual(new Set([
      "simple_sum", "simple_difference", "reverse_difference", "direct_scale", "division",
      "scale_offset", "weighted_sum", "weighted_difference", "constant_first",
      "variables_both_sides", "three_variable", "same_target", "elimination_pair",
      "weighted_elimination", "dependency_chain", "branching", "recombination",
      "coefficient_collection",
    ]));
    for (const candidate of new Set([...familySamples.values(), ...reasoningFamilySamples.values()])) {
      const trace = buildCanonicalSolveTrace(candidate, candidate.correctAnswer);
      expect(validateSolveTraceRange(trace, MATHEMATICAL_EQUATION_DOMAIN).valid).toBe(true);
      expect(candidate.presentation.blocks).toHaveLength(candidate.structuredData.equations.length);
    }
    expect(hardTargets).toEqual(new Set(["A", "B", "C", "D"]));
  }, 60_000);

  it("keeps graph selection stable across retries instead of falling back to an easier family", () => {
    const configuration = { seed: "stable-family", difficulty: "hard" as const };
    const families = new Set(Array.from({ length: 12 }, (_, index) =>
      mathematicalEquationGenerator.generate(configuration, index + 1).structuredData.dependencyModel.family,
    ));
    expect(families.size).toBe(1);
  });

  it("gives Easy multiple short reasoning graphs without increasing its variable budget", () => {
    const graphs = new Map<string, number>();
    for (let seed = 0; seed < 600; seed += 1) {
      const candidate = mathematicalEquationGenerator.generate({ seed: `easy-diversity-${seed}`, difficulty: "easy" }, 1);
      const family = candidate.structuredData.dependencyModel.family;
      graphs.set(family, (graphs.get(family) ?? 0) + 1);
      expect(candidate.structuredData.variables).toHaveLength(2);
      expect(candidate.structuredData.dependencyModel.rootStrategy).not.toBe("direct");
      expect(candidate.structuredData.dependencyModel.relationshipPrimitives).not.toContain("direct_value");
      expect(candidate.solutionPath[0].reasoning).toBe("combine_equations");
      expect(calculateEquationDifficulty(candidate).difficulty).toBe("easy");
    }
    expect(new Set(graphs.keys())).toEqual(new Set(["direct", "chain", "reverse_chain"]));
    expect((graphs.get("direct") ?? 0) / 600).toBeLessThan(0.45);
  });

  it("constructs scale and division from compatible domains instead of divisibility luck", () => {
    const relationships: Record<string, number> = {};
    for (let seed = 0; seed < 900; seed += 1) {
      const candidate = mathematicalEquationGenerator.generate({ seed: `relationship-balance-${seed}`, difficulty: "medium" }, 1);
      candidate.structuredData.dependencyModel.relationshipPrimitives?.forEach((relationship) => {
        relationships[relationship] = (relationships[relationship] ?? 0) + 1;
      });
    }
    expect(relationships.scale).toBeGreaterThan(100);
    expect(relationships.divide_by_constant).toBeGreaterThan(100);
  }, 15_000);
});
