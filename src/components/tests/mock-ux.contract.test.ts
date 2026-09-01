import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const catalog = readFileSync(resolve(process.cwd(), "src/app/tests/page.tsx"), "utf8");
const mockLibrary = readFileSync(resolve(process.cwd(), "src/components/tests/mock-library.tsx"), "utf8");
const categoryCard = readFileSync(resolve(process.cwd(), "src/components/tests/mock-category-card.tsx"), "utf8");
const generationButton = readFileSync(resolve(process.cwd(), "src/components/tests/generate-core-mock-button.tsx"), "utf8");
const overview = readFileSync(resolve(process.cwd(), "src/app/tests/[testId]/page.tsx"), "utf8");
const runner = readFileSync(resolve(process.cwd(), "src/components/tests/test-runner.tsx"), "utf8");
const testData = readFileSync(resolve(process.cwd(), "src/lib/tests/data.ts"), "utf8");

describe("Mock Test student experience contract", () => {
  it("distinguishes official-format full Core work from custom mocks", () => {
    expect(catalog).toContain("Practise under test conditions");
    expect(catalog).toContain("Official Core format");
    expect(catalog).toContain("Full Core mock");
    expect(catalog).toContain("<GenerateCoreMockButton />");
    expect(generationButton).toContain("generateCoreMockForCurrentUser");
    expect(catalog).toContain('title={selectedCategory?.title ?? "Mock Tests"}');
    expect(catalog).toContain("MockCategoryGrid");
    expect(mockLibrary).toContain("summarizeMockCategories");
    expect(categoryCard).toContain("progress.totalCount");
    expect(categoryCard).toContain("progress.percentage");
    expect(catalog).toContain("DMAT_CURRENT_CORE_PROTOCOL");
  });

  it("keeps Mixed Core available as a legacy detail route but out of the focused landing grid", () => {
    expect(catalog).toContain('selectedCategory.key === "mixed-core"');
    expect(mockLibrary).toContain("category.moduleType !== null");
    expect(mockLibrary).toContain("lg:grid-cols-3");
    expect(mockLibrary).not.toContain("onDemandMixedAvailable");
  });

  it("renders only published database-backed catalog entries without hardcoded focused mocks", () => {
    expect(catalog).toContain("getTestCatalog");
    expect(catalog).toContain("getMockCategory");
    expect(mockLibrary).toContain("getMocksForCategory");
    expect(testData).toContain('.eq("is_published", true)');
    expect(catalog).not.toContain("Focused Mock 1");
    expect(catalog).not.toContain("Focused Mock 2");
  });

  it("loads one batched completed-attempt summary and offers clear start, resume, and retake actions", () => {
    expect(testData).toContain('admin.rpc("get_curated_test_attempt_summaries"');
    expect(mockLibrary).toContain('"Start mock"');
    expect(mockLibrary).toContain('"Resume mock"');
    expect(mockLibrary).toContain('"Try again"');
    expect(mockLibrary).toContain("test.attemptSummary.bestScore");
    expect(mockLibrary).toContain("bestScorePercentage");
    expect(mockLibrary).toContain("Your best score:");
    expect(mockLibrary).toContain("Not attempted yet");
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290028_public_diagnostic_and_mock_summaries.sql"), "utf8");
    expect(migration).toContain("count(attempts.id) filter");
    expect(migration).toContain("max(attempts.score) filter");
    expect(migration).toContain("attempts.status in ('submitted', 'auto_submitted')");
    expect(migration).toContain("order by attempts.submitted_at desc nulls last");
  });

  it("keeps completed curated attempts immutable and starts a new retake", () => {
    const start = testData.indexOf("export async function startTestAttempt");
    const end = testData.indexOf("export async function getTestAttempt", start);
    const startAttempt = testData.slice(start, end);
    expect(startAttempt).toContain('.eq("status", "in_progress")');
    expect(startAttempt).toContain("const attemptId = crypto.randomUUID()");
    expect(startAttempt).not.toContain('.update({ status: "in_progress"');
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
    expect(runner).toContain("repeat(auto-fit,minmax(2.75rem,1fr))");
    expect(runner).toContain('isAnswered ? "answered" : "unanswered"');
    expect(runner).toContain('isCurrent ? "current" : null');
    expect(runner).toContain("minmax(0,1fr)");
    expect(runner).toContain("AssessmentActionZone");
    expect(runner).toContain("contentRef.current?.scrollTo({ top: 0 })");
  });

  it("isolates the one-second timer from the active question surface", () => {
    expect(runner).toContain("const TestTimer = memo");
    expect(runner).toContain('data-testid="isolated-test-timer"');
    expect(runner).toContain('role="timer"');
    expect(runner).not.toContain('<span aria-live="polite" className="flex items-center gap-2 rounded-md');
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
