import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const model = source("src/lib/general-academic/mock.ts");
const data = source("src/lib/general-academic/mock-data.ts");
const actions = source("src/app/mock/general-academic/actions.ts");
const workspace = source("src/components/general-academic/mock-workspace.tsx");
const results = source("src/components/general-academic/mock-results.tsx");
const review = source("src/components/general-academic/mock-review.tsx");
const history = source("src/components/general-academic/mock-history.tsx");
const library = source("src/app/tests/page.tsx");
const learning = source("src/lib/general-academic/learning-data.ts");

describe("General Academic Phase 7 product contract", () => {
  it("labels composition as a PrepDMAT simulation without unsupported official claims", () => {
    expect(library).toContain("PrepDMAT simulation");
    expect(results).toContain("not an official dMAT score");
    expect(results).not.toMatch(/your (?:percentile|pass mark|admission probability)/i);
  });

  it("defines a configuration-driven 90-minute whole-pack composition", () => {
    expect(model).toContain("GENERAL_ACADEMIC_MOCK_DURATION_SECONDS = 90 * 60");
    expect(model).toContain("GENERAL_ACADEMIC_MOCK_TARGET_MIN_QUESTIONS");
    expect(model).toContain("GENERAL_ACADEMIC_MOCK_TARGET_MAX_QUESTIONS");
    expect(model).toContain("packs: selected");
    expect(model).not.toMatch(/slice\(.*questions|questions\.slice/);
  });

  it("uses a persisted version and server-created random seed", () => {
    expect(model).toContain('general-academic-mock-composition@1');
    expect(data).toContain("const seed = randomUUID()");
    expect(data).toContain("p_seed: input.seed");
  });

  it("keeps public and private mock snapshots explicitly separate", () => {
    expect(model).toContain("generalAcademicMockPublicSnapshotSchema");
    expect(model).toContain("generalAcademicMockPrivateSnapshotSchema");
    expect(model).toContain("toStudentGeneralAcademicPack");
    expect(model).toContain("toPrivateGeneralAcademicSnapshot");
  });

  it("returns only student-safe public content before submission", () => {
    expect(data).toContain("packs: stored.publicSnapshot.packs");
    expect(data).not.toMatch(/toStudentAttempt[\s\S]{0,1200}privateSnapshot:/);
    expect(workspace).not.toMatch(/correctOption|privateSnapshot|expectedValue|tolerance/);
    expect(workspace).toContain("explanations remain hidden");
  });

  it("authenticates every mutation and delegates ownership checks to the DAL", () => {
    expect(actions.match(/requireUser\(\)/g)?.length).toBe(3);
    expect(actions).toContain("saveGeneralAcademicMockState(user.id, input)");
    expect(actions).toContain("submitGeneralAcademicMock(user.id, attemptId)");
  });

  it("uses serialized debounced autosave with visible save failure and retry", () => {
    expect(workspace).toContain("saveQueueRef");
    expect(workspace).toContain("window.setTimeout");
    expect(workspace).toContain("Retry save");
    expect(workspace).toContain("Not saved");
  });

  it("uses one isolated accessible server-offset timer", () => {
    expect(workspace).toContain('role="timer"');
    expect(workspace).toContain("attempt.serverNow");
    expect(workspace).toContain("attempt.expiresAt");
    expect(workspace).not.toMatch(/per.?pack timer|seconds.?per.?question/i);
  });

  it("auto-submits at zero and manual submission uses the same action", () => {
    expect(workspace).toContain("if (value === 0");
    expect(workspace).toContain("const expire = useCallback(() => submitNow()");
    expect(workspace).toContain("submitGeneralAcademicMockAction");
  });

  it("provides accessible early-submission confirmation with all counts", () => {
    expect(workspace).toContain("Submit General Academic Mock?");
    for (const label of ["Answered", "Unanswered", "Flagged", "Time remaining"]) expect(workspace).toContain(label);
    expect(workspace).toContain("Continue Mock");
  });

  it("keeps feedback delayed until complete submission", () => {
    expect(workspace).toContain("remain hidden until the complete mock is submitted");
    expect(workspace).not.toMatch(/Check Answer|Correct answer|Explanation|Takeaway/);
  });

  it("supports desktop source/question/palette layout and mobile switching", () => {
    expect(workspace).toContain('aria-label="Source panel"');
    expect(workspace).toContain('aria-label="Question panel"');
    expect(workspace).toContain('aria-label="Question palette"');
    expect(workspace).toContain('role="tablist"');
    expect(workspace).toContain("lg:hidden");
  });

  it("preserves pack boundaries in navigation and swaps source with the active question", () => {
    expect(workspace).toContain('aria-label="Source pack navigation"');
    expect(workspace).toContain("GeneralAcademicSource pack={current.pack}");
    expect(workspace).toContain("Pack {packIndex + 1}");
  });

  it("labels current, answered, unanswered and flagged palette states textually", () => {
    for (const state of ["answered", "unanswered", "flagged", "current"]) expect(workspace).toContain(state);
    expect(workspace).toContain("aria-current");
    expect(workspace).toContain("aria-label={`Question ${label}`}");
  });

  it("renders results with totals, time, source packs, domains and skills", () => {
    for (const value of ["Correct", "Incorrect", "Unanswered", "timeUsedSeconds", "Source-pack performance", "Domains", "Skills"]) expect(results).toContain(value);
  });

  it("offers a source-aware detailed review only through server-scored data", () => {
    expect(review).toContain("GeneralAcademicSource pack={current.pack}");
    for (const value of ["Your answer", "Correct answer", "Explanation", "Takeaway"]) expect(review).toContain(value);
    expect(data).toContain('stored?.status === "submitted"');
  });

  it("supports all, incorrect, unanswered, flagged and pack review filters", () => {
    for (const value of ["All questions", "Incorrect", "Unanswered", "Flagged", "All source packs"]) expect(review).toContain(value);
  });

  it("integrates mock review with source-aware bookmarks and automatic mistakes", () => {
    expect(review).toContain('source="mock"');
    expect(review).toContain("Added to Mistakes");
    expect(learning).toContain("loadSubmittedMockReviews");
    expect(learning).toContain("getGeneralAcademicMockLearningState");
  });

  it("integrates cumulative analytics and deterministic recommendations", () => {
    const migration = source("supabase/migrations/202609030034_general_academic_mock_engine.sql");
    expect(migration).toContain("practice_scored");
    expect(migration).toContain("mock_scored");
    expect(results).toContain("recommendation.href");
  });

  it("provides immutable history, Resume, results and new-mock paths", () => {
    expect(history).toContain("Resume");
    expect(history).toContain("View Results");
    expect(results).toContain("Take Another Mock");
    expect(data).toContain("order(\"started_at\"");
  });

  it("reuses Phase 5 source, formula, table, graph and figure rendering", () => {
    expect(workspace).toContain("GeneralAcademicSource");
    expect(review).toContain("GeneralAcademicSource");
    const sourceRenderer = source("src/components/general-academic/student-source.tsx");
    for (const representation of ["FormulaCard", "table", "graph", "figure"]) expect(sourceRenderer.toLowerCase()).toContain(representation.toLowerCase());
  });

  it("does not add student AI, OmniRoute, adaptive testing, payment, or Core changes", () => {
    const phase7 = [model, data, actions, workspace, results, review, history].join("\n");
    expect(phase7).not.toMatch(/OmniRoute|OpenAI|embedding|adaptive|payment|percentile prediction/i);
    expect(phase7).not.toMatch(/from\(["'](?:tests|test_attempts|user_responses)["']\)/);
  });
});
