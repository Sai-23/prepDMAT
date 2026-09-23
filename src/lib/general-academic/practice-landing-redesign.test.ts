import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("General Academic practice landing redesign contract", () => {
  const hub = source("src/app/practice/page.tsx");
  const page = source("src/app/practice/general-academic/page.tsx");
  const landing = source("src/components/general-academic/practice-landing.tsx");
  const data = source("src/lib/general-academic/practice-data.ts");
  const practice = source("src/lib/general-academic/practice.ts");

  it("presents GAM as a first-class option before the unchanged Core experience", () => {
    expect(hub).toContain("What do you want to practice?");
    expect(hub).toContain("Major practice area");
    expect(hub).toContain("Core modules");
    expect(hub.indexOf("General Academic")).toBeLessThan(hub.indexOf("<PracticeExperience"));
    expect(hub).toContain("<PracticeExperience");
  });

  it("uses start and resume actions on the Practice hub", () => {
    expect(hub).toContain('generalAcademicActive ? "Resume Practice" : "Start Practice"');
    expect(hub).toContain("generalAcademicActive.id");
    expect(hub).not.toContain("Explore General Academic");
  });

  it("communicates the four GAM formats without image assets", () => {
    for (const format of ["Text", "Formulas", "Tables", "Graphs"]) expect(hub).toContain(format);
    expect(hub).toContain('aria-label="General Academic formats"');
  });

  it("uses a dominant no-choice quick start with existing defaults", () => {
    expect(landing).toContain("Ready to practice?");
    expect(landing).toContain("QUICK_START_CONFIG");
    expect(landing).toContain('mode: "mixed"');
    expect(landing).toContain('difficulty: "mixed"');
    expect(landing).toContain('timingMode: "untimed"');
    expect(landing).toContain("startGeneralAcademicPracticeAction(config)");
  });

  it("keeps duplicate prevention server-authoritative", () => {
    expect(data).toContain("const active = await repository.findActiveAttempt(userId)");
    expect(data).toContain("if (active) return toStudentAttempt(active, now)");
  });

  it("prioritizes a minimal safe resume summary", () => {
    for (const value of ["Continue where you left off", "answeredCount", "Resume Practice"]) expect(landing).toContain(value);
    expect(data).toContain("active.answers.filter");
    expect(data).toContain("active.publicSnapshot.domain");
    expect(landing).not.toMatch(/correctOption|privateSnapshot|explanation/);
  });

  it("keeps customization collapsed for ordinary entry and opens targeted deep links", () => {
    expect(landing).toContain("useState(Boolean(initialDomain || initialSkill))");
    expect(landing).toContain("!landing.activeAttempt && customizeOpen");
    expect(landing).toContain('aria-expanded={customizeOpen}');
    expect(landing).toContain('aria-controls="practice-customization"');
  });

  it("uses compact accessible focus controls and conditional selectors", () => {
    expect(landing).toContain('name="practice-focus"');
    expect(landing).toContain('type="radio"');
    expect(landing).toContain('focus === "domain" ?');
    expect(landing).toContain('focus === "skill" ?');
    expect(landing).toContain('id="practice-domain"');
    expect(landing).toContain('id="practice-skill"');
    expect(landing).not.toMatch(/Practice by Domain|Practice by Skill/);
  });

  it("shows only eligible published domain and skill inventory", () => {
    expect(landing).toContain("landing.domains.map");
    expect(landing).toContain("landing.skills.map");
    expect(data).toContain('.eq("review_status", "published")');
    expect(data).toContain('.is("deleted_at", null)');
  });

  it("preserves difficulty and timing semantics without official claims", () => {
    for (const value of ["easy", "medium", "hard", "mixed"]) expect(landing).toContain(`value=\"${value}\"`);
    expect(landing).toContain("internal practice classification");
    expect(landing).toContain("two PrepDMAT practice minutes per linked question");
    expect(landing).toContain("not official dMAT timing");
    expect(practice).toContain("GENERAL_ACADEMIC_PRACTICE_SECONDS_PER_QUESTION = 120");
  });

  it("moves all learning routes below the primary action", () => {
    const learningIndex = landing.indexOf("Your learning");
    expect(learningIndex).toBeGreaterThan(landing.indexOf("practice-start"));
    for (const route of ["/practice/general-academic/mistakes", "/practice/general-academic/bookmarks", "/progress/general-academic"]) {
      expect(landing).toContain(route);
    }
  });

  it("uses student-facing practice-set terminology on both landing pages", () => {
    expect(page).toContain("Published practice content");
    expect(landing).toContain("practice set");
    expect(`${hub}\n${page}\n${landing}`).not.toMatch(/source pack|matching pack|Explore General Academic/i);
  });

  it("stacks primary controls and learning cards at mobile widths", () => {
    expect(landing).toContain("w-full");
    expect(landing).toContain("sm:w-auto");
    expect(landing).toContain("sm:grid-cols-3");
    expect(landing).toContain("grid grid-cols-2");
    expect(landing).not.toMatch(/min-w-\[(?:3|4)\d{2}px\]/);
  });

  it("provides semantic labels, focus states and comfortable targets", () => {
    for (const value of ["fieldset", "legend", "focus-within:ring-2", "focus-visible:ring-2", "min-h-11"]) expect(landing).toContain(value);
    expect(landing).toContain('aria-label="General Academic learning tools"');
  });
});
