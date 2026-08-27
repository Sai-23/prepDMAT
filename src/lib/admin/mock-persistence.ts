import type { AdminTestBuilderInput } from "@/lib/admin/test-schemas";

export type MockSaveFailureStage =
  | "question_validation"
  | "parent_creation"
  | "section_creation"
  | "question_association"
  | "template_loading"
  | "template_retirement"
  | "template_activation"
  | "parent_update"
  | "publication"
  | "audit";

export type MockSaveDiagnostic = {
  mockId: string | null;
  sectionType: AdminTestBuilderInput["sections"][number]["sectionType"] | "multiple" | null;
  sectionIndex: number | null;
  questionCount: number;
  status: "failed";
  databaseErrorCode: string | null;
  constraintName: string | null;
  failureStage: MockSaveFailureStage;
};

type SafeDatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

function constraintName(error?: SafeDatabaseError | null) {
  const evidence = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return evidence.match(/[a-z][a-z0-9_]+_(?:check|key|fkey)/i)?.[0] ?? null;
}

export class MockSaveError extends Error {
  constructor(
    message: string,
    readonly diagnostic: MockSaveDiagnostic,
  ) {
    super(message);
    this.name = "MockSaveError";
  }
}

export function mockSaveFailure(
  message: string,
  options: {
    stage: MockSaveFailureStage;
    mockId?: string | null;
    sectionType?: MockSaveDiagnostic["sectionType"];
    sectionIndex?: number | null;
    questionCount?: number;
    error?: SafeDatabaseError | null;
  },
) {
  return new MockSaveError(message, {
    mockId: options.mockId ?? null,
    sectionType: options.sectionType ?? null,
    sectionIndex: options.sectionIndex ?? null,
    questionCount: options.questionCount ?? 0,
    status: "failed",
    databaseErrorCode: options.error?.code || null,
    constraintName: constraintName(options.error),
    failureStage: options.stage,
  });
}

export function buildMockSectionRows(
  testId: string,
  input: AdminTestBuilderInput,
  options: { templateVersion?: number; isCurrent?: boolean } = {},
) {
  return input.sections.map((section, index) => ({
    test_id: testId,
    title: section.title,
    section_type: section.sectionType,
    module: section.module ?? input.module,
    duration_seconds: section.durationSeconds,
    sort_order: index + 1,
    template_version: options.templateVersion ?? 1,
    is_current: options.isCurrent ?? true,
  }));
}

export function buildMockQuestionRows(
  sections: Array<{ id: string; sort_order: number }>,
  input: AdminTestBuilderInput,
) {
  const sectionByOrder = new Map(
    sections.map((section) => [section.sort_order, section.id]),
  );
  return input.sections.flatMap((section, sectionIndex) => {
    const sectionId = sectionByOrder.get(sectionIndex + 1);
    if (!sectionId) return [];
    return section.questionIds.map((questionId, questionIndex) => ({
      test_section_id: sectionId,
      question_id: questionId,
      sort_order: questionIndex + 1,
    }));
  });
}
