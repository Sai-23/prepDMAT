import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const catalog = readFileSync(resolve(process.cwd(), "src/app/tests/page.tsx"), "utf8");
const overview = readFileSync(resolve(process.cwd(), "src/app/tests/[testId]/page.tsx"), "utf8");
const runner = readFileSync(resolve(process.cwd(), "src/components/tests/test-runner.tsx"), "utf8");
const testData = readFileSync(resolve(process.cwd(), "src/lib/tests/data.ts"), "utf8");

describe("Mock Test student experience contract", () => {
  it("distinguishes official-format full Core work from custom mocks", () => {
    expect(catalog).toContain("Official Core format");
    expect(catalog).toContain("Full Core mock");
    expect(catalog).toContain("Other mock tests");
    expect(catalog).toContain("DMAT_CURRENT_CORE_PROTOCOL");
  });

  it("keeps feedback hidden during the attempt and preserves saved navigation", () => {
    expect(runner).toContain("saveTestResponseAction");
    expect(runner).toContain("LatestResponseQueue");
    expect(runner).not.toContain("correctAnswer={question.correctAnswer}");
  });

  it("identifies navigator states with semantics and visible symbols as well as colour", () => {
    expect(runner).toContain('aria-current={isCurrent ? "step" : undefined}');
    expect(runner).toContain("data-question-state");
    ["Current", "Answered", "Unanswered", "Flagged for review"].forEach((label) => expect(runner).toContain(label));
  });

  it("warns about the strict section boundary before the test begins", () => {
    expect(overview).toContain("you cannot return to that section");
  });

  it("keeps answer saves separate from navigation and submission pending states", () => {
    expect(runner).not.toContain("useTransition");
    expect(runner).toContain("isChangingSection");
    expect(runner).toContain("isSubmitting");
    expect(runner).toContain("Saving…");
    expect(runner).not.toContain("disabled={pending}");
  });

  it("uses one contextual CTA and removes the permanent sidebar submission card", () => {
    expect(runner).toContain("isTrueFinalQuestion");
    expect(runner).toContain("End Section & Continue");
    expect(runner).toContain("Submit your mock?");
    expect(runner).toContain("Submit Mock");
    expect(runner.match(/Submit Test/g)).toHaveLength(1);
    expect(runner).not.toContain("Submit only when you are ready");
  });

  it("uses a responsive navigator with explicit accessible state labels", () => {
    expect(runner).toContain("repeat(auto-fit,minmax(2.5rem,1fr))");
    expect(runner).toContain('isAnswered ? "answered" : "unanswered"');
    expect(runner).toContain('isCurrent ? "current" : null');
    expect(runner).toContain("minmax(0,1fr)");
  });

  it("isolates the one-second timer from the active question surface", () => {
    expect(runner).toContain("const TestTimer = memo");
    expect(runner).toContain('data-testid="isolated-test-timer"');
    expect(runner.indexOf("const [remainingSeconds")).toBeLessThan(
      runner.indexOf("export function TestRunner"),
    );
  });

  it("loads the attempt, existing response, and immutable item in one autosave read phase", () => {
    const saveStart = testData.indexOf("export async function saveTestResponse");
    const saveEnd = testData.indexOf("export async function gradeAndSubmitTest", saveStart);
    const saveResponse = testData.slice(saveStart, saveEnd);

    expect(saveResponse).toContain(
      "const [{ data: attempt }, { data: response }, { data: item }] = await Promise.all([",
    );
    expect(saveResponse.match(/practice_attempt_items/g)).toHaveLength(1);
  });
});
