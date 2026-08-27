import "server-only";

import type { PracticeQuestion } from "@/lib/practice/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { seededShuffle } from "@/lib/tests/randomization";
import { createPracticeSnapshots, gradePracticeAnswer } from "@/lib/practice/native";
import type { PracticeAnswer } from "@/lib/practice/schemas";
import { buildCoreAttemptSnapshot } from "@/lib/mocks";
import { isTestAnswerComplete } from "@/lib/tests/active-response";
import { activeSectionFromCursor, type ExamSectionSnapshot, validateOfficialFullMockSections } from "@/lib/tests/exam-spec";
import { getEnv } from "@/lib/validators/env";
import type {
  TestAttemptPayload,
  TestCatalogItem,
  TestOverview,
  TestQuestion,
} from "@/lib/tests/schemas";

type PublishedTestRow = {
  id: string;
  title: string;
  description: string | null;
  test_type: TestCatalogItem["testType"];
  module: TestCatalogItem["module"];
  duration_seconds: number;
  instructions: string | null;
  is_premium: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
};

type SectionRow = {
  id: string;
  test_id: string;
  title: string;
  duration_seconds: number;
  sort_order: number;
  section_type: string;
};

type MappingRow = {
  test_section_id: string;
  question_id: string;
  sort_order: number;
};

type SafeQuestionRow = {
  id: string;
  module: PracticeQuestion["module"];
  question_type: PracticeQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: PracticeQuestion["difficulty"];
  question_text: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  table_data: unknown;
  image_url: string | null;
  estimated_time_seconds: number;
  structured_data: unknown;
  metadata: unknown;
  explanation: string;
  correct_option_id: string | null;
  source_type: string;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  content: string;
  sort_order: number;
};

const CORE_SECTION_TYPES = new Set(["figure_sequence", "mathematical_equation", "latin_square", "mixed"]);

type ActiveAttemptCursor = {
  current_section_key: string | null;
  section_started_at: string | null;
  section_expires_at: string | null;
};

function resolveActiveSection(
  sections: ExamSectionSnapshot[],
  attempt: ActiveAttemptCursor,
  now = Date.now(),
) {
  return activeSectionFromCursor(sections, {
    currentSectionId: attempt.current_section_key,
    sectionStartedAtMs: attempt.section_started_at
      ? new Date(attempt.section_started_at).getTime()
      : null,
    sectionExpiresAtMs: attempt.section_expires_at
      ? new Date(attempt.section_expires_at).getTime()
      : null,
  }, now);
}

async function hasPremiumAccess(userId: string) {
  // Initial launch policy is explicitly free. The subscription schema and
  // trusted entitlement path remain available for a future monetization phase.
  if (getEnv().FREE_LAUNCH_ACCESS_ENABLED) return true;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("status, ends_at")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"]);

  return (data ?? []).some(
    (subscription) =>
      !subscription.ends_at ||
      new Date(subscription.ends_at).getTime() > Date.now(),
  );
}

async function getPublishedTest(testId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tests")
    .select(
      "id, title, description, test_type, module, duration_seconds, instructions, is_premium, randomize_questions, randomize_options",
    )
    .eq("id", testId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error("Unable to load this test.");
  if (!data) return null;
  const { data: sections } = await admin
    .from("test_sections")
    .select("section_type")
    .eq("test_id", testId)
    .eq("is_current", true);
  if (!(sections ?? []).every((section) => CORE_SECTION_TYPES.has(section.section_type))) return null;
  return data as PublishedTestRow;
}

async function assertTestAccess(userId: string, testId: string) {
  const test = await getPublishedTest(testId);
  if (!test) throw new Error("This test is unavailable.");
  if (test.is_premium && !(await hasPremiumAccess(userId))) {
    throw new Error("This test is not currently available.");
  }
  return test;
}

export async function getTestCatalog(userId: string): Promise<TestCatalogItem[]> {
  const admin = createSupabaseAdminClient();
  const { data: testData, error } = await admin
    .from("tests")
    .select(
      "id, title, description, test_type, module, duration_seconds, instructions, is_premium, randomize_questions, randomize_options",
    )
    .eq("is_published", true)
    .neq("id", "00000000-0000-4000-8000-000000000001")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load published tests.");
  const tests = (testData ?? []) as PublishedTestRow[];
  if (!tests.length) return [];

  const testIds = tests.map((test) => test.id);
  const [{ data: sectionData }, premiumAccess] = await Promise.all([
    admin
      .from("test_sections")
      .select("id, test_id, title, section_type, duration_seconds, sort_order")
      .in("test_id", testIds)
      .eq("is_current", true),
    hasPremiumAccess(userId),
  ]);
  const sections = (sectionData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id, sort_order")
        .in("test_section_id", sectionIds)
    : { data: [] };
  const mappings = (mappingData ?? []) as MappingRow[];

  return tests
    .filter((test) => sections
      .filter((section) => section.test_id === test.id)
      .every((section) => CORE_SECTION_TYPES.has(section.section_type)))
    .map((test) => {
    const testSections = sections.filter((section) => section.test_id === test.id);
    const testSectionIds = new Set(testSections.map((section) => section.id));
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      testType: test.test_type,
      module: test.module,
      durationSeconds: test.duration_seconds,
      isPremium: test.is_premium,
      sectionCount: testSections.length,
      questionCount: mappings.filter((mapping) =>
        testSectionIds.has(mapping.test_section_id),
      ).length,
      hasAccess: !test.is_premium || premiumAccess,
    };
  });
}

export async function getTestOverview(
  userId: string,
  testId: string,
): Promise<TestOverview | null> {
  const test = await getPublishedTest(testId);
  if (!test) return null;

  const admin = createSupabaseAdminClient();
  const [{ data: sectionData }, premiumAccess] = await Promise.all([
    admin
      .from("test_sections")
      .select("id, test_id, title, duration_seconds, sort_order")
      .eq("test_id", testId)
      .eq("is_current", true)
      .order("sort_order", { ascending: true }),
    hasPremiumAccess(userId),
  ]);
  const sections = (sectionData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData } = sectionIds.length
    ? await admin
        .from("test_questions")
        .select("test_section_id, question_id, sort_order")
        .in("test_section_id", sectionIds)
    : { data: [] };
  const mappings = (mappingData ?? []) as MappingRow[];

  return {
    id: test.id,
    title: test.title,
    description: test.description,
    testType: test.test_type,
    module: test.module,
    durationSeconds: test.duration_seconds,
    instructions: test.instructions,
    isPremium: test.is_premium,
    sectionCount: sections.length,
    questionCount: mappings.length,
    hasAccess: !test.is_premium || premiumAccess,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      durationSeconds: section.duration_seconds,
      questionCount: mappings.filter(
        (mapping) => mapping.test_section_id === section.id,
      ).length,
    })),
  };
}

export async function startTestAttempt(userId: string, testId: string) {
  const test = await assertTestAccess(userId, testId);
  const admin = createSupabaseAdminClient();

  const { data: currentAttempt } = await admin
    .from("test_attempts")
    .select("id, expires_at")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .eq("mock_origin", "curated")
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentAttempt?.expires_at && new Date(currentAttempt.expires_at).getTime() > Date.now()) {
    return { attemptId: currentAttempt.id as string, resumed: true };
  }

  if (currentAttempt) {
    await gradeAndSubmitTest(userId, currentAttempt.id, true);
  }

  const { data: sectionData, error: sectionError } = await admin
    .from("test_sections")
    .select("id, test_id, title, section_type, duration_seconds, sort_order")
    .eq("test_id", testId)
    .eq("is_current", true)
    .order("sort_order");
  if (sectionError) throw new Error("Unable to assemble the test sections.");
  const sections = (sectionData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);
  const { data: mappingData, error: mappingError } = await admin.from("test_questions")
    .select("test_section_id, question_id, sort_order").in("test_section_id", sectionIds).order("sort_order");
  if (mappingError) throw new Error("Unable to assemble the test questions.");
  const mappings = (mappingData ?? []) as MappingRow[];
  if (!sections.length || !mappings.length) throw new Error("This test does not contain a complete test structure.");
  if (test.test_type === "full_mock") {
    const structureError = validateOfficialFullMockSections(sections.map((section) => ({
      id: section.id, title: section.title, sectionType: section.section_type,
      durationSeconds: section.duration_seconds, sortOrder: section.sort_order,
      questionCount: mappings.filter((mapping) => mapping.test_section_id === section.id).length,
    })));
    if (structureError) throw new Error(structureError);
  }
  const seed = crypto.randomUUID();
  const orderedMappings = sections.flatMap((section) => {
    const values = mappings.filter((mapping) => mapping.test_section_id === section.id);
    return test.randomize_questions ? seededShuffle(values, `${seed}:${section.id}`) : values;
  });
  const questionIds = orderedMappings.map((mapping) => mapping.question_id);
  const [{ data: questionData }, { data: optionData }] = await Promise.all([
    admin.from("questions").select("id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, table_data, image_url, estimated_time_seconds, structured_data, metadata, explanation, correct_option_id, source_type")
      .in("id", questionIds).eq("module", "core").eq("verification_status", "approved").eq("publication_status", "published").is("deleted_at", null),
    admin.from("question_options").select("id, question_id, label, content, sort_order").in("question_id", questionIds).order("sort_order"),
  ]);
  const questionById = new Map(((questionData ?? []) as SafeQuestionRow[]).map((question) => [question.id, question]));
  const options = (optionData ?? []) as OptionRow[];
  const assembled = orderedMappings.map((mapping, position) => {
    const question = questionById.get(mapping.question_id);
    if (!question) throw new Error("Every mock question must remain approved and published until assembly completes.");
    const section = sections.find((value) => value.id === mapping.test_section_id);
    if (!section || question.question_type !== section.section_type) throw new Error("A mock question does not match its section type.");
    const questionOptions = options.filter((option) => option.question_id === question.id).map((option) => ({ id: option.id, label: option.label, content: option.content }));
    const orderedOptions = test.randomize_options ? seededShuffle(questionOptions, `${seed}:${question.id}`) : questionOptions;
    const snapshot = createPracticeSnapshots({
      id: question.id, module: question.module, questionType: question.question_type,
      topic: question.topic, subtopic: question.subtopic, difficulty: question.difficulty,
      questionText: question.question_text, passage: question.passage, code: question.code,
      formula: question.formula, tableData: question.table_data, imageUrl: question.image_url,
      estimatedTimeSeconds: question.estimated_time_seconds, structuredData: question.structured_data,
      metadata: question.metadata, explanation: question.explanation, options: orderedOptions,
      correctOptionId: question.correct_option_id, sourceType: question.source_type,
    });
    return { mapping, section, snapshot, position };
  });
  const sectionSnapshots: ExamSectionSnapshot[] = sections.map((section) => ({
    id: section.id, title: section.title, sectionType: section.section_type,
    durationSeconds: section.duration_seconds, sortOrder: section.sort_order,
  }));
  const startedAt = new Date();
  const firstSection = sectionSnapshots[0];
  const expiresAt = new Date(startedAt.getTime() + sectionSnapshots.reduce((sum, section) => sum + section.durationSeconds, 0) * 1000);
  const sectionExpiresAt = new Date(startedAt.getTime() + firstSection.durationSeconds * 1000);
  const attemptId = crypto.randomUUID();
  const attemptSnapshot = buildCoreAttemptSnapshot({
    title: test.title,
    mockSeed: seed,
    createdAt: startedAt.toISOString(),
    sections: sectionSnapshots,
    questions: assembled.map(({ snapshot, position }) => ({
      questionId: snapshot.publicQuestion.id,
      sectionType: snapshot.publicQuestion.questionType,
      position: position + 1,
      generatorVersion: typeof snapshot.privateSnapshot.provenance.generatorVersion === "string"
        ? snapshot.privateSnapshot.provenance.generatorVersion
        : null,
      validatorVersion: typeof snapshot.privateSnapshot.provenance.validatorVersion === "string"
        ? snapshot.privateSnapshot.provenance.validatorVersion
        : null,
      seed: typeof snapshot.privateSnapshot.provenance.seed === "string"
        ? snapshot.privateSnapshot.provenance.seed
        : null,
      fingerprint: typeof snapshot.privateSnapshot.provenance.fingerprint === "string"
        ? snapshot.privateSnapshot.provenance.fingerprint
        : null,
    })),
  });
  const immutableItems = assembled.map(({ mapping, section, snapshot, position }) => ({
    source_question_id: snapshot.publicQuestion.id,
    position: position + 1,
    test_section_id: section.id,
    section_position: orderedMappings
      .filter((item) => item.test_section_id === mapping.test_section_id)
      .findIndex((item) => item.question_id === mapping.question_id) + 1,
    question_type: snapshot.publicQuestion.questionType,
    public_snapshot: snapshot.publicQuestion,
    private_snapshot: snapshot.privateSnapshot,
    generator_version: snapshot.privateSnapshot.provenance.generatorVersion ?? null,
    validator_version: snapshot.privateSnapshot.provenance.validatorVersion ?? null,
    seed: snapshot.privateSnapshot.provenance.seed ?? null,
    fingerprint: snapshot.privateSnapshot.provenance.fingerprint ?? null,
  }));
  const { error: persistenceError } = await admin.rpc("create_core_mock_attempt", {
    p_attempt_id: attemptId,
    p_test_id: testId,
    p_user_id: userId,
    p_mock_seed: seed,
    p_protocol_version: attemptSnapshot.protocolVersion,
    p_generator_versions: attemptSnapshot.generatorVersions,
    p_question_fingerprints: attemptSnapshot.fingerprints,
    p_test_snapshot: attemptSnapshot,
    p_items: immutableItems,
    p_response_question_ids: questionIds,
    p_started_at: startedAt.toISOString(),
    p_expires_at: expiresAt.toISOString(),
    p_current_section_id: firstSection.id,
    p_section_expires_at: sectionExpiresAt.toISOString(),
    p_current_question_id: assembled[0].snapshot.publicQuestion.id,
  });
  if (persistenceError) {
    throw new Error("Unable to atomically snapshot and start this test.");
  }

  return { attemptId, resumed: false };
}

export async function getTestAttempt(
  userId: string,
  testId: string,
  attemptId: string,
): Promise<TestAttemptPayload> {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin.from("test_attempts")
    .select("id, test_id, generated_mock_id, mock_origin, user_id, status, started_at, expires_at, current_section_key, section_started_at, section_expires_at, current_question_key, test_snapshot")
    .eq("id", attemptId).maybeSingle();

  if (
    !attempt ||
    attempt.user_id !== userId ||
    (attempt.mock_origin === "generated" ? attempt.generated_mock_id !== testId : attempt.test_id !== testId) ||
    attempt.status !== "in_progress" ||
    !attempt.expires_at || !attempt.started_at
  ) {
    throw new Error("This test attempt is unavailable or already completed.");
  }
  const snapshot = attempt.test_snapshot as { title?: string; sections?: ExamSectionSnapshot[] };
  const sections = snapshot.sections ?? [];
  const now = Date.now();
  const active = resolveActiveSection(sections, attempt, now);
  if (!active) {
    await gradeAndSubmitTest(userId, attemptId, true);
    throw new Error("Time expired. The test was submitted automatically; open Results to review it.");
  }
  const [{ data: itemData }, { data: responseData }] = await Promise.all([
    admin.from("practice_attempt_items").select("question_key, section_key, section_position, public_snapshot, position")
      .eq("attempt_id", attemptId).order("position"),
    admin.from("user_responses").select("question_key, response_payload, selected_option_id, response_status, is_marked_for_review, time_spent_seconds")
      .eq("attempt_id", attemptId),
  ]);
  const items = itemData ?? [];
  const activeItems = items.filter((item) => item.section_key === active.section.id);
  if (!activeItems.length) throw new Error("The immutable section snapshot is incomplete.");
  const responseMap = new Map((responseData ?? []).map((response) => [response.question_key, response]));
  const currentQuestionId = activeItems.some((item) => item.question_key === attempt.current_question_key)
    ? String(attempt.current_question_key)
    : String(activeItems.find((item) => responseMap.get(item.question_key)?.response_status !== "answered")?.question_key ?? activeItems[0].question_key);
  if (attempt.current_section_key !== active.section.id || attempt.current_question_key !== currentQuestionId) {
    await admin.from("test_attempts").update({
      current_section_key: active.section.id, section_started_at: new Date(active.startedAt).toISOString(),
      section_expires_at: new Date(active.expiresAt).toISOString(), current_question_key: currentQuestionId,
      last_activity_at: new Date(now).toISOString(),
    }).eq("id", attemptId).eq("user_id", userId).eq("status", "in_progress");
  }
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const questions: TestQuestion[] = items.map((item) => {
    const publicQuestion = item.public_snapshot as PracticeQuestion;
    const section = sectionById.get(String(item.section_key));
    return { ...publicQuestion, sectionId: String(item.section_key), sectionTitle: section?.title ?? "Test section", sectionPosition: Number(item.section_position ?? 1) };
  });

  return {
    attemptId,
    title: snapshot.title ?? "dMAT Mock Test",
    currentSectionId: active.section.id,
    currentQuestionId,
    sectionExpiresAt: new Date(active.expiresAt).toISOString(),
    serverNow: new Date(now).toISOString(),
    sections: sections.map((section) => ({ id: section.id, title: section.title, durationSeconds: section.durationSeconds, sortOrder: section.sortOrder })),
    questions,
    initialResponses: (responseData ?? []).map((response) => ({
      questionId: response.question_key,
      answer: (response.response_payload as PracticeAnswer | null) ?? (response.selected_option_id ? { kind: "single_choice", optionId: response.selected_option_id } : null),
      markedForReview: response.is_marked_for_review,
      timeSpentSeconds: response.time_spent_seconds,
    })),
  };
}

export async function saveTestResponse(
  userId: string,
  input: {
    attemptId: string;
    questionId: string;
    answer: PracticeAnswer | null;
    markedForReview: boolean;
    timeSpentSeconds: number;
  },
) {
  const admin = createSupabaseAdminClient();
  const [{ data: attempt }, { data: response }] = await Promise.all([
    admin
      .from("test_attempts")
      .select("id, user_id, status, current_section_key, section_started_at, section_expires_at, test_snapshot")
      .eq("id", input.attemptId)
      .maybeSingle(),
    admin
      .from("user_responses")
      .select("id, shown_at")
      .eq("attempt_id", input.attemptId)
      .eq("question_key", input.questionId)
      .maybeSingle(),
  ]);

  if (
    !attempt ||
    attempt.user_id !== userId ||
    attempt.status !== "in_progress" ||
    !response
  ) {
    throw new Error("This response cannot be updated.");
  }
  const sections = ((attempt.test_snapshot as { sections?: ExamSectionSnapshot[] }).sections ?? []);
  const active = resolveActiveSection(sections, attempt);
  if (!active) {
    await gradeAndSubmitTest(userId, input.attemptId, true);
    throw new Error("Time expired and the test was submitted automatically.");
  }
  const { data: item } = await admin.from("practice_attempt_items")
    .select("section_key, public_snapshot").eq("attempt_id", input.attemptId)
    .eq("question_key", input.questionId).maybeSingle();
  if (!item || item.section_key !== active.section.id) throw new Error("Only the current timed section can be changed.");
  const publicQuestion = item.public_snapshot as PracticeQuestion;
  if (input.answer) {
    if (publicQuestion.response?.kind !== input.answer.kind) throw new Error("The response type does not match this question.");
    const answer = input.answer;
    if (answer.kind === "single_choice" && !publicQuestion.options.some((option) => option.id === answer.optionId)) {
      throw new Error("The selected option is not in the immutable attempt snapshot.");
    }
  }

  const isComplete = isTestAnswerComplete(publicQuestion, input.answer);

  const { error } = await admin
    .from("user_responses")
    .update({
      selected_option_id: input.answer?.kind === "single_choice" && /^[0-9a-f-]{36}$/i.test(input.answer.optionId) ? input.answer.optionId : null,
      response_payload: input.answer,
      response_status: isComplete ? "answered" : "unanswered",
      is_marked_for_review: input.markedForReview,
      time_spent_seconds: input.timeSpentSeconds,
      answered_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", response.id);
  await admin.from("test_attempts").update({ current_question_key: input.questionId, last_activity_at: new Date().toISOString() })
    .eq("id", input.attemptId).eq("user_id", userId).eq("status", "in_progress");

  if (error) throw new Error("Unable to save this response.");
  return { saved: true };
}

export async function gradeAndSubmitTest(
  userId: string,
  attemptId: string,
  autoSubmitted: boolean,
) {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin
    .from("test_attempts")
    .select("id, user_id, status, started_at, score, accuracy, total_time_seconds, test_snapshot")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== userId) {
    throw new Error("This test attempt is unavailable or already submitted.");
  }

  const { data: responses } = await admin
    .from("user_responses")
    .select("id, question_key, selected_option_id, response_payload")
    .eq("attempt_id", attemptId);
  if (attempt.status === "submitted" || attempt.status === "auto_submitted") {
    return {
      correct: Number(attempt.score ?? 0),
      total: responses?.length ?? 0,
      accuracy: Number(attempt.accuracy ?? 0),
      totalTimeSeconds: Number(attempt.total_time_seconds ?? 0),
    };
  }
  if (attempt.status !== "in_progress") {
    throw new Error("This test attempt is unavailable or already submitted.");
  }
  const { data: items } = await admin.from("practice_attempt_items")
    .select("question_key, private_snapshot").eq("attempt_id", attemptId);
  const privateByQuestion = new Map((items ?? []).map((item) => [item.question_key, item.private_snapshot]));

  const gradingResults = await Promise.all(
    (responses ?? []).map((response) =>
      admin
        .from("user_responses")
        .update({
          is_correct: response.response_payload
            ? gradePracticeAnswer(response.response_payload as PracticeAnswer, privateByQuestion.get(response.question_key) as Parameters<typeof gradePracticeAnswer>[1])
            : false,
        })
        .eq("id", response.id),
    ),
  );

  if (gradingResults.some((result) => result.error)) {
    throw new Error("Unable to grade every response.");
  }

  const correct = (responses ?? []).filter((response) => response.response_payload && gradePracticeAnswer(response.response_payload as PracticeAnswer, privateByQuestion.get(response.question_key) as Parameters<typeof gradePracticeAnswer>[1])).length;
  const total = (responses ?? []).length;
  const accuracy = total ? (correct / total) * 100 : 0;
  const totalDuration = (((attempt.test_snapshot as { sections?: ExamSectionSnapshot[] }).sections ?? []).reduce((sum, section) => sum + section.durationSeconds, 0));
  const totalTimeSeconds = Math.max(0, Math.min(totalDuration, Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000)));
  const { error: completionError } = await admin.from("test_attempts").update({
    status: autoSubmitted ? "auto_submitted" : "submitted", submitted_at: new Date().toISOString(),
    score: correct, accuracy, total_time_seconds: totalTimeSeconds, last_activity_at: new Date().toISOString(),
  }).eq("id", attemptId).eq("user_id", userId).eq("status", "in_progress");
  if (completionError) throw new Error("Unable to finalize the immutable test result.");
  return { correct, total, accuracy, totalTimeSeconds };
}

export async function processTestClock(userId: string, attemptId: string) {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin.from("test_attempts")
    .select("id, user_id, status, current_section_key, section_started_at, section_expires_at, test_snapshot").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== userId || attempt.status !== "in_progress") {
    throw new Error("This test attempt is unavailable.");
  }
  const sections = ((attempt.test_snapshot as { sections?: ExamSectionSnapshot[] }).sections ?? []);
  const active = resolveActiveSection(sections, attempt);
  if (!active) return { finalized: true, ...(await gradeAndSubmitTest(userId, attemptId, true)) };
  const { data: firstItem } = await admin.from("practice_attempt_items")
    .select("question_key").eq("attempt_id", attemptId).eq("section_key", active.section.id)
    .order("section_position").limit(1).maybeSingle();
  await admin.from("test_attempts").update({
    current_section_key: active.section.id, section_started_at: new Date(active.startedAt).toISOString(),
    section_expires_at: new Date(active.expiresAt).toISOString(), current_question_key: firstItem?.question_key ?? null,
    last_activity_at: new Date().toISOString(),
  }).eq("id", attemptId).eq("user_id", userId).eq("status", "in_progress");
  return {
    finalized: false,
    sectionId: active.section.id,
    questionId: firstItem?.question_key ?? null,
    sectionExpiresAt: new Date(active.expiresAt).toISOString(),
  };
}

export async function advanceTestSection(
  userId: string,
  attemptId: string,
  expectedSectionId: string,
) {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin.from("test_attempts")
    .select("id, user_id, status, current_section_key, section_started_at, section_expires_at, test_snapshot")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || attempt.user_id !== userId || attempt.status !== "in_progress") {
    throw new Error("This test attempt is unavailable.");
  }

  const sections = ((attempt.test_snapshot as { sections?: ExamSectionSnapshot[] }).sections ?? []);
  const active = resolveActiveSection(sections, attempt);
  if (!active || active.section.id !== expectedSectionId) {
    throw new Error("This timed section has already ended.");
  }
  const nextSection = sections[active.sectionIndex + 1];
  if (!nextSection) throw new Error("This is already the final section.");

  const { data: firstItem } = await admin.from("practice_attempt_items")
    .select("question_key")
    .eq("attempt_id", attemptId)
    .eq("section_key", nextSection.id)
    .order("section_position")
    .limit(1)
    .maybeSingle();
  if (!firstItem?.question_key) throw new Error("The next section snapshot is incomplete.");

  const startedAt = new Date();
  const sectionExpiresAt = new Date(
    startedAt.getTime() + nextSection.durationSeconds * 1000,
  );
  const { error } = await admin.from("test_attempts").update({
    current_section_key: nextSection.id,
    section_started_at: startedAt.toISOString(),
    section_expires_at: sectionExpiresAt.toISOString(),
    current_question_key: firstItem.question_key,
    last_activity_at: startedAt.toISOString(),
  }).eq("id", attemptId).eq("user_id", userId).eq("status", "in_progress");
  if (error) throw new Error("Unable to continue to the next section.");

  return {
    sectionId: nextSection.id,
    questionId: String(firstItem.question_key),
    sectionExpiresAt: sectionExpiresAt.toISOString(),
  };
}
