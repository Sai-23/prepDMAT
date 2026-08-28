import "server-only";

import type {
  AdminMetrics,
  EditableQuestion,
  QuestionAuthoringInput,
  ReviewQueueQuestion,
} from "@/lib/admin/schemas";
import { canAdminEditQuestion } from "@/lib/admin/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MathematicalEquationQuestion } from "@/lib/generation/mathematical-equations";
import type { LatinSquareQuestion } from "@/lib/generation/latin-squares";
import type { FigureSequenceQuestion } from "@/lib/generation/figure-sequences";
import { evaluatePublication } from "@/lib/admin/publishing-policy";
import type { StructuralProfile } from "@/lib/generation/novelty";

function questionSnapshot(
  question: Record<string, unknown>,
  options: Array<Record<string, unknown>>,
) {
  return { ...question, options };
}

async function writeAudit(
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: "question",
    entity_id: entityId,
    metadata,
  });
  if (error) throw new Error("The change was saved, but its audit record failed.");
}

export type GeneratedNoveltyHistory = {
  fingerprints: Set<string>;
  structuralProfiles: StructuralProfile[];
};

function isStructuralProfile(value: unknown): value is StructuralProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as { namespace?: unknown; features?: unknown };
  return ["figure_sequence", "mathematical_equation", "latin_square"].includes(String(profile.namespace)) &&
    Boolean(profile.features) && typeof profile.features === "object" && !Array.isArray(profile.features);
}

async function getGeneratedNoveltyHistory(
  questionType: "mathematical_equation" | "latin_square" | "figure_sequence",
): Promise<GeneratedNoveltyHistory> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("metadata")
    .eq("source_type", "generated")
    .eq("question_type", questionType)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Unable to load recent generated-question novelty metadata.");
  const fingerprints = new Set<string>();
  const structuralProfiles: StructuralProfile[] = [];
  (data ?? []).forEach((row) => {
    const generation = (row.metadata as { generation?: Record<string, unknown> } | null)?.generation;
    if (typeof generation?.fingerprint === "string") fingerprints.add(generation.fingerprint);
    if (isStructuralProfile(generation?.structuralProfile)) structuralProfiles.push(generation.structuralProfile);
  });
  return { fingerprints, structuralProfiles };
}

export function getGeneratedEquationNoveltyHistory(): Promise<GeneratedNoveltyHistory> {
  return getGeneratedNoveltyHistory("mathematical_equation");
}

export function getGeneratedLatinNoveltyHistory(): Promise<GeneratedNoveltyHistory> {
  return getGeneratedNoveltyHistory("latin_square");
}

export function getGeneratedFigureNoveltyHistory(): Promise<GeneratedNoveltyHistory> {
  return getGeneratedNoveltyHistory("figure_sequence");
}

export type ExistingGeneratedQuestion = {
  id: string;
  publicationStatus: string;
  verificationStatus: string;
  deletedAt: string | null;
};

export async function getGeneratedQuestionByFingerprint(
  fingerprint: string,
): Promise<ExistingGeneratedQuestion | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, publication_status, verification_status, deleted_at")
    .eq("source_type", "generated")
    .eq("metadata->generation->>fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw new Error("Unable to verify the generated question's publication state.");
  if (!data) return null;
  return {
    id: data.id as string,
    publicationStatus: data.publication_status as string,
    verificationStatus: data.verification_status as string,
    deletedAt: data.deleted_at as string | null,
  };
}

function assertGeneratedQuestionCanPublish(candidate: {
  questionType: string;
  structuredData: unknown;
  metadata: unknown;
}) {
  const decision = evaluatePublication({
    verificationStatus: "approved",
    questionType: candidate.questionType,
    sourceType: "generated",
    optionCount: 0,
    correctOptionId: null,
    structuredData: candidate.structuredData,
    metadata: candidate.metadata,
  });
  if (!decision.allowed) throw new Error(decision.reason);
}

export async function createPublishedGeneratedEquation(
  actorId: string,
  question: MathematicalEquationQuestion,
): Promise<string> {
  if (
    !question.validation.valid ||
    !question.validation.checks.every((validationCheck) => validationCheck.passed)
  ) {
    throw new Error("Only fully validated generated questions can be published.");
  }

  const admin = createSupabaseAdminClient();
  const structuredData = {
    schemaVersion: 1,
    task: question.structuredData,
    presentation: question.presentation,
    response: question.response,
    solutionPath: question.solutionPath,
    reasoningPath: question.reasoningPath,
    fastestMethod: question.fastestMethod,
  };
  const metadata = {
    generation: question.metadata,
    validation: question.validation,
    correctAnswer: question.correctAnswer,
  };
  assertGeneratedQuestionCanPublish({
    questionType: "mathematical_equation",
    structuredData,
    metadata,
  });
  const publishedAt = new Date().toISOString();
  const { data: saved, error: saveError } = await admin
    .from("questions")
    .insert({
      module: "core",
      question_type: "mathematical_equation",
      topic: question.topic,
      subtopic: question.subtopic ?? null,
      difficulty: question.metadata.calculatedDifficulty,
      question_text: question.presentation.prompt,
      structured_data: structuredData,
      metadata,
      explanation: question.explanation,
      estimated_time_seconds: question.estimatedSolveTimeSeconds,
      source_type: "generated",
      verification_status: "approved",
      publication_status: "published",
      published_at: publishedAt,
      retired_at: null,
      created_by: actorId,
      updated_by: actorId,
    })
    .select("*")
    .single();

  if (saveError || !saved) {
    if (saveError?.code === "23505") {
      throw new Error("A generated question with this fingerprint already exists.");
    }
    throw new Error("Unable to publish the generated equation.");
  }

  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: "Validated generated equation published by an administrator.",
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The equation could not be versioned and was not retained.");
  }

  await writeAudit(actorId, "question.generated_published", saved.id, {
    fingerprint: question.metadata.fingerprint,
    seed: question.metadata.seed,
    generator_version: question.metadata.generatorVersion,
    validator_version: question.metadata.validatorVersion,
  });
  return saved.id as string;
}

export async function createPublishedGeneratedLatin(
  actorId: string,
  question: LatinSquareQuestion,
): Promise<string> {
  if (
    !question.validation.valid ||
    !question.validation.checks.every((validationCheck) => validationCheck.passed)
  ) {
    throw new Error("Only fully validated generated Latin squares can be published.");
  }

  const admin = createSupabaseAdminClient();
  const structuredData = {
    schemaVersion: 1,
    task: question.structuredData,
    presentation: question.presentation,
    response: question.response,
    deductionTrace: question.deductionTrace,
    completedGrid: question.completedGrid,
  };
  const metadata = {
    generation: question.metadata,
    validation: question.validation,
    correctAnswer: question.correctAnswer,
  };
  assertGeneratedQuestionCanPublish({
    questionType: "latin_square",
    structuredData,
    metadata,
  });
  const publishedAt = new Date().toISOString();
  const { data: saved, error: saveError } = await admin
    .from("questions")
    .insert({
      module: "core",
      question_type: "latin_square",
      topic: question.topic,
      subtopic: question.subtopic ?? null,
      difficulty: question.metadata.calculatedDifficulty,
      question_text: question.presentation.prompt,
      structured_data: structuredData,
      metadata,
      explanation: question.explanation,
      estimated_time_seconds: question.estimatedSolveTimeSeconds,
      source_type: "generated",
      verification_status: "approved",
      publication_status: "published",
      published_at: publishedAt,
      retired_at: null,
      created_by: actorId,
      updated_by: actorId,
    })
    .select("*")
    .single();

  if (saveError || !saved) {
    if (saveError?.code === "23505") {
      throw new Error("A generated Latin square with this fingerprint already exists.");
    }
    throw new Error("Unable to publish the generated Latin square.");
  }

  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: "Validated generated Latin square published by an administrator.",
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The Latin square could not be versioned and was not retained.");
  }

  await writeAudit(actorId, "question.generated_published", saved.id, {
    fingerprint: question.metadata.fingerprint,
    seed: question.metadata.seed,
    generator_version: question.metadata.generatorVersion,
    validator_version: question.metadata.validatorVersion,
  });
  return saved.id as string;
}

export async function createPublishedGeneratedFigure(
  actorId: string,
  question: FigureSequenceQuestion,
): Promise<string> {
  if (!question.validation.valid || !question.validation.checks.every((item) => item.passed)) {
    throw new Error("Only fully validated generated figure sequences can be published.");
  }
  const admin = createSupabaseAdminClient();
  const structuredData = {
    schemaVersion: 1,
    task: question.structuredData,
    presentation: question.presentation,
    response: question.response,
    sequence: question.sequence,
    solutionFrames: question.solutionFrames,
  };
  const metadata = {
    generation: question.metadata,
    validation: question.validation,
    correctAnswer: question.correctAnswer,
  };
  assertGeneratedQuestionCanPublish({
    questionType: "figure_sequence",
    structuredData,
    metadata,
  });
  const publishedAt = new Date().toISOString();
  const { data: saved, error: saveError } = await admin.from("questions").insert({
    module: "core",
    question_type: "figure_sequence",
    topic: question.topic,
    subtopic: question.subtopic ?? null,
    difficulty: question.metadata.calculatedDifficulty,
    question_text: question.presentation.prompt,
    structured_data: structuredData,
    metadata,
    explanation: question.explanation,
    estimated_time_seconds: question.estimatedSolveTimeSeconds,
    source_type: "generated",
    verification_status: "approved",
    publication_status: "published",
    published_at: publishedAt,
    retired_at: null,
    created_by: actorId,
    updated_by: actorId,
  }).select("*").single();
  if (saveError || !saved) {
    if (saveError?.code === "23505") throw new Error("A generated figure sequence with this fingerprint already exists.");
    throw new Error("Unable to publish the generated figure sequence.");
  }
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: saved.id,
    version: 1,
    snapshot: questionSnapshot(saved, []),
    change_summary: "Validated generated figure sequence published by an administrator.",
    changed_by: actorId,
  });
  if (versionError) {
    await admin.from("questions").delete().eq("id", saved.id);
    throw new Error("The figure sequence could not be versioned and was not retained.");
  }
  await writeAudit(actorId, "question.generated_published", saved.id, {
    fingerprint: question.metadata.fingerprint,
    seed: question.metadata.seed,
    generator_version: question.metadata.generatorVersion,
    validator_version: question.metadata.validatorVersion,
  });
  return saved.id as string;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = createSupabaseAdminClient();
  const utcDayStart = new Date();
  utcDayStart.setUTCHours(0, 0, 0, 0);
  const generatedBase = () => admin
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("module", "core")
    .eq("source_type", "generated")
    .is("deleted_at", null);
  const [
    users,
    total,
    underReview,
    approvedDrafts,
    published,
    openReports,
    publishedTests,
    generated,
    generatedToday,
    attempts,
    completedAttempts,
    ...generatorBreakdowns
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("questions").select("id", { count: "exact", head: true }).eq("module", "core").is("deleted_at", null),
    admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("module", "core")
      .is("deleted_at", null)
      .eq("verification_status", "under_review"),
    admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("module", "core")
      .is("deleted_at", null)
      .eq("verification_status", "approved")
      .eq("publication_status", "draft"),
    admin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("module", "core")
      .is("deleted_at", null)
      .eq("publication_status", "published"),
    admin
      .from("question_reports")
      .select("id, questions!inner(module)", { count: "exact", head: true })
      .eq("questions.module", "core")
      .eq("status", "open"),
    admin
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("module", "core")
      .neq("id", "00000000-0000-4000-8000-000000000001"),
    generatedBase(),
    generatedBase().gte("created_at", utcDayStart.toISOString()),
    admin.from("test_attempts").select("id", { count: "exact", head: true }),
    admin.from("test_attempts").select("id", { count: "exact", head: true }).in("status", ["submitted", "auto_submitted"]),
    ...(["figure_sequence", "mathematical_equation", "latin_square"] as const).map((questionType) =>
      generatedBase().eq("question_type", questionType),
    ),
    ...(["easy", "medium", "hard"] as const).map((difficulty) =>
      generatedBase().eq("difficulty", difficulty),
    ),
  ]);

  if (
    [users, total, underReview, approvedDrafts, published, openReports, publishedTests, generated, generatedToday, attempts, completedAttempts, ...generatorBreakdowns].some(
      (result) => result.error,
    )
  ) {
    throw new Error("Unable to load administrative metrics.");
  }

  return {
    totalUsers: users.count ?? 0,
    totalQuestions: total.count ?? 0,
    underReview: underReview.count ?? 0,
    approvedDrafts: approvedDrafts.count ?? 0,
    publishedQuestions: published.count ?? 0,
    openReports: openReports.count ?? 0,
    publishedTests: publishedTests.count ?? 0,
    generatedQuestions: generated.count ?? 0,
    generatedTodayUtc: generatedToday.count ?? 0,
    totalAttempts: attempts.count ?? 0,
    completedAttempts: completedAttempts.count ?? 0,
    generatedByType: {
      figure_sequence: generatorBreakdowns[0].count ?? 0,
      mathematical_equation: generatorBreakdowns[1].count ?? 0,
      latin_square: generatorBreakdowns[2].count ?? 0,
    },
    generatedByDifficulty: {
      easy: generatorBreakdowns[3].count ?? 0,
      medium: generatorBreakdowns[4].count ?? 0,
      hard: generatorBreakdowns[5].count ?? 0,
    },
  };
}

export async function createQuestion(
  actorId: string,
  input: QuestionAuthoringInput,
) {
  if (input.intent === "correction") {
    throw new Error("Published correction mode requires an existing question.");
  }

  const admin = createSupabaseAdminClient();
  const structuredData = input.structuredData
    ? (JSON.parse(input.structuredData) as Record<string, unknown>)
    : {};
  const { data: question, error: questionError } = await admin
    .from("questions")
    .insert({
      module: input.module,
      question_type: input.questionType,
      subject: input.subject,
      topic: input.topic,
      subtopic: input.subtopic,
      difficulty: input.difficulty,
      question_text: input.questionText,
      passage: input.passage,
      code: input.code,
      formula: input.formula,
      structured_data: structuredData,
      image_url: input.imageUrl,
      explanation: input.explanation,
      estimated_time_seconds: input.estimatedTimeSeconds,
      source_type: input.sourceType,
      verification_status:
        input.intent === "review" ? "under_review" : "draft",
      publication_status: "draft",
      created_by: actorId,
      updated_by: actorId,
    })
    .select("*")
    .single();

  if (questionError || !question) throw new Error("Unable to create this question.");

  const optionRows = input.options.map((content, index) => ({
    question_id: question.id,
    label: String.fromCharCode(65 + index),
    content,
    sort_order: index + 1,
  }));
  const { data: options, error: optionError } = await admin
    .from("question_options")
    .insert(optionRows)
    .select("*");

  if (optionError || !options || options.length !== 4) {
    await admin.from("questions").delete().eq("id", question.id);
    throw new Error("Unable to save all four answer options.");
  }

  const correctOption = options[input.correctOptionIndex];
  const { data: completedQuestion, error: updateError } = await admin
    .from("questions")
    .update({ correct_option_id: correctOption.id })
    .eq("id", question.id)
    .select("*")
    .single();

  if (updateError || !completedQuestion) {
    await admin.from("questions").delete().eq("id", question.id);
    throw new Error("Unable to set the correct answer.");
  }

  const snapshot = questionSnapshot(completedQuestion, options);
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: question.id,
    version: 1,
    snapshot,
    change_summary:
      input.intent === "review"
        ? "Question created and submitted for review."
        : "Question draft created.",
    changed_by: actorId,
  });
  if (versionError) throw new Error("Question created, but versioning failed.");

  await writeAudit(actorId, "question.created", question.id, {
    verification_status: completedQuestion.verification_status,
  });
  return {
    id: question.id as string,
    status: completedQuestion.verification_status as string,
    version: 1,
    wasPublished: false,
  };
}

export async function getEditableQuestion(
  questionId: string,
): Promise<EditableQuestion | null> {
  const admin = createSupabaseAdminClient();
  const { data: question, error } = await admin
    .from("questions")
    .select(
      "id, module, question_type, subject, topic, subtopic, difficulty, question_text, passage, code, formula, structured_data, image_url, explanation, estimated_time_seconds, source_type, correct_option_id, verification_status, publication_status",
    )
    .eq("id", questionId)
    .eq("module", "core")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error("Unable to load this question.");
  if (!question) return null;
  if (
    !canAdminEditQuestion(
      question.verification_status,
      question.publication_status,
    )
  ) {
    throw new Error(
      "Only draft, rejected, or currently published questions can be edited.",
    );
  }

  const { data: options, error: optionError } = await admin
    .from("question_options")
    .select("id, content, sort_order")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: true });
  if (optionError || !options || options.length !== 4) {
    throw new Error("This question does not have a valid four-option structure.");
  }

  return {
    id: question.id,
    module: question.module,
    questionType: question.question_type,
    subject: question.subject,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionText: question.question_text,
    passage: question.passage,
    code: question.code,
    formula: question.formula,
    structuredData:
      question.structured_data &&
      Object.keys(question.structured_data as Record<string, unknown>).length
        ? JSON.stringify(question.structured_data, null, 2)
        : "",
    imageUrl: question.image_url,
    explanation: question.explanation,
    estimatedTimeSeconds: question.estimated_time_seconds,
    sourceType: question.source_type,
    options: options.map((option) => option.content),
    correctOptionIndex: Math.max(
      0,
      options.findIndex((option) => option.id === question.correct_option_id),
    ),
    verificationStatus: question.verification_status,
    publicationStatus: question.publication_status,
  } as EditableQuestion;
}

export async function updateQuestion(
  actorId: string,
  questionId: string,
  input: QuestionAuthoringInput,
) {
  const admin = createSupabaseAdminClient();
  const { data: current } = await admin
    .from("questions")
    .select("id, version, verification_status, publication_status")
    .eq("id", questionId)
    .eq("module", "core")
    .is("deleted_at", null)
    .maybeSingle();
  if (
    !current ||
    !canAdminEditQuestion(
      current.verification_status,
      current.publication_status,
    )
  ) {
    throw new Error(
      "Only draft, rejected, or currently published questions can be edited.",
    );
  }
  const isPublishedCorrection = current.publication_status === "published";
  if (!isPublishedCorrection && input.intent === "correction") {
    throw new Error("Correction mode is only available for published questions.");
  }

  const { data: options } = await admin
    .from("question_options")
    .select("id, label, sort_order")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: true });
  if (!options || options.length !== 4) {
    throw new Error("This question does not have four editable options.");
  }

  const nextVersion = Number(current.version) + 1;
  const structuredData = input.structuredData
    ? (JSON.parse(input.structuredData) as Record<string, unknown>)
    : {};
  const { data: updated, error: updateError } = await admin
    .from("questions")
    .update({
      module: input.module,
      question_type: input.questionType,
      subject: input.subject,
      topic: input.topic,
      subtopic: input.subtopic,
      difficulty: input.difficulty,
      question_text: input.questionText,
      passage: input.passage,
      code: input.code,
      formula: input.formula,
      structured_data: structuredData,
      image_url: input.imageUrl,
      explanation: input.explanation,
      estimated_time_seconds: input.estimatedTimeSeconds,
      source_type: input.sourceType,
      correct_option_id: options[input.correctOptionIndex].id,
      verification_status:
        isPublishedCorrection
          ? current.verification_status
          : input.intent === "review"
            ? "under_review"
            : "draft",
      version: nextVersion,
      updated_by: actorId,
    })
    .eq("id", questionId)
    .select("*")
    .single();
  if (updateError || !updated) throw new Error("Unable to update this question.");

  const updatedOptions = await Promise.all(
    options.map((option, index) =>
      admin
        .from("question_options")
        .update({ content: input.options[index] })
        .eq("id", option.id)
        .select("*")
        .single(),
    ),
  );
  if (updatedOptions.some((result) => result.error)) {
    throw new Error("Question updated, but one or more options could not be saved.");
  }
  const optionRows = updatedOptions.flatMap((result) =>
    result.data ? [result.data] : [],
  );
  const { error: versionError } = await admin.from("question_versions").insert({
    question_id: questionId,
    version: nextVersion,
    snapshot: questionSnapshot(updated, optionRows),
    change_summary:
      isPublishedCorrection
        ? "Published question corrected by an administrator."
        : input.intent === "review"
        ? "Question updated and resubmitted for review."
        : "Question draft updated.",
    changed_by: actorId,
  });
  if (versionError) throw new Error("Question updated, but versioning failed.");

  await writeAudit(actorId, "question.updated", questionId, {
    version: nextVersion,
    verification_status: updated.verification_status,
    publication_status: updated.publication_status,
    correction: isPublishedCorrection,
  });
  return {
    id: questionId,
    status: updated.verification_status as string,
    version: nextVersion,
    wasPublished: isPublishedCorrection,
  };
}

export async function getReviewQueue(
  includeAdminStates: boolean,
): Promise<ReviewQueueQuestion[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("questions")
    .select(
      "id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, explanation, correct_option_id, verification_status, publication_status, version, created_at, source_type, structured_data, metadata",
    )
    .eq("module", "core")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  query = includeAdminStates
    ? query.in("verification_status", ["draft", "under_review", "approved", "rejected"])
    : query.eq("verification_status", "under_review");

  const { data: questionData, error } = await query;
  if (error) throw new Error("Unable to load the question review queue.");
  const questions = questionData ?? [];
  const ids = questions.map((question) => question.id);
  const { data: optionData } = ids.length
    ? await admin
        .from("question_options")
        .select("id, question_id, label, content, sort_order")
        .in("question_id", ids)
        .order("sort_order", { ascending: true })
    : { data: [] };
  const options = optionData ?? [];

  return questions.map((question) => ({
    id: question.id,
    module: question.module,
    questionType: question.question_type,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    questionText: question.question_text,
    passage: question.passage,
    code: question.code,
    formula: question.formula,
    sourceType: question.source_type,
    structuredData: question.structured_data,
    metadata: question.metadata,
    explanation: question.explanation,
    correctOptionId: question.correct_option_id,
    verificationStatus: question.verification_status,
    publicationStatus: question.publication_status,
    version: question.version,
    createdAt: question.created_at,
    options: options
      .filter((option) => option.question_id === question.id)
      .map((option) => ({
        id: option.id,
        label: option.label,
        content: option.content,
      })),
  })) as ReviewQueueQuestion[];
}

export async function reviewQuestion(
  actorId: string,
  input: {
    questionId: string;
    decision: "approved" | "rejected" | "changes_requested";
    comments: string | null;
  },
) {
  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("questions")
    .select("id, verification_status")
    .eq("id", input.questionId)
    .eq("module", "core")
    .is("deleted_at", null)
    .maybeSingle();
  if (!question || question.verification_status !== "under_review") {
    throw new Error("Only questions under review can receive a decision.");
  }

  const verificationStatus =
    input.decision === "approved"
      ? "approved"
      : input.decision === "rejected"
        ? "rejected"
        : "draft";
  const { error: reviewError } = await admin.from("question_reviews").insert({
    question_id: input.questionId,
    reviewer_id: actorId,
    decision: input.decision,
    comments: input.comments,
  });
  if (reviewError) throw new Error("Unable to record the review decision.");

  const { error: updateError } = await admin
    .from("questions")
    .update({
      verification_status: verificationStatus,
      updated_by: actorId,
    })
    .eq("id", input.questionId);
  if (updateError) throw new Error("Unable to update the question status.");

  await writeAudit(actorId, `question.review.${input.decision}`, input.questionId, {
    comments: input.comments,
  });
}

export async function softDeleteQuestion(
  actorId: string,
  questionId: string,
): Promise<{ status: "deleted" | "already_deleted" }> {
  const admin = createSupabaseAdminClient();
  const { data: question, error: loadError } = await admin
    .from("questions")
    .select("id, deleted_at")
    .eq("id", questionId)
    .eq("module", "core")
    .maybeSingle();
  if (loadError) throw new Error("Could not delete this question. Try again.");
  if (!question) throw new Error("Question not found.");
  if (question.deleted_at) return { status: "already_deleted" };

  const deletedAt = new Date().toISOString();
  const { data: deleted, error: deleteError } = await admin
    .from("questions")
    .update({
      deleted_at: deletedAt,
      deleted_by: actorId,
      publication_status: "retired",
      retired_at: deletedAt,
      updated_by: actorId,
    })
    .eq("id", questionId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (deleteError) throw new Error("Could not delete this question. Try again.");
  if (!deleted) return { status: "already_deleted" };

  await writeAudit(actorId, "question.deleted", questionId, {
    deletion: "soft",
    deleted_at: deletedAt,
  });
  return { status: "deleted" };
}
