import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

describe("General Academic Phase 5 student UX and security contract", () => {
  const landing = source("src/components/general-academic/practice-landing.tsx");
  const workspace = source("src/components/general-academic/practice-workspace.tsx");
  const sourceView = source("src/components/general-academic/student-source.tsx");
  const results = source("src/components/general-academic/practice-results.tsx");
  const data = source("src/lib/general-academic/practice-data.ts");
  const actions = source("src/app/practice/general-academic/actions.ts");

  it("provides compact mixed, domain, skill and resume entry points", () => {
    for (const label of ["Practice focus", "mixed", "domain", "skill", "Resume Practice"]) expect(landing).toContain(label);
  });

  it("shows only availability supplied from published server data", () => {
    expect(landing).toContain("landing.domains.map");
    expect(landing).toContain("landing.skills.map");
    expect(data).toContain('.eq("review_status", "published")');
    expect(data).toContain('.is("deleted_at", null)');
  });

  it("keeps Core Practice intact and links GAM naturally", () => {
    expect(source("src/app/practice/page.tsx")).toContain("<PracticeExperience");
    expect(source("src/app/practice/page.tsx")).toContain('/practice/general-academic');
  });

  it("uses a source/question split on desktop and accessible switch on mobile", () => {
    expect(workspace).toContain("lg:grid-cols-2");
    expect(workspace).toContain('role="tablist"');
    expect(workspace).toContain('mobilePanel === "source"');
    expect(workspace).toContain('mobilePanel === "question"');
  });

  it("keeps the source available for every question without duplicating FormulaCard", () => {
    expect(workspace).toContain("<GeneralAcademicSource");
    expect(sourceView).toContain("<FormulaCard");
  });

  it("renders accessible tables with safe horizontal overflow", () => {
    expect(sourceView).toContain("overflow-x-auto");
    expect(sourceView).toContain("<table");
    expect(sourceView).toContain('scope="col"');
    expect(sourceView).toContain("<caption");
  });

  it("renders structured line, bar and scatter data without a chart dependency", () => {
    expect(sourceView).toContain('graph.type === "bar"');
    expect(sourceView).toContain('graph.type === "line"');
    expect(sourceView).toContain("<circle");
    expect(sourceView).toContain('role="img"');
  });

  it("uses safe accessible figure descriptions rather than executable markup", () => {
    expect(sourceView).toContain("figure.description");
    expect(sourceView).not.toMatch(/dangerouslySetInnerHTML|<iframe|<object/);
  });

  it("provides previous, next and direct question navigation", () => {
    for (const label of ["Previous", "Next", "Question navigation", 'aria-current={index === currentIndex ? "step"']) expect(workspace).toContain(label);
  });

  it("communicates answered, unanswered, flagged and current states with text", () => {
    for (const state of ["flagged", "answered", "unanswered", "current"]) expect(workspace).toContain(state);
  });

  it("uses labelled radio controls and a labelled flag state", () => {
    expect(workspace).toContain('type="radio"');
    expect(workspace).toContain('aria-label={`${option.id}: ${option.text}`}');
    expect(workspace).toContain("aria-pressed={answers[question.id].isFlagged}");
  });

  it("uses delayed feedback with no Check Answer action", () => {
    expect(workspace).toContain("checked only after you submit");
    expect(workspace).not.toContain("Check Answer");
    expect(workspace).not.toContain("correctOption");
  });

  it("confirms answered, unanswered and flagged counts before submission", () => {
    for (const label of ["Answered", "Unanswered", "Flagged", "You won&apos;t be able to change"]) expect(workspace).toContain(label);
  });

  it("retains local answers and offers retry after an autosave failure", () => {
    expect(workspace).toContain("still visible on this device");
    expect(workspace).toContain("Retry save");
    expect(workspace).toContain("window.setTimeout");
    expect(workspace).toContain("saveQueueRef.current.then");
    expect(workspace).toContain("if (!saved && !allowExpiredSubmit && !timerHasExpired)");
    expect(workspace).toContain("const saveAndLeave");
  });

  it("restores and displays server-controlled timing state", () => {
    expect(workspace).toContain("attempt.expiresAt");
    expect(workspace).toContain('role="timer"');
    expect(landing).toContain("two PrepDMAT practice minutes per linked question");
  });

  it("shows correctness with icons and text rather than color alone", () => {
    for (const label of ["Correct", "Incorrect", "Unanswered", "OutcomeIcon"]) expect(results).toContain(label);
  });

  it("keeps source and canonical explanations together in detailed review", () => {
    expect(results).toContain("<GeneralAcademicSource");
    expect(results).toContain("item.explanation.summary");
    expect(results).toContain("item.explanation.steps");
    expect(results).toContain("item.explanation.takeaway");
  });

  it("does not claim an official score or official difficulty", () => {
    expect(results).toContain("not an official dMAT score");
    expect(landing).toContain("internal practice classification");
  });

  it("authorizes every route and mutation through the existing user guard", () => {
    for (const route of ["page.tsx", "[attemptId]/page.tsx", "[attemptId]/results/page.tsx", "[attemptId]/review/page.tsx"]) expect(source(`src/app/practice/general-academic/${route}`)).toContain("requireUser()");
    expect(actions.match(/requireUser\(\)/g)).toHaveLength(4);
  });

  it("keeps OmniRoute and administrator metadata out of student runtime components", () => {
    const studentRuntime = [landing, workspace, sourceView, results, actions].join("\n");
    expect(studentRuntime).not.toMatch(/OMNIROUTE|sourceMeta|reviewedBy|approvedBy|quality findings/i);
  });

  it("integrates GAM activity without changing Core dashboard priority logic", () => {
    const dashboard = source("src/app/dashboard/page.tsx");
    expect(dashboard).toContain("getGeneralAcademicDashboardActivity");
    expect(dashboard).toContain("data.primaryAction");
    expect(source("src/lib/dashboard/model.ts")).not.toContain("gam_practice");
  });

  it("does not force GAM into Core bookmark or mistake tables", () => {
    expect(data).not.toMatch(/\.from\("(?:bookmarks|mistake_notebook_entries|practice_sessions|practice_session_items)"\)/);
  });
});
