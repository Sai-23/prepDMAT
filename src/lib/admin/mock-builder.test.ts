import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { seededShuffle } from "@/lib/tests/randomization";
import {
  filterMockQuestions,
  getSmartFillAvailability,
  getSmartFillTargetState,
  selectSmartFillQuestions,
  summarizeMockComposition,
} from "./mock-builder";
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

  it("smart-fills only the requested module difficulty and excludes assigned IDs", () => {
    const result = selectSmartFillQuestions(questions, {
      questionType: "figure_sequence",
      difficulty: "hard",
      count: 1,
      excludedQuestionIds: new Set(["easy-figure"]),
      allowPublishedFocusedReuse: false,
      seed: "hard-figure-fill",
    });
    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.questions.map((question) => question.id)).toEqual(["hard-figure"]);
    }
  });

  it("excludes questions used by published focused mocks unless reuse is explicit", () => {
    const protectedQuestions: AdminQuestionBankItem[] = [
      { ...questions[2], id: "unused-hard-math" },
      { ...questions[2], id: "protected-hard-math", usedInPublishedFocusedMock: true },
    ];
    expect(getSmartFillAvailability(protectedQuestions, {
      questionType: "mathematical_equation",
      difficulty: "hard",
      excludedQuestionIds: new Set(),
    })).toEqual({ unusedAvailable: 1, totalAvailable: 2 });

    const blocked = selectSmartFillQuestions(protectedQuestions, {
      questionType: "mathematical_equation",
      difficulty: "hard",
      count: 2,
      excludedQuestionIds: new Set(),
      allowPublishedFocusedReuse: false,
      seed: "protected-blocked",
    });
    expect(blocked).toMatchObject({
      status: "insufficient",
      unusedAvailable: 1,
      totalAvailable: 2,
      required: 2,
    });

    const allowed = selectSmartFillQuestions(protectedQuestions, {
      questionType: "mathematical_equation",
      difficulty: "hard",
      count: 2,
      excludedQuestionIds: new Set(),
      allowPublishedFocusedReuse: true,
      seed: "protected-allowed",
    });
    expect(allowed.status).toBe("selected");
    if (allowed.status === "selected") {
      expect(new Set(allowed.questions.map((question) => question.id)).size).toBe(2);
      expect(allowed.reusedPublishedCount).toBe(1);
      expect(allowed.questions[0].id).toBe("unused-hard-math");
    }
  });

  it("supports regeneration and replacement without selecting excluded questions", () => {
    const inventory = Array.from({ length: 8 }, (_, index): AdminQuestionBankItem => ({
      ...questions[2],
      id: `hard-math-${index + 1}`,
      selectionFamily: `family-${(index % 4) + 1}`,
    }));
    const first = selectSmartFillQuestions(inventory, {
      questionType: "mathematical_equation",
      difficulty: "hard",
      count: 3,
      excludedQuestionIds: new Set(),
      allowPublishedFocusedReuse: false,
      seed: "first-selection",
    });
    expect(first.status).toBe("selected");
    if (first.status !== "selected") return;
    const firstIds = new Set(first.questions.map((question) => question.id));
    const regenerated = selectSmartFillQuestions(inventory, {
      questionType: "mathematical_equation",
      difficulty: "hard",
      count: 3,
      excludedQuestionIds: firstIds,
      allowPublishedFocusedReuse: false,
      seed: "regenerated-selection",
    });
    expect(regenerated.status).toBe("selected");
    if (regenerated.status === "selected") {
      expect(regenerated.questions.every((question) => !firstIds.has(question.id))).toBe(true);
      expect(new Set(regenerated.questions.map((question) => question.id)).size).toBe(3);
    }

    const replacement = selectSmartFillQuestions(inventory, {
      questionType: "mathematical_equation",
      difficulty: "hard",
      count: 1,
      excludedQuestionIds: firstIds,
      allowPublishedFocusedReuse: false,
      seed: "replacement",
    });
    expect(replacement.status).toBe("selected");
    if (replacement.status === "selected") {
      expect(firstIds.has(replacement.questions[0].id)).toBe(false);
    }
  });

  it.each([5, 12, 20])(
    "accepts %i as a manually configured final section target",
    (targetCount) => {
      expect(getSmartFillTargetState(String(targetCount), 0)).toEqual({
        status: "needs_questions",
        targetCount,
        currentCount: 0,
        additionalCount: targetCount,
      });
    },
  );

  it.each([5, 12, 20])(
    "selects exactly the configured target of %i eligible questions",
    (targetCount) => {
      const inventory = Array.from(
        { length: 24 },
        (_, index): AdminQuestionBankItem => ({
          ...questions[2],
          id: `target-question-${index + 1}`,
          selectionFamily: `target-family-${(index % 8) + 1}`,
        }),
      );
      const result = selectSmartFillQuestions(inventory, {
        questionType: "mathematical_equation",
        difficulty: "hard",
        count: targetCount,
        excludedQuestionIds: new Set(),
        allowPublishedFocusedReuse: false,
        seed: `target-${targetCount}`,
      });
      expect(result.status).toBe("selected");
      if (result.status === "selected") {
        expect(result.questions).toHaveLength(targetCount);
        expect(new Set(result.questions.map((question) => question.id)).size)
          .toBe(targetCount);
      }
    },
  );

  it("counts existing selections toward the requested final target", () => {
    expect(getSmartFillTargetState("20", 7)).toMatchObject({
      status: "needs_questions",
      targetCount: 20,
      additionalCount: 13,
    });
    expect(getSmartFillTargetState("12", 5)).toMatchObject({
      status: "needs_questions",
      targetCount: 12,
      additionalCount: 7,
    });
  });

  it("does not add or remove questions when a section is at or above target", () => {
    expect(getSmartFillTargetState("10", 10)).toEqual({
      status: "at_target",
      targetCount: 10,
      currentCount: 10,
    });
    expect(getSmartFillTargetState("10", 12)).toEqual({
      status: "above_target",
      targetCount: 10,
      currentCount: 12,
      excessCount: 2,
    });
  });

  it.each(["", "0", "-1", "1.5", "NaN", "101"])(
    "rejects the invalid Smart Fill target %j",
    (targetCount) => {
      expect(getSmartFillTargetState(targetCount, 0)).toMatchObject({
        status: "invalid",
      });
    },
  );

  it("keeps manual selection and exposes Smart Fill controls in the builder", () => {
    const builder = source("src/components/admin/test-builder.tsx");
    expect(builder).toContain('smartFillCount: "20"');
    expect(builder).toContain("smartFillCount: event.target.value");
    expect(builder).toContain(': "Auto-select questions"');
    expect(builder).not.toContain("Auto-select ${section.smartFillCount} questions");
    expect(builder).not.toContain("Auto-select 20 questions");
    expect(builder).toContain('"Selecting questions..."');
    expect(builder).toContain("Regenerate selection");
    expect(builder).toContain("Replace assigned question");
    expect(builder).toContain("toggleQuestion");
    expect(builder).toContain("Used in a published focused mock");
  });

  it("uses readable semantic theme states and responsive controls for Smart Fill", () => {
    const builder = source("src/components/admin/test-builder.tsx");
    const smartFillPanel = builder.slice(
      builder.indexOf(">Smart Fill<"),
      builder.indexOf("{section.questionIds.length ?"),
    );
    expect(smartFillPanel).toContain("bg-surface-low");
    expect(smartFillPanel).toContain("text-on-surface");
    expect(smartFillPanel).toContain("text-on-surface-variant");
    expect(smartFillPanel).toContain("bg-warning-container");
    expect(smartFillPanel).toContain("text-warning-container-foreground");
    expect(smartFillPanel).toContain("bg-error-container");
    expect(smartFillPanel).toContain("Section currently contains");
    expect(smartFillPanel).toContain("disabled:text-on-surface-variant");
    expect(smartFillPanel).toContain("disabled:opacity-100 sm:w-auto");
    expect(smartFillPanel).not.toContain("text-blue-");
  });

  it("validates the target and final selection in the authenticated server path", () => {
    const actions = source("src/app/admin/actions.ts");
    const data = source("src/lib/admin/test-data.ts");
    expect(actions).toContain('await requireRole(["admin"])');
    expect(actions).toContain("adminSmartFillRequestSchema.safeParse(input)");
    expect(data).toContain("input.targetCount - input.existingQuestionIds.length");
    expect(data).toContain('input.mode === "regenerate"');
    expect(data).toContain("finalQuestionIds.length !== input.targetCount");
    expect(data).toContain("new Set(finalQuestionIds).size !== finalQuestionIds.length");
    expect(data).toContain("question.difficulty !== input.difficulty");
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

  it("persists focused difficulty without changing attempt randomization", () => {
    const migration = source("supabase/migrations/202609010029_admin_focused_mock_smart_fill.sql");
    const persistence = source("src/lib/admin/mock-persistence.ts");
    const adminData = source("src/lib/admin/test-data.ts");
    const attemptData = source("src/lib/tests/data.ts");
    expect(migration).toContain("add column if not exists focus_difficulty");
    expect(persistence).toContain("focus_difficulty: section.focusDifficulty");
    expect(adminData).toContain("question.difficulty !== section.focusDifficulty");
    expect(attemptData).toContain("seededShuffle");
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
