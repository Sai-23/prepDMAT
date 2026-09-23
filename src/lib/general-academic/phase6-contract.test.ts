import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

describe("General Academic Phase 6 learning-loop contract", () => {
  const data = source("src/lib/general-academic/learning-data.ts");
  const model = source("src/lib/general-academic/learning.ts");
  const library = source("src/components/general-academic/learning-library.tsx");
  const review = source("src/components/general-academic/learning-review.tsx");
  const actions = source("src/app/practice/general-academic/learning-actions.ts");
  const results = source("src/components/general-academic/practice-results.tsx");
  const practiceData = source("src/lib/general-academic/practice-data.ts");

  it("keeps GAM learning records separate from Core bookmarks and mistakes", () => {
    expect(data).toContain('from("general_academic_bookmarks")');
    expect(data).toContain('from("general_academic_mistakes")');
    expect(data).not.toMatch(/\.from\("(?:bookmarks|mistake_notebook_entries)"\)/);
  });

  it("authenticates every learning route and Server Action", () => {
    for (const route of ["bookmarks/page.tsx", "bookmarks/[bookmarkId]/page.tsx", "mistakes/page.tsx", "mistakes/[mistakeId]/page.tsx"]) {
      expect(source(`src/app/practice/general-academic/${route}`)).toContain("requireUser()");
    }
    expect(source("src/app/progress/general-academic/page.tsx")).toContain("requireUser()");
    expect(actions.match(/requireUser\(\)/g)).toHaveLength(2);
  });

  it("scopes every learning query or mutation by authenticated user", () => {
    expect(data).not.toContain("auth.getUser");
    expect(data.match(/\.eq\("user_id", userId\)/g)?.length).toBeGreaterThanOrEqual(7);
    expect(data).toContain("p_user_id: userId");
  });

  it("groups libraries by source pack rather than presenting an isolated MCQ bank", () => {
    expect(library).toContain("result.set(item.sourcePackId");
    expect(library).toContain("source pack");
    expect(library).toContain("first.pack.title");
  });

  it("supports domain, skill, difficulty, active and resolved filters", () => {
    for (const term of ["Domain", "Skill", "Difficulty", "active", "resolved"]) expect(library).toContain(term);
  });

  it("shows complete source context in bookmark and mistake review", () => {
    expect(review).toContain("<GeneralAcademicSource");
    expect(review).toContain('panel === "source"');
    expect(review).toContain("Correct answer");
    expect(review).toContain("item.explanation.steps");
  });

  it("provides an accessible optimistic bookmark control with rollback", () => {
    const control = source("src/components/general-academic/learning-actions.tsx");
    expect(control).toContain("aria-pressed={bookmarked}");
    expect(control).toContain('aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}');
    expect(control.match(/setBookmarked\(!next\)/g)).toHaveLength(2);
  });

  it("does not expose a client-controlled mistake mutation", () => {
    expect(actions).not.toMatch(/mistake.*(?:create|update|toggle)/i);
    expect(data).not.toMatch(/export async function (?:create|update|toggle).*Mistake/i);
  });

  it("uses transparent minimum-sample analytics without mastery scores", () => {
    expect(model).toContain("GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS = 3");
    expect(model).toContain("GENERAL_ACADEMIC_WEAK_ACCURACY_PERCENT = 70");
    expect(model).not.toMatch(/mastery|AI Confidence/i);
  });

  it("keeps recommendations deterministic and provider-free", () => {
    expect(model).toContain("getGeneralAcademicPracticeRecommendations");
    expect(model).not.toMatch(/OMNIROUTE|OPENAI|embedding|Math\.random/i);
    expect(data).not.toMatch(/OMNIROUTE|OPENAI|embedding/i);
  });

  it("filters recommendation inventory to current published content", () => {
    expect(data).toContain('.eq("review_status", "published")');
    expect(data).toContain('.is("deleted_at", null)');
  });

  it("routes targeted recommendations through whole-pack Phase 5 selection", () => {
    expect(model).toContain("/practice/general-academic?skill=");
    expect(model).toContain("/practice/general-academic?domain=");
    expect(practiceData).toContain("selectGeneralAcademicPack");
  });

  it("retries only the owned completed pack when it remains published", () => {
    expect(practiceData).toContain("sourceAttempt.status !== \"submitted\"");
    expect(practiceData).toContain("candidate.id === sourceAttempt.sourcePackId");
    expect(practiceData).toContain("This source pack is no longer available for new practice.");
  });

  it("integrates learning links without displacing Core dashboard priority", () => {
    const dashboard = source("src/app/dashboard/page.tsx");
    expect(dashboard.indexOf("data.primaryAction")).toBeLessThan(dashboard.indexOf("gamLearning?.recommendations"));
    expect(source("src/lib/dashboard/model.ts")).not.toContain("general_academic");
  });

  it("adds mistake and bookmark learning actions after delayed-feedback submission", () => {
    expect(results).toContain("Review Mistakes");
    expect(results).toContain("Review Answers &amp; Bookmark");
    expect(results).toContain("Added to Mistakes");
  });

  it("preserves the Phase 5 pre-submit answer-safe DTO", () => {
    const practice = source("src/lib/general-academic/practice.ts");
    const dto = practice.slice(practice.indexOf("studentGeneralAcademicQuestionSchema"), practice.indexOf("privateGeneralAcademicSnapshotSchema"));
    expect(dto).not.toMatch(/correctOption|explanation|validation|review|sourceMeta/);
  });

  it("uses the mobile source/review pattern and safe responsive layouts", () => {
    expect(review).toContain("lg:grid-cols-2");
    expect(review).toContain("lg:hidden");
    expect(review).toContain('role="tablist"');
    expect(library).toContain("sm:grid-cols-3");
  });
});
