import "server-only";

import type {
  AdminQuestionBankItem,
  AdminTestBuilderInput,
  AdminTestListItem,
  EditableAdminTest,
} from "@/lib/admin/test-schemas";
import {
  buildMockQuestionRows,
  buildMockSectionRows,
  mockSaveFailure,
} from "@/lib/admin/mock-persistence";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateOfficialFullMockSections } from "@/lib/tests/exam-spec";

const PRACTICE_TEST_ID = "00000000-0000-4000-8000-000000000001";

function totalDuration(input: AdminTestBuilderInput) {
  return input.sections.reduce(
    (total, section) => total + section.durationSeconds,
    0,
  );
}

function validatePublishedFullMock(input: AdminTestBuilderInput): void {
  if (input.intent !== "publish" || input.testType !== "full_mock") return;
  const structureError = validateOfficialFullMockSections(input.sections.map((section, index) => ({
    id: `pending-${index + 1}`,
    title: section.title,
    sectionType: section.sectionType,
    durationSeconds: section.durationSeconds,
    sortOrder: index + 1,
    questionCount: section.questionIds.length,
  })));
  if (structureError) throw new Error(structureError);
}

async function writeTestAudit(
  actorId: string,
  action: string,
  testId: string,
  metadata: Record<string, unknown> = {},
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: "test",
    entity_id: testId,
    metadata,
  });
  if (error) {
    throw mockSaveFailure("The Mock was saved, but its audit record failed.", {
      stage: "audit",
      mockId: testId,
      error,
    });
  }
}

async function validateQuestionAssignments(input: AdminTestBuilderInput) {
  const questionIds = input.sections.flatMap((section) => section.questionIds);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, module, question_type")
    .in("id", questionIds)
    .eq("module", "core")
    .eq("verification_status", "approved")
    .eq("publication_status", "published")
    .is("deleted_at", null);

  if (error) {
    throw mockSaveFailure("The selected questions could not be verified. Try again.", {
      stage: "question_validation",
      questionCount: questionIds.length,
      error,
    });
  }
  if (!data || data.length !== questionIds.length) {
    const availableIds = new Set((data ?? []).map((question) => question.id));
    const unavailable = input.sections
      .map((section, index) => ({
        section,
        index,
        count: section.questionIds.filter((questionId) => !availableIds.has(questionId)).length,
      }))
      .find((item) => item.count > 0);
    throw mockSaveFailure(
      unavailable
        ? `${unavailable.count} question${unavailable.count === 1 ? " is" : "s are"} no longer available in “${unavailable.section.title}”.`
        : "Every assigned question must still be approved and published.",
      {
        stage: "question_validation",
        sectionType: unavailable?.section.sectionType ?? null,
        sectionIndex: unavailable ? unavailable.index + 1 : null,
        questionCount: unavailable?.count ?? questionIds.length,
      },
    );
  }

  const questionById = new Map(
    data.map((question) => [question.id, question]),
  );
  input.sections.forEach((section, sectionIndex) => {
    section.questionIds.forEach((questionId) => {
      const question = questionById.get(questionId);
      const expectedModule = section.module ?? input.module;
      if (!question || (expectedModule && question.module !== expectedModule)) {
        throw mockSaveFailure(`The questions assigned to “${section.title}” do not match its module.`, {
          stage: "question_validation",
          sectionType: section.sectionType,
          sectionIndex: sectionIndex + 1,
          questionCount: section.questionIds.length,
        });
      }
      if (section.sectionType !== "mixed" && question.question_type !== section.sectionType) {
        throw mockSaveFailure(`Every question in “${section.title}” must match its section type.`, {
          stage: "question_validation",
          sectionType: section.sectionType,
          sectionIndex: sectionIndex + 1,
          questionCount: section.questionIds.length,
        });
      }
    });
  });
}

async function insertTestSections(
  testId: string,
  input: AdminTestBuilderInput,
  options: { templateVersion?: number; isCurrent?: boolean } = {},
) {
  const admin = createSupabaseAdminClient();
  const { data: sections, error: sectionError } = await admin
    .from("test_sections")
    .insert(buildMockSectionRows(testId, input, options))
    .select("id, sort_order");

  if (sectionError || !sections || sections.length !== input.sections.length) {
    throw mockSaveFailure(
      "The Mock sections could not be saved. Review the section configuration and try again.",
      {
        stage: "section_creation",
        mockId: testId,
        sectionType: input.sections.length === 1 ? input.sections[0].sectionType : "multiple",
        sectionIndex: input.sections.length === 1 ? 1 : null,
        questionCount: input.sections.reduce((total, section) => total + section.questionIds.length, 0),
        error: sectionError,
      },
    );
  }

  const mappings = buildMockQuestionRows(sections, input);
  const { error: mappingError } = await admin
    .from("test_questions")
    .insert(mappings);

  if (mappingError || mappings.length === 0) {
    await admin
      .from("test_sections")
      .delete()
      .in(
        "id",
        sections.map((section) => section.id),
      );
    throw mockSaveFailure(
      "The selected questions could not be attached to their Mock sections.",
      {
        stage: "question_association",
        mockId: testId,
        sectionType: input.sections.length === 1 ? input.sections[0].sectionType : "multiple",
        sectionIndex: input.sections.length === 1 ? 1 : null,
        questionCount: mappings.length,
        error: mappingError,
      },
    );
  }

  return sections;
}

export async function getAdminQuestionBank(): Promise<
  AdminQuestionBankItem[]
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select(
      "id, module, question_type, topic, subtopic, difficulty, question_text, estimated_time_seconds",
    )
    .eq("module", "core")
    .eq("verification_status", "approved")
    .eq("publication_status", "published")
    .is("deleted_at", null)
    .order("topic", { ascending: true })
    .limit(1000);

  if (error) throw new Error("Unable to load the approved question bank.");
  return (data ?? []).map((question) => ({
    id: question.id,
    module: question.module,
    questionType: question.question_type,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionText: question.question_text,
    estimatedTimeSeconds: question.estimated_time_seconds,
  })) as AdminQuestionBankItem[];
}

export async function getAdminTests(): Promise<AdminTestListItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: tests, error } = await admin
    .from("tests")
    .select(
      "id, title, test_type, module, duration_seconds, is_premium, is_published, created_at, updated_at",
    )
    .neq("id", PRACTICE_TEST_ID)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Unable to load created mocks.");
  if (!tests?.length) return [];

  const testIds = tests.map((test) => test.id);
  const [{ data: sections }, { data: attempts }] = await Promise.all([
    admin
      .from("test_sections")
      .select("id, test_id, title, section_type, duration_seconds, sort_order")
      .in("test_id", testIds)
      .eq("is_current", true),
    admin.from("test_attempts").select("id, test_id").in("test_id", testIds),
  ]);
  const sectionRows = sections ?? [];
  const sectionIds = sectionRows.map((section) => section.id);
  const { data: mappings } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id, sort_order")
        .in("test_section_id", sectionIds)
    : { data: [] };

  const questionIds = [...new Set((mappings ?? []).map((mapping) => mapping.question_id))];
  const { data: questions } = questionIds.length
    ? await admin
        .from("questions")
        .select("id, question_type, difficulty, question_text, deleted_at")
        .in("id", questionIds)
    : { data: [] };
  const questionById = new Map((questions ?? []).map((question) => [question.id, question]));

  return tests.filter((test) => sectionRows
    .filter((section) => section.test_id === test.id)
    .every((section) => ["figure_sequence", "mathematical_equation", "latin_square", "mixed"].includes(section.section_type)))
    .map((test) => {
    const testSections = sectionRows.filter(
      (section) => section.test_id === test.id,
    );
    const testSectionIds = new Set(
      testSections.map((section) => section.id),
    );
    return {
      id: test.id,
      title: test.title,
      testType: test.test_type,
      module: test.module,
      durationSeconds: test.duration_seconds,
      isPremium: test.is_premium,
      isPublished: test.is_published,
      sectionCount: testSections.length,
      questionCount: (mappings ?? []).filter((mapping) =>
        testSectionIds.has(mapping.test_section_id),
      ).length,
      attemptCount: (attempts ?? []).filter(
        (attempt) => attempt.test_id === test.id,
      ).length,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
      sections: testSections
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((section) => ({
          title: section.title,
          sectionType: section.section_type,
          durationSeconds: section.duration_seconds,
          questions: (mappings ?? [])
            .filter((mapping) => mapping.test_section_id === section.id)
            .sort((first, second) => first.sort_order - second.sort_order)
            .map((mapping) => {
              const question = questionById.get(mapping.question_id);
              return {
                id: mapping.question_id,
                questionType: question?.question_type ?? "unknown",
                difficulty: question?.difficulty ?? "unknown",
                questionText: question?.question_text ?? "Unavailable question",
                unavailable: !question || Boolean(question.deleted_at),
              };
            }),
        })),
    };
  }) as AdminTestListItem[];
}

export async function getEditableAdminTest(
  testId: string,
): Promise<EditableAdminTest | null> {
  if (testId === PRACTICE_TEST_ID) return null;
  const admin = createSupabaseAdminClient();
  const { data: test, error } = await admin
    .from("tests")
    .select(
      "id, title, description, test_type, module, instructions, is_premium, is_published, randomize_questions, randomize_options",
    )
    .eq("id", testId)
    .maybeSingle();
  if (error) throw new Error("Unable to load this test.");
  if (!test) return null;
  const { data: sections, error: sectionError } = await admin
        .from("test_sections")
        .select("id, title, section_type, module, duration_seconds, sort_order")
        .eq("test_id", testId)
        .eq("is_current", true)
        .order("sort_order", { ascending: true });
  if (sectionError) throw new Error("Unable to load this test’s sections.");
  if ((sections ?? []).some((section) => !["figure_sequence", "mathematical_equation", "latin_square", "mixed"].includes(section.section_type))) return null;

  const sectionIds = (sections ?? []).map((section) => section.id);
  const { data: mappings, error: mappingError } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id, sort_order")
        .in("test_section_id", sectionIds)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };
  if (mappingError) throw new Error("Unable to load assigned questions.");

  return {
    id: test.id,
    title: test.title,
    description: test.description,
    testType: test.test_type,
    module: test.module,
    instructions: test.instructions,
    isPremium: test.is_premium,
    isPublished: test.is_published,
    randomizeQuestions: test.randomize_questions,
    randomizeOptions: test.randomize_options,
    sections: (sections ?? []).map((section) => ({
      title: section.title,
      sectionType: section.section_type,
      module: section.module,
      durationSeconds: section.duration_seconds,
      questionIds: (mappings ?? [])
        .filter((mapping) => mapping.test_section_id === section.id)
        .map((mapping) => mapping.question_id),
    })),
  } as EditableAdminTest;
}

export async function saveAdminTest(
  actorId: string,
  input: AdminTestBuilderInput,
  testId?: string,
) {
  validatePublishedFullMock(input);
  await validateQuestionAssignments(input);
  const admin = createSupabaseAdminClient();
  const durationSeconds = totalDuration(input);
  let resolvedTestId = testId;

  if (!resolvedTestId) {
    const { data: test, error } = await admin
      .from("tests")
      .insert({
        title: input.title,
        description: input.description,
        test_type: input.testType,
        module: input.module,
        duration_seconds: durationSeconds,
        instructions: input.instructions,
        is_premium: input.isPremium,
        is_published: false,
        randomize_questions: input.randomizeQuestions,
        randomize_options: input.randomizeOptions,
        created_by: actorId,
      })
      .select("id")
      .single();
    if (error || !test) {
      throw mockSaveFailure("Unable to create the Mock parent record.", {
        stage: "parent_creation",
        questionCount: input.sections.reduce((total, section) => total + section.questionIds.length, 0),
        error,
      });
    }
    const createdTestId = test.id as string;
    resolvedTestId = createdTestId;

    try {
      await insertTestSections(createdTestId, input);
    } catch (error) {
      await admin.from("tests").delete().eq("id", createdTestId);
      throw error;
    }
  } else {
    if (resolvedTestId === PRACTICE_TEST_ID) {
      throw new Error("The internal practice test cannot be edited.");
    }
    const { data: current } = await admin
        .from("tests")
        .select("id, is_published")
        .eq("id", resolvedTestId)
        .maybeSingle();
    if (!current) {
      throw mockSaveFailure("Mock not found.", {
        stage: "template_loading",
        mockId: resolvedTestId,
      });
    }

    const { data: oldSections, error: oldSectionError } = await admin
      .from("test_sections")
      .select("id, template_version")
      .eq("test_id", resolvedTestId)
      .eq("is_current", true);
    if (oldSectionError || !oldSections?.length) {
      throw mockSaveFailure("Unable to load the current Mock template.", {
        stage: "template_loading",
        mockId: resolvedTestId,
        error: oldSectionError,
      });
    }
    const nextTemplateVersion = Math.max(
      ...oldSections.map((section) => Number(section.template_version ?? 1)),
    ) + 1;
    const stagedSections = await insertTestSections(
      resolvedTestId,
      input,
      { templateVersion: nextTemplateVersion, isCurrent: false },
    );
    const stagedIds = stagedSections.map((section) => section.id);

    const { error: retireError } = await admin
      .from("test_sections")
      .update({ is_current: false })
      .in("id", oldSections.map((section) => section.id));
    if (retireError) {
      await admin.from("test_sections").delete().in("id", stagedIds);
      throw mockSaveFailure("Unable to version the previous Mock structure.", {
        stage: "template_retirement",
        mockId: resolvedTestId,
        questionCount: input.sections.reduce((total, section) => total + section.questionIds.length, 0),
        error: retireError,
      });
    }

    const { error: activateError } = await admin
      .from("test_sections")
      .update({ is_current: true })
      .in("id", stagedIds);
    if (activateError) {
      await admin.from("test_sections").update({ is_current: true }).in("id", oldSections.map((section) => section.id));
      await admin.from("test_sections").delete().in("id", stagedIds);
      throw mockSaveFailure("Unable to activate the revised Mock structure.", {
        stage: "template_activation",
        mockId: resolvedTestId,
        questionCount: input.sections.reduce((total, section) => total + section.questionIds.length, 0),
        error: activateError,
      });
    }

    const { error: updateError } = await admin
      .from("tests")
      .update({
        title: input.title,
        description: input.description,
        test_type: input.testType,
        module: input.module,
        duration_seconds: durationSeconds,
        instructions: input.instructions,
        is_premium: input.isPremium,
        randomize_questions: input.randomizeQuestions,
        randomize_options: input.randomizeOptions,
      })
      .eq("id", resolvedTestId);
    if (updateError) {
      await admin.from("test_sections").update({ is_current: false }).in("id", stagedIds);
      await admin.from("test_sections").update({ is_current: true }).in("id", oldSections.map((section) => section.id));
      await admin.from("test_sections").delete().in("id", stagedIds);
      throw mockSaveFailure("The structure was saved, but Mock details failed.", {
        stage: "parent_update",
        mockId: resolvedTestId,
        questionCount: input.sections.reduce((total, section) => total + section.questionIds.length, 0),
        error: updateError,
      });
    }
  }

  if (!resolvedTestId) throw new Error("Unable to resolve the saved test.");

  if (input.intent === "publish") {
    const { error } = await admin
      .from("tests")
      .update({ is_published: true })
      .eq("id", resolvedTestId);
    if (error) {
      throw mockSaveFailure("The Mock was saved as a draft but could not be published.", {
        stage: "publication",
        mockId: resolvedTestId,
        questionCount: input.sections.reduce((total, section) => total + section.questionIds.length, 0),
        error,
      });
    }
  }

  await writeTestAudit(
    actorId,
    testId ? "test.updated" : "test.created",
    resolvedTestId,
    {
      is_published: input.intent === "publish",
      section_count: input.sections.length,
      question_count: input.sections.reduce(
        (total, section) => total + section.questionIds.length,
        0,
      ),
    },
  );

  return {
    id: resolvedTestId,
    isPublished: input.intent === "publish",
  };
}

export async function updateAdminTestPublication(
  actorId: string,
  testId: string,
  action: "publish" | "unpublish",
) {
  if (testId === PRACTICE_TEST_ID) {
    throw new Error("The internal practice test cannot be changed.");
  }
  const admin = createSupabaseAdminClient();
  const { data: test } = await admin
    .from("tests")
    .select("id, test_type, duration_seconds, is_published")
    .eq("id", testId)
    .maybeSingle();
  if (!test) throw new Error("Test not found.");

  const { data: existingSections } = await admin
    .from("test_sections")
    .select("section_type")
    .eq("test_id", testId)
    .eq("is_current", true);
  if ((existingSections ?? []).some((section) => !["figure_sequence", "mathematical_equation", "latin_square", "mixed"].includes(section.section_type))) {
    throw new Error("This legacy test is unavailable in the Core-only product.");
  }

  if (action === "unpublish") {
    const { count } = await admin
      .from("test_attempts")
      .select("id", { count: "exact", head: true })
      .eq("test_id", testId)
      .eq("status", "in_progress");
    if ((count ?? 0) > 0) {
      throw new Error("A test with active attempts cannot be unpublished.");
    }
  } else {
    const { data: sections } = await admin
      .from("test_sections")
      .select("id, title, section_type, duration_seconds, sort_order")
      .eq("test_id", testId)
      .eq("is_current", true);
    if (!sections?.length) throw new Error("Add at least one test section.");
    const sectionIds = sections.map((section) => section.id);
    const { data: mappings } = await admin
      .from("test_questions")
      .select("test_section_id, question_id")
      .in("test_section_id", sectionIds);
    const questionIds = (mappings ?? []).map((mapping) => mapping.question_id);
    if (!questionIds.length || new Set(questionIds).size !== questionIds.length) {
      throw new Error("Every section needs unique assigned questions.");
    }
    if (test.test_type === "full_mock") {
      const structureError = validateOfficialFullMockSections(sections.sort((a, b) => a.sort_order - b.sort_order).map((section) => ({
        id: section.id, title: section.title, sectionType: section.section_type,
        durationSeconds: section.duration_seconds, sortOrder: section.sort_order,
        questionCount: (mappings ?? []).filter((mapping) => mapping.test_section_id === section.id).length,
      })));
      if (structureError) throw new Error(structureError);
    }
    if (
      sections.reduce(
        (total, section) => total + section.duration_seconds,
        0,
      ) !== test.duration_seconds
    ) {
      throw new Error("Section duration does not match total test duration.");
    }
    const { count } = await admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .in("id", questionIds)
      .eq("module", "core")
      .eq("verification_status", "approved")
      .eq("publication_status", "published")
      .is("deleted_at", null);
    if (count !== questionIds.length) {
      throw new Error(
        "Every assigned question must be approved and published.",
      );
    }
  }

  const { error } = await admin
    .from("tests")
    .update({ is_published: action === "publish" })
    .eq("id", testId);
  if (error) throw new Error(`Unable to ${action} this test.`);

  await writeTestAudit(actorId, `test.lifecycle.${action}`, testId);
}
