import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { canonicalRenderedMatrix, type FigureSequencePresentation } from "./figure-sequences";
import { generateCoreDiagnosticManifest } from "../onboarding/diagnostic-generation";
import { generatePracticeManifest, type PracticeItemManifest } from "../practice/generation";
import type { PracticeDifficulty, PracticeModule } from "../practice/schemas";

const ENABLED = process.env.DMAT_ORCHESTRATION_GATE_AUDIT === "1";
const PRACTICE_REPEATS = Number(process.env.DMAT_PRACTICE_AUDIT_REPEATS ?? "10");
const DIAGNOSTIC_SETS = Number(process.env.DMAT_DIAGNOSTIC_AUDIT_SETS ?? "100");
const REPORT_DIRECTORY = join(process.cwd(), "reports", "generator-production-gate");

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function collectConstants(value: unknown, output: number[] = []): number[] {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectConstants(entry, output));
    return output;
  }
  const object = record(value);
  if (!object) return output;
  if (object.kind === "constant" && typeof object.value === "number") output.push(object.value);
  Object.values(object).forEach((entry) => collectConstants(entry, output));
  return output;
}

function containsKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((entry) => containsKey(entry, key));
  const object = record(value);
  if (!object) return false;
  return Object.hasOwn(object, key) || Object.values(object).some((entry) => containsKey(entry, key));
}

function publicSnapshotFailures(item: PracticeItemManifest): string[] {
  const failures: string[] = [];
  for (const privateField of [
    "correctAnswer",
    "solutionPath",
    "solutionFrames",
    "dependencyModel",
    "solveOrder",
    "rules",
  ]) {
    if (containsKey(item.public_snapshot, privateField)) failures.push(`private-field:${privateField}`);
  }
  const snapshot = record(item.public_snapshot);
  const structuredData = snapshot?.structuredData;
  if (item.question_type === "mathematical_equation") {
    if (collectConstants(structuredData).some((value) =>
      !Number.isSafeInteger(value) || value < 1 || value > 20)) {
      failures.push("equation-visible-domain");
    }
  }
  if (item.question_type === "figure_sequence") {
    const sequence = structuredData as FigureSequencePresentation;
    if (!sequence?.missingMatrices?.every((matrix) =>
      matrix.candidates.length === 3 &&
      new Set(matrix.candidates.map((candidate) =>
        canonicalRenderedMatrix(candidate.frame))).size === 3)) {
      failures.push("figure-rendered-uniqueness");
    }
  }
  const privateSnapshot = record(item.private_snapshot);
  const provenance = record(privateSnapshot?.provenance);
  if (!provenance?.validatorVersion || !provenance?.generatorVersion) {
    failures.push("missing-validated-provenance");
  }
  return failures;
}

describe.skipIf(!ENABLED)("production orchestration gate audit", () => {
  it("audits repeated Practice and Targeted-Practice sets", async () => {
    expect(Number.isSafeInteger(PRACTICE_REPEATS) && PRACTICE_REPEATS >= 1).toBe(true);
    const modules: readonly PracticeModule[] = ["figure_sequence", "mathematical_equation"];
    const difficulties: readonly PracticeDifficulty[] = ["easy", "medium", "hard", "mixed"];
    const counts = [5, 10, 20] as const;
    let sets = 0;
    let questions = 0;
    let failures = 0;
    const failureReasons: Record<string, number> = {};
    const collectFailures = (manifest: readonly PracticeItemManifest[]) => {
      manifest.flatMap(publicSnapshotFailures).forEach((reason) => {
        failures += 1;
        failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
      });
    };
    for (let repeat = 0; repeat < PRACTICE_REPEATS; repeat += 1) {
      for (const questionModule of modules) {
        for (const difficulty of difficulties) {
          for (const questionCount of counts) {
            const masterSeed = `production-practice:${repeat}:${questionModule}:${difficulty}:${questionCount}`;
            let manifest: PracticeItemManifest[];
            try {
              manifest = generatePracticeManifest({
                module: questionModule,
                difficulty,
                questionCount,
                masterSeed,
              });
            } catch (error) {
              throw new Error(`Practice audit generation failed for ${masterSeed}.`, { cause: error });
            }
            sets += 1;
            questions += manifest.length;
            collectFailures(manifest);
            if (new Set(manifest.map((item) => item.fingerprint)).size !== manifest.length) failures += 1;
            await new Promise<void>((resolve) => setImmediate(resolve));
          }
        }
      }
    }
    const targetedCases = [
      ["figure_sequence", "figure_rotation"],
      ["mathematical_equation", "equation_chains"],
    ] as const;
    for (const [questionModule, skill] of targetedCases) {
      for (let repeat = 0; repeat < PRACTICE_REPEATS; repeat += 1) {
        const manifest = generatePracticeManifest({
          module: questionModule,
          difficulty: "medium",
          questionCount: 5,
          masterSeed: `production-targeted:${repeat}:${skill}`,
          focusSkills: [skill],
        });
        sets += 1;
        questions += manifest.length;
        collectFailures(manifest);
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
    mkdirSync(REPORT_DIRECTORY, { recursive: true });
    writeFileSync(join(REPORT_DIRECTORY, "practice-audit.json"), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      repeats: PRACTICE_REPEATS,
      sets,
      questions,
      failures,
      failureReasons,
    }, null, 2)}\n`);
    expect(failures).toBe(0);
  }, 1_800_000);

  it("audits a large deterministic 15-question Diagnostic population", async () => {
    expect(Number.isSafeInteger(DIAGNOSTIC_SETS) && DIAGNOSTIC_SETS >= 1).toBe(true);
    let questions = 0;
    let failures = 0;
    const failureReasons: Record<string, number> = {};
    for (let index = 0; index < DIAGNOSTIC_SETS; index += 1) {
      const manifest = generateCoreDiagnosticManifest({
        masterSeed: `production-diagnostic:${index}`,
      });
      questions += manifest.length;
      manifest.flatMap(publicSnapshotFailures).forEach((reason) => {
        failures += 1;
        failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
      });
      const distribution = manifest.reduce<Record<string, number>>((counts, item) => {
        counts[item.question_type] = (counts[item.question_type] ?? 0) + 1;
        return counts;
      }, {});
      if (
        manifest.length !== 15 ||
        distribution.figure_sequence !== 5 ||
        distribution.mathematical_equation !== 5 ||
        distribution.latin_square !== 5
      ) failures += 1;
      if ((index + 1) % 20 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    }
    mkdirSync(REPORT_DIRECTORY, { recursive: true });
    writeFileSync(join(REPORT_DIRECTORY, "diagnostic-audit.json"), `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      sets: DIAGNOSTIC_SETS,
      questions,
      failures,
      failureReasons,
    }, null, 2)}\n`);
    expect(failures).toBe(0);
  }, 1_800_000);
});
