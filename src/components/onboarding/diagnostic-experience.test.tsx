import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { DiagnosticSessionState } from "@/lib/onboarding/data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { DiagnosticExperience } from "./diagnostic-experience";

function diagnostic(position: number, selected: boolean): DiagnosticSessionState {
  return {
    sessionId: "10000000-0000-4000-8000-000000000001",
    currentPosition: position,
    questionCount: 15,
    question: {
      id: `20000000-0000-4000-8000-${String(position).padStart(12, "0")}`,
      module: "core",
      questionType: "latin_square",
      topic: "Logic",
      subtopic: null,
      difficulty: "medium",
      questionText: "Choose one answer.",
      passage: null,
      code: null,
      formula: null,
      tableData: null,
      imageUrl: null,
      estimatedTimeSeconds: 60,
      response: {
        kind: "single_choice",
        options: [{ id: "A", label: "A", content: "First option" }],
      },
      options: [{ id: "A", label: "A", content: "First option" }],
    },
    answer: selected ? { kind: "single_choice", optionId: "A" } : null,
    answered: false,
    targetPaceSeconds: 60,
  };
}

describe("diagnostic interaction", () => {
  it("shows one disabled Save & Continue action until an answer is selected", () => {
    const markup = renderToStaticMarkup(<DiagnosticExperience initialSession={diagnostic(6, false)} />);
    expect(markup).toContain("Save &amp; Continue");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*type="submit"/);
    expect(markup).not.toContain("Save answer");
    expect(markup).not.toContain("Next question");
  });

  it("enables Save & Continue after an answer is selected", () => {
    const markup = renderToStaticMarkup(<DiagnosticExperience initialSession={diagnostic(14, true)} />);
    const primaryAction = markup.match(/<button[^>]*type="submit"[^>]*>.*?Save &amp; Continue.*?<\/button>/)?.[0];
    expect(primaryAction).toBeTruthy();
    expect(primaryAction).not.toMatch(/\sdisabled(?:=|\s|>)/);
  });

  it("uses Finish Diagnostic for the final question", () => {
    const markup = renderToStaticMarkup(<DiagnosticExperience initialSession={diagnostic(15, true)} />);
    expect(markup).toContain("Finish Diagnostic");
    expect(markup).not.toContain("Save &amp; Continue");
  });

  it("does not expose correctness or explanations during the diagnostic", () => {
    const markup = renderToStaticMarkup(<DiagnosticExperience initialSession={diagnostic(6, true)} />);
    expect(markup).not.toMatch(/correct answer|incorrect|explanation/i);
  });
});

describe("diagnostic persistence contract", () => {
  const data = readFileSync(resolve(process.cwd(), "src/lib/onboarding/data.ts"), "utf8");
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/202608220019_initial_core_diagnostic.sql"),
    "utf8",
  );

  it("restores the persisted answer at the server-owned current position", () => {
    expect(data).toContain("Math.min(session.current_position, session.question_count)");
    expect(data).toContain('data.response_status === "answered" ? data.response_payload');
    expect(data).toContain("currentPosition: data.position");
  });

  it("retains the 15-question and 5+5+5 mixed-module contract", () => {
    expect(migration).toContain("question_count = 15");
    expect(migration).toContain("item_count <> 15");
    expect(migration).toContain("<> 5");
    for (const type of ["figure_sequence", "mathematical_equation", "latin_square"]) {
      expect(migration).toContain(`('${type}')`);
    }
  });
});

describe("diagnostic pending-state contract", () => {
  const component = readFileSync(
    resolve(process.cwd(), "src/components/onboarding/diagnostic-experience.tsx"),
    "utf8",
  );

  it("disables answer mutation and the primary action while saving", () => {
    expect(component).toContain("disabled={answered || pending}");
    expect(component).toContain('pending\n                  ? "Saving..."');
    expect(component).toContain("disabled={!canContinue}");
  });

  it("guards against double submission and redirects directly to the summary", () => {
    expect(component).toContain("submissionGuard.current.acquire()");
    expect(component).toContain('router.replace("/onboarding/diagnostic/summary")');
  });
});
