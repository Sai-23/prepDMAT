import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { adminTestBuilderSchema, type AdminTestBuilderInput } from "./test-schemas";
import {
  buildMockQuestionRows,
  buildMockSectionRows,
  mockSaveFailure,
} from "./mock-persistence";
import { validateOfficialFullMockSections } from "@/lib/tests/exam-spec";

function questionId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function section(
  sectionType: "figure_sequence" | "mathematical_equation" | "latin_square",
  count: number,
  offset: number,
  durationSeconds = 1_500,
) {
  return {
    title: sectionType,
    module: "core" as const,
    sectionType,
    durationSeconds,
    questionIds: Array.from({ length: count }, (_, index) => questionId(offset + index)),
  };
}

function input(sections: AdminTestBuilderInput["sections"], testType: AdminTestBuilderInput["testType"] = "mini_mock") {
  return adminTestBuilderSchema.parse({
    title: "Debug Mock",
    description: "",
    testType,
    module: "core",
    instructions: "",
    isPremium: false,
    randomizeQuestions: false,
    randomizeOptions: false,
    intent: "draft",
    sections,
  });
}

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Mock template persistence contract", () => {
  it("builds a minimal three-section template with canonical types and one-based ordering", () => {
    const mock = input([
      section("figure_sequence", 1, 1, 60),
      section("mathematical_equation", 1, 2, 60),
      section("latin_square", 1, 3, 60),
    ]);
    const rows = buildMockSectionRows(questionId(900), mock);
    const mappings = buildMockQuestionRows(
      rows.map((row, index) => ({ id: questionId(910 + index), sort_order: row.sort_order })),
      mock,
    );

    expect(rows.map((row) => row.section_type)).toEqual([
      "figure_sequence",
      "mathematical_equation",
      "latin_square",
    ]);
    expect(rows.map((row) => row.sort_order)).toEqual([1, 2, 3]);
    expect(rows.map((row) => row.duration_seconds)).toEqual([60, 60, 60]);
    expect(mappings.map((row) => row.sort_order)).toEqual([1, 1, 1]);
    expect(new Set(mappings.map((row) => `${row.test_section_id}:${row.question_id}`)).size).toBe(3);
  });

  it("accepts the official 20/20/20, 25-minute Core structure", () => {
    const mock = input([
      section("figure_sequence", 20, 1),
      section("mathematical_equation", 20, 21),
      section("latin_square", 20, 41),
    ], "full_mock");
    const rows = buildMockSectionRows(questionId(900), mock);

    expect(validateOfficialFullMockSections(rows.map((row, index) => ({
      id: `section-${index}`,
      title: row.title,
      sectionType: row.section_type,
      durationSeconds: row.duration_seconds,
      sortOrder: row.sort_order,
      questionCount: mock.sections[index].questionIds.length,
    })))).toBeNull();
    expect(rows.reduce((total, row) => total + row.duration_seconds, 0)).toBe(4_500);
    expect(mock.sections.flatMap((item) => item.questionIds)).toHaveLength(60);
  });

  it("keeps custom and one-module Mock counts independent from the official protocol", () => {
    expect(input([
      section("figure_sequence", 5, 1, 600),
      section("mathematical_equation", 7, 6, 840),
      section("latin_square", 4, 13, 480),
    ]).sections.map((item) => item.questionIds.length)).toEqual([5, 7, 4]);
    expect(input([section("mathematical_equation", 10, 1, 1_200)]).sections).toHaveLength(1);
  });

  it("rejects a duplicate question before persistence", () => {
    const first = section("figure_sequence", 1, 1, 60);
    const second = section("mathematical_equation", 1, 2, 60);
    second.questionIds[0] = first.questionIds[0];
    expect(adminTestBuilderSchema.safeParse({
      title: "Duplicate Mock",
      testType: "mini_mock",
      module: "core",
      isPremium: false,
      randomizeQuestions: false,
      randomizeOptions: false,
      intent: "draft",
      sections: [first, second],
    }).success).toBe(false);
  });

  it("returns safe structured database diagnostics without raw details", () => {
    const failure = mockSaveFailure("The Mock sections could not be saved.", {
      stage: "section_creation",
      mockId: questionId(900),
      sectionType: "multiple",
      questionCount: 3,
      error: {
        code: "23505",
        message: "duplicate key violates unique constraint test_questions_test_section_id_question_id_key",
        details: "sensitive row values",
      },
    });
    expect(failure.diagnostic).toMatchObject({
      failureStage: "section_creation",
      databaseErrorCode: "23505",
      constraintName: "test_questions_test_section_id_question_id_key",
      questionCount: 3,
    });
    expect(JSON.stringify(failure.diagnostic)).not.toContain("sensitive row values");
  });

  it("validates eligibility before writes and compensates create/association failures", () => {
    const data = source("src/lib/admin/test-data.ts");
    const validationPosition = data.indexOf("await validateQuestionAssignments(input)");
    const parentPosition = data.indexOf('.from("tests")', validationPosition);
    expect(validationPosition).toBeGreaterThan(0);
    expect(parentPosition).toBeGreaterThan(validationPosition);
    expect(data).toContain('.eq("verification_status", "approved")');
    expect(data).toContain('.eq("publication_status", "published")');
    expect(data).toContain('.is("deleted_at", null)');
    expect(data).toContain("question.question_type !== section.sectionType");
    expect(data).toContain('from("test_sections")\n      .delete()');
    expect(data).toContain('from("tests").delete().eq("id", createdTestId)');
  });

  it("repairs the live template columns and preserves immutable edit versions", () => {
    const migration = source("supabase/migrations/202608260021_mock_builder_template_contract.sql");
    const data = source("src/lib/admin/test-data.ts");
    expect(migration).toContain("add column if not exists template_version");
    expect(migration).toContain("add column if not exists is_current");
    expect(migration).toContain("where is_current");
    expect(data).toContain("nextTemplateVersion");
    expect(data).toContain("isCurrent: false");
    expect(data).toContain("Unable to activate the revised Mock structure.");
  });
});
