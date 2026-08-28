import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  completeTwoStageDraft,
  normalizeEquationInput,
  updateTwoStageDraft,
} from "@/components/practice/native-practice-response";
import type { PracticeQuestion } from "@/lib/practice/schemas";
import { isTestAnswerComplete, LatestResponseQueue } from "./active-response";

function question(response: PracticeQuestion["response"]): PracticeQuestion {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    module: "core",
    questionType: response?.kind === "symbol_assignment"
      ? "mathematical_equation"
      : response?.kind === "two_stage_single_choice"
        ? "figure_sequence"
        : "latin_square",
    topic: "Core",
    subtopic: null,
    difficulty: "medium",
    questionText: "Question",
    passage: null,
    code: null,
    formula: null,
    tableData: null,
    imageUrl: null,
    estimatedTimeSeconds: 60,
    structuredData: response?.kind === "two_stage_single_choice"
      ? {
          missingMatrices: [
            { candidates: [{ id: "A" }, { id: "B" }] },
            { candidates: [{ id: "C" }, { id: "D" }] },
          ],
        }
      : null,
    response,
    options: response?.kind === "single_choice" ? response.options : [],
  };
}

describe("active Mock response completeness", () => {
  it("keeps either Figure matrix as a local draft until both are selected", () => {
    const firstOnly = updateTwoStageDraft(["", ""], 0, "A");
    expect(firstOnly).toEqual(["A", ""]);
    expect(completeTwoStageDraft(firstOnly)).toBeNull();

    const secondOnly = updateTwoStageDraft(["", ""], 1, "C");
    expect(secondOnly).toEqual(["", "C"]);
    expect(completeTwoStageDraft(secondOnly)).toBeNull();

    const complete = updateTwoStageDraft(firstOnly, 1, "C");
    expect(completeTwoStageDraft(complete)).toEqual({
      kind: "two_stage_single_choice",
      optionIds: ["A", "C"],
    });
    expect(updateTwoStageDraft(complete, 0, "B")).toEqual(["B", "C"]);
  });

  it("marks Figure and Equation responses answered only when complete", () => {
    const figure = question({ kind: "two_stage_single_choice" });
    const equation = question({ kind: "symbol_assignment", symbols: ["A", "B", "C", "D"] });
    expect(isTestAnswerComplete(figure, null)).toBe(false);
    expect(isTestAnswerComplete(figure, { kind: "two_stage_single_choice", optionIds: ["A", "C"] })).toBe(true);
    expect(isTestAnswerComplete(equation, { kind: "symbol_assignment", values: { A: 11 } })).toBe(false);
    expect(isTestAnswerComplete(equation, { kind: "symbol_assignment", values: { A: 11, B: 2, C: 7, D: 14 } })).toBe(true);
    expect(isTestAnswerComplete(figure, { kind: "two_stage_single_choice", optionIds: ["forged", "C"] })).toBe(false);
    expect(isTestAnswerComplete(equation, { kind: "symbol_assignment", values: { A: 11, B: 2, C: 7, D: 14, E: 1 } })).toBe(false);
  });

  it("preserves the 1–20 equation editing domain without leading zeroes", () => {
    for (let value = 10; value <= 20; value += 1) {
      expect(normalizeEquationInput(String(value))).toEqual({ raw: String(value), value, valid: true });
    }
    expect(normalizeEquationInput("06")).toEqual({ raw: "6", value: 6, valid: true });
    expect(normalizeEquationInput("21").valid).toBe(false);
  });
});

describe("latest-response-wins queue", () => {
  it("serializes rapid changes and persists the newest payload last", async () => {
    let releaseFirst: (() => void) | undefined;
    const firstBlocked = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const persisted: string[] = [];
    const persist = vi.fn(async (_questionId: string, payload: string) => {
      persisted.push(payload);
      if (payload === "A") await firstBlocked;
    });
    const queue = new LatestResponseQueue(persist);

    queue.stage("question-1", "A");
    const flush = queue.flush("question-1");
    queue.stage("question-1", "B");
    releaseFirst?.();
    await flush;

    expect(persisted).toEqual(["A", "B"]);
    expect(queue.isDirty("question-1")).toBe(false);
  });

  it("keeps a failed payload dirty so Retry can persist it", async () => {
    const persist = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const queue = new LatestResponseQueue<string>(persist);
    queue.stage("question-1", "C");

    await expect(queue.flush("question-1")).rejects.toThrow("offline");
    expect(queue.isDirty("question-1")).toBe(true);
    await queue.flush("question-1");
    expect(queue.isDirty("question-1")).toBe(false);
  });
});

describe("active Mock server persistence contract", () => {
  const data = readFileSync(resolve(process.cwd(), "src/lib/tests/data.ts"), "utf8");
  const runner = readFileSync(resolve(process.cwd(), "src/components/tests/test-runner.tsx"), "utf8");

  it("persists partial Equation values without marking them answered", () => {
    expect(data).toContain("const isComplete = isTestAnswerComplete(publicQuestion, input.answer)");
    expect(data).toContain('p_response_status: isComplete ? "answered" : "unanswered"');
    expect(data).toContain("p_response_payload: input.answer");
    expect(data).toContain('admin.rpc("save_test_response_secure"');
  });

  it("flushes dirty responses before section changes and final grading", () => {
    expect(runner).toContain("if (!(await flushAllResponses())) return");
    expect(runner).toContain("await responseQueue.flushAll()");
    expect(runner).toContain("advanceTestSectionAction");
    expect(runner).toContain("submitTestAction");
  });

  it("makes completed submission retries idempotent", () => {
    expect(data).toContain('attempt.status === "submitted" || attempt.status === "auto_submitted"');
    expect(data).toContain("totalTimeSeconds: Number(attempt.total_time_seconds ?? 0)");
    expect(data).toContain('"finalize_test_attempt_secure"');
    expect(data).toContain("response_payload: response.response_payload");
  });
});
