import { describe, expect, it, vi } from "vitest";

import type { DiagnosticSessionState } from "./data";
import {
  createDiagnosticSubmissionGuard,
  saveAndAdvanceDiagnostic,
  type DiagnosticNavigationDependencies,
} from "./diagnostic-navigation";

function session(position: number): DiagnosticSessionState {
  return {
    sessionId: "10000000-0000-4000-8000-000000000001",
    currentPosition: position,
    questionCount: 15,
    question: {
      id: `20000000-0000-4000-8000-${String(position).padStart(12, "0")}`,
      module: "core",
      questionType: "latin_square",
      topic: "Latin Squares",
      subtopic: null,
      difficulty: "medium",
      questionText: "Choose the missing symbol.",
      passage: null,
      code: null,
      formula: null,
      tableData: null,
      imageUrl: null,
      estimatedTimeSeconds: 60,
      response: {
        kind: "single_choice",
        options: [{ id: "A", label: "A", content: "Triangle" }],
      },
      options: [{ id: "A", label: "A", content: "Triangle" }],
    },
    answer: null,
    answered: false,
    targetPaceSeconds: 60,
  };
}

function dependencies(nextSession = session(2)): DiagnosticNavigationDependencies & {
  save: ReturnType<typeof vi.fn>;
  advance: ReturnType<typeof vi.fn>;
  complete: ReturnType<typeof vi.fn>;
} {
  return {
    save: vi.fn().mockResolvedValue({ error: null }),
    advance: vi.fn().mockResolvedValue({ error: null, session: nextSession }),
    complete: vi.fn().mockResolvedValue({ error: null }),
  };
}

const answer = { kind: "single_choice" as const, optionId: "A" };

describe("diagnostic save-and-advance orchestration", () => {
  it("waits for save success before advancing questions 1-14", async () => {
    const events: string[] = [];
    const deps = dependencies();
    deps.save.mockImplementation(async () => {
      events.push("save");
      return { error: null };
    });
    deps.advance.mockImplementation(async () => {
      events.push("advance");
      return { error: null, session: session(2) };
    });

    const result = await saveAndAdvanceDiagnostic(
      { session: session(1), answer, answerAlreadySaved: false },
      deps,
    );

    expect(events).toEqual(["save", "advance"]);
    expect(result.status).toBe("advanced");
  });

  it("does not advance when answer persistence fails", async () => {
    const deps = dependencies();
    deps.save.mockResolvedValue({ error: "Unable to save this answer." });
    const result = await saveAndAdvanceDiagnostic(
      { session: session(6), answer, answerAlreadySaved: false },
      deps,
    );

    expect(result).toEqual({
      status: "error",
      error: "Unable to save this answer.",
      answerSaved: false,
    });
    expect(deps.advance).not.toHaveBeenCalled();
    expect(deps.complete).not.toHaveBeenCalled();
  });

  it("preserves the current selection when persistence rejects", async () => {
    const deps = dependencies();
    deps.save.mockRejectedValue(new Error("network details"));
    const result = await saveAndAdvanceDiagnostic(
      { session: session(6), answer, answerAlreadySaved: false },
      deps,
    );

    expect(result).toEqual({
      status: "error",
      error: "Unable to save this answer. Check your connection and try again.",
      answerSaved: false,
    });
    expect(deps.advance).not.toHaveBeenCalled();
  });

  it("saves question 15 before completing and does not advance", async () => {
    const events: string[] = [];
    const deps = dependencies();
    deps.save.mockImplementation(async () => {
      events.push("save");
      return { error: null };
    });
    deps.complete.mockImplementation(async () => {
      events.push("complete");
      return { error: null };
    });
    const result = await saveAndAdvanceDiagnostic(
      { session: session(15), answer, answerAlreadySaved: false },
      deps,
    );

    expect(events).toEqual(["save", "complete"]);
    expect(result.status).toBe("completed");
    expect(deps.advance).not.toHaveBeenCalled();
  });

  it("retries advancement without mutating an answer that was already saved", async () => {
    const deps = dependencies();
    const result = await saveAndAdvanceDiagnostic(
      { session: session(6), answer, answerAlreadySaved: true },
      deps,
    );

    expect(result.status).toBe("advanced");
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.advance).toHaveBeenCalledOnce();
  });

  it("reports a saved answer when only advancement fails", async () => {
    const deps = dependencies();
    deps.advance.mockResolvedValue({ error: "Unable to load the next question." });
    const result = await saveAndAdvanceDiagnostic(
      { session: session(6), answer, answerAlreadySaved: false },
      deps,
    );

    expect(result).toEqual({
      status: "error",
      error: "Unable to load the next question.",
      answerSaved: true,
    });
  });

  it("allows only one submission until the active operation releases", () => {
    const guard = createDiagnosticSubmissionGuard();
    expect(guard.acquire()).toBe(true);
    expect(guard.acquire()).toBe(false);
    guard.release();
    expect(guard.acquire()).toBe(true);
  });
});
