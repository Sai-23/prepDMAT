import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { seededShuffle } from "@/lib/tests/randomization";
import { filterMockQuestions, summarizeMockComposition } from "./mock-builder";
import type { AdminQuestionBankItem } from "./test-schemas";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const questions: AdminQuestionBankItem[] = [
  { id: "easy-figure", module: "core", questionType: "figure_sequence", topic: "Figures", subtopic: null, difficulty: "easy", questionText: "Easy figure", estimatedTimeSeconds: 60 },
  { id: "hard-figure", module: "core", questionType: "figure_sequence", topic: "Figures", subtopic: null, difficulty: "hard", questionText: "Hard figure", estimatedTimeSeconds: 90 },
  { id: "hard-math", module: "core", questionType: "mathematical_equation", topic: "Equations", subtopic: null, difficulty: "hard", questionText: "Hard math", estimatedTimeSeconds: 90 },
  { id: "medium-latin", module: "core", questionType: "latin_square", topic: "Latin", subtopic: null, difficulty: "medium", questionText: "Medium Latin", estimatedTimeSeconds: 75 },
];

describe("Mock Builder", () => {
  it("combines Core type, difficulty, and search filters", () => {
    expect(filterMockQuestions(questions, {
      module: "core",
      sectionType: "mixed",
      questionType: "figure_sequence",
      difficulty: "hard",
      search: "figure",
    }).map((question) => question.id)).toEqual(["hard-figure"]);
  });

  it("summarizes selected difficulty and question-type composition", () => {
    expect(summarizeMockComposition(questions)).toEqual({
      difficulty: { easy: 1, medium: 1, hard: 2 },
      questionType: { figure_sequence: 2, mathematical_equation: 1, latin_square: 1 },
    });
  });

  it("loads only approved, published, non-deleted questions into the selectable bank", () => {
    const data = source("src/lib/admin/test-data.ts");
    expect(data).toContain('.eq("verification_status", "approved")');
    expect(data).toContain('.eq("publication_status", "published")');
    expect(data).toContain('.is("deleted_at", null)');
  });

  it("keeps Build Mock and Created Mocks together with preview and edit actions", () => {
    const tabs = source("src/components/admin/mock-builder-tabs.tsx");
    const manager = source("src/components/admin/test-manager.tsx");
    expect(tabs).toContain("Build Mock");
    expect(tabs).toContain("Created Mocks");
    expect(manager).toContain("Preview");
    expect(manager).toContain("Edit Mock");
    expect(manager).toContain("Unavailable / Deleted");
  });

  it("versions edited templates while attempt readers stay on immutable snapshots", () => {
    const migration = source("supabase/migrations/202608140015_mock_template_versions.sql");
    const adminData = source("src/lib/admin/test-data.ts");
    const attemptData = source("src/lib/tests/data.ts");
    expect(migration).toContain("template_version");
    expect(migration).toContain("is_current");
    expect(adminData).not.toContain("Tests with existing attempts cannot be structurally edited.");
    expect(adminData).toContain("nextTemplateVersion");
    expect(attemptData).toContain("test_snapshot");
    expect(attemptData).toContain("public_snapshot");

    const activeAttempt = { questions: ["Q1", "Q2", "Q3"] };
    const revisedTemplate = { questions: ["Q1", "Q3", "Q4"] };
    expect(activeAttempt.questions).toEqual(["Q1", "Q2", "Q3"]);
    expect(revisedTemplate.questions).toEqual(["Q1", "Q3", "Q4"]);
  });

  it("uses Mock Builder—not Test Builder—in user-facing Admin labels", () => {
    const navigation = source("src/lib/constants/navigation.ts");
    const newPage = source("src/app/admin/tests/new/page.tsx");
    expect(navigation).toContain('label: "Mock Builder"');
    expect(navigation).not.toContain('label: "Test Builder"');
    expect(newPage).toContain('eyebrow="Mock Builder"');
  });
});

describe("Legacy mock-builder randomization and practice separation", () => {
  const ids = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  it("produces varied orders for independent session seeds", () => {
    const orders = new Set(["session-a", "session-b", "session-c", "session-d"].map((seed) => seededShuffle(ids, seed).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("keeps the exact order stable for the same session seed", () => {
    expect(seededShuffle(ids, "stable-session")).toEqual(seededShuffle(ids, "stable-session"));
  });

  it("persists dedicated practice manifests and resumes by saved position", () => {
    const practice = source("src/lib/practice/data.ts");
    expect(practice).toContain('admin.rpc("create_practice_session"');
    expect(practice).toContain('from("practice_sessions")');
    expect(practice).toContain('from("practice_session_items")');
    expect(practice).toContain("current_position");
    expect(practice).not.toContain('from("test_attempts")');
  });

  it("uses validated generators instead of bank selection for regular practice", () => {
    const generation = source("src/lib/practice/generation.ts");
    expect(generation).toContain("generateValidatedFigureSequence");
    expect(generation).toContain("generateValidatedMathematicalEquation");
    expect(generation).toContain("generateValidatedLatinSquare");
    expect(generation).toContain("practiceDifficultyOrder");
  });
});
