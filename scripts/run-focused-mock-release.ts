import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type QuestionType =
  | "figure_sequence"
  | "mathematical_equation"
  | "latin_square";
type Difficulty = "easy" | "medium" | "hard";

type FocusedMockConfig = {
  title: string;
  description: string;
  questionType: QuestionType;
  difficulty: Difficulty;
};

type SelectedPlan = FocusedMockConfig & {
  questionIds: string[];
  eligible: number;
  alreadyUsed: number;
  unused: number;
  uniqueFingerprints: number;
  uniqueStructuralProfiles: number;
  largestStructuralProfileCount: number;
  knownFamilyCount: number;
  uniqueFamilies: number;
  largestFamilyCount: number;
};

const TARGET_COUNT = 20;
const DURATION_SECONDS = 25 * 60;
const publishRequested = process.argv.includes("--publish");

const configs: FocusedMockConfig[] = [
  {
    title: "Figure Sequences \u2014 Easy",
    description:
      "Build confidence with 20 approachable Figure Sequence questions in a timed sectional mock.",
    questionType: "figure_sequence",
    difficulty: "easy",
  },
  {
    title: "Figure Sequences \u2014 Medium",
    description:
      "Test your pattern-recognition skills with 20 intermediate Figure Sequence questions.",
    questionType: "figure_sequence",
    difficulty: "medium",
  },
  {
    title: "Figure Sequences \u2014 Hard",
    description:
      "Challenge yourself with 20 advanced Figure Sequence questions designed to test deeper pattern recognition.",
    questionType: "figure_sequence",
    difficulty: "hard",
  },
  {
    title: "Mathematical Equations \u2014 Easy",
    description:
      "Build confidence with 20 approachable Mathematical Equation questions in a timed sectional mock.",
    questionType: "mathematical_equation",
    difficulty: "easy",
  },
  {
    title: "Mathematical Equations \u2014 Medium",
    description:
      "Test your symbol-reasoning skills with 20 intermediate Mathematical Equation questions.",
    questionType: "mathematical_equation",
    difficulty: "medium",
  },
  {
    title: "Mathematical Equations \u2014 Hard",
    description:
      "Challenge yourself with 20 advanced Mathematical Equation questions designed to test deeper symbolic reasoning.",
    questionType: "mathematical_equation",
    difficulty: "hard",
  },
  {
    title: "Latin Squares \u2014 Easy",
    description:
      "Build confidence with 20 approachable Latin Square questions in a timed sectional mock.",
    questionType: "latin_square",
    difficulty: "easy",
  },
  {
    title: "Latin Squares \u2014 Medium",
    description:
      "Test your grid-reasoning skills with 20 intermediate Latin Square questions.",
    questionType: "latin_square",
    difficulty: "medium",
  },
  {
    title: "Latin Squares \u2014 Hard",
    description:
      "Challenge yourself with 20 advanced Latin Square questions designed to test deeper logical elimination.",
    questionType: "latin_square",
    difficulty: "hard",
  },
];

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const {
  getAdminQuestionBank,
  saveAdminTest,
  selectAdminSmartFillQuestions,
  updateAdminTestPublication,
} = await import("@/lib/admin/test-data");
const { evaluatePublication } = await import("@/lib/admin/publishing-policy");
const { adminTestBuilderSchema } = await import("@/lib/admin/test-schemas");
const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
const { getTestCatalog, getTestOverview } = await import("@/lib/tests/data");

const admin = createSupabaseAdminClient();
const { data: adminRoles, error: adminRoleError } = await admin
  .from("user_roles")
  .select("user_id")
  .eq("role", "admin");
if (adminRoleError || adminRoles?.length !== 1) {
  throw new Error(
    `Focused-mock release requires exactly one unambiguous Admin actor; found ${adminRoles?.length ?? 0}.`,
  );
}
const actorId = adminRoles[0].user_id;

const titles = configs.map((config) => config.title);
const { data: existingMocks, error: existingMockError } = await admin
  .from("tests")
  .select("id, title, is_published")
  .in("title", titles);
if (existingMockError) throw new Error("Unable to check existing focused mocks.");
if (existingMocks?.length) {
  throw new Error(
    `Release stopped because ${existingMocks.length} target title${existingMocks.length === 1 ? " already exists" : "s already exist"}.`,
  );
}

const questionBank = await getAdminQuestionBank();
const questionById = new Map(
  questionBank.map((question) => [question.id, question]),
);
const selectedPlans: SelectedPlan[] = [];
const allSelectedIds: string[] = [];

for (const config of configs) {
  const eligibleQuestions = questionBank.filter(
    (question) =>
      question.questionType === config.questionType &&
      question.difficulty === config.difficulty,
  );
  const alreadyUsed = eligibleQuestions.filter(
    (question) => question.usedInPublishedFocusedMock,
  ).length;
  const result = await selectAdminSmartFillQuestions({
    questionType: config.questionType,
    difficulty: config.difficulty,
    targetCount: TARGET_COUNT,
    existingQuestionIds: [],
    otherQuestionIds: allSelectedIds,
    allowPublishedFocusedReuse: false,
    mode: "fill",
    seed: `focused-catalog-v1:${config.questionType}:${config.difficulty}`,
  });
  if (result.status !== "selected") {
    throw new Error(`${config.title} is blocked: ${result.message}`);
  }
  allSelectedIds.push(...result.questionIds);
  selectedPlans.push({
    ...config,
    questionIds: result.questionIds,
    eligible: eligibleQuestions.length,
    alreadyUsed,
    unused: eligibleQuestions.length - alreadyUsed,
    uniqueFingerprints: 0,
    uniqueStructuralProfiles: 0,
    largestStructuralProfileCount: 0,
    knownFamilyCount: 0,
    uniqueFamilies: 0,
    largestFamilyCount: 0,
  });
}

if (
  allSelectedIds.length !== configs.length * TARGET_COUNT ||
  new Set(allSelectedIds).size !== allSelectedIds.length
) {
  throw new Error("The planned focused mocks do not contain 180 unique question IDs.");
}

const { data: selectedQuestions, error: selectedQuestionError } = await admin
  .from("questions")
  .select(
    "id, module, question_type, difficulty, verification_status, publication_status, deleted_at, explanation, source_type, correct_option_id, structured_data, metadata",
  )
  .in("id", allSelectedIds);
if (
  selectedQuestionError ||
  !selectedQuestions ||
  selectedQuestions.length !== allSelectedIds.length
) {
  throw new Error("Unable to review every selected question before publication.");
}

const { data: selectedOptions, error: selectedOptionError } = await admin
  .from("question_options")
  .select("id, question_id")
  .in("question_id", allSelectedIds);
if (selectedOptionError) {
  throw new Error("Unable to review selected conventional answer options.");
}
const optionsByQuestion = new Map<string, string[]>();
(selectedOptions ?? []).forEach((option) => {
  const ids = optionsByQuestion.get(option.question_id) ?? [];
  ids.push(option.id);
  optionsByQuestion.set(option.question_id, ids);
});
const selectedQuestionById = new Map(
  selectedQuestions.map((question) => [question.id, question]),
);

for (const plan of selectedPlans) {
  const fingerprints = new Set<string>();
  const structuralProfileCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  for (const questionId of plan.questionIds) {
    const question = selectedQuestionById.get(questionId);
    const bankQuestion = questionById.get(questionId);
    if (
      !question ||
      !bankQuestion ||
      question.module !== "core" ||
      question.question_type !== plan.questionType ||
      question.difficulty !== plan.difficulty ||
      question.verification_status !== "approved" ||
      question.publication_status !== "published" ||
      question.deleted_at !== null ||
      typeof question.explanation !== "string" ||
      question.explanation.trim().length < 10
    ) {
      throw new Error(`${plan.title} contains an ineligible or incomplete question.`);
    }

    const optionIds = optionsByQuestion.get(questionId) ?? [];
    const decision = evaluatePublication({
      verificationStatus: question.verification_status,
      questionType: question.question_type,
      sourceType: question.source_type,
      optionCount: optionIds.length,
      correctOptionId: question.correct_option_id,
      structuredData: question.structured_data,
      metadata: question.metadata,
    });
    if (!decision.allowed) {
      throw new Error(`${plan.title} contains a question that no longer passes publication rules: ${decision.reason}`);
    }
    if (
      question.source_type !== "generated" &&
      !optionIds.includes(question.correct_option_id ?? "")
    ) {
      throw new Error(`${plan.title} contains an invalid conventional answer key.`);
    }

    const metadata = record(question.metadata);
    const generation = record(metadata?.generation);
    if (question.source_type === "generated") {
      if (
        metadata?.correctAnswer === undefined ||
        typeof generation?.fingerprint !== "string"
      ) {
        throw new Error(`${plan.title} contains incomplete generated answer provenance.`);
      }
      fingerprints.add(generation.fingerprint);
      const structuralProfile = generation.structuralProfile;
      if (record(structuralProfile)) {
        const signature = JSON.stringify(structuralProfile);
        structuralProfileCounts.set(
          signature,
          (structuralProfileCounts.get(signature) ?? 0) + 1,
        );
      }
    }
    const family = bankQuestion.selectionFamily;
    if (family) familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }
  const knownFamilyCount = [...familyCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const largestFamilyCount = Math.max(0, ...familyCounts.values());
  const largestStructuralProfileCount = Math.max(
    0,
    ...structuralProfileCounts.values(),
  );
  if (fingerprints.size && fingerprints.size !== plan.questionIds.length) {
    throw new Error(`${plan.title} contains duplicate generated fingerprints.`);
  }
  if (knownFamilyCount > 1 && (familyCounts.size < 2 || largestFamilyCount > 10)) {
    throw new Error(`${plan.title} has excessive structural-family concentration.`);
  }
  plan.uniqueFingerprints = fingerprints.size;
  plan.uniqueStructuralProfiles = structuralProfileCounts.size;
  plan.largestStructuralProfileCount = largestStructuralProfileCount;
  plan.knownFamilyCount = knownFamilyCount;
  plan.uniqueFamilies = familyCounts.size;
  plan.largestFamilyCount = largestFamilyCount;
}

const report = selectedPlans.map((plan) => ({
  mock: plan.title,
  status: "READY",
  eligibleInventory: plan.eligible,
  alreadyUsed: plan.alreadyUsed,
  unusedInventoryBeforeSelection: plan.unused,
  questionsSelected: plan.questionIds.length,
  difficulty: plan.difficulty,
  durationMinutes: DURATION_SECONDS / 60,
  uniqueFingerprints: plan.uniqueFingerprints,
  uniqueStructuralProfiles: plan.uniqueStructuralProfiles,
  largestStructuralProfileCount: plan.largestStructuralProfileCount,
  knownFamilyCount: plan.knownFamilyCount,
  uniqueFamilies: plan.uniqueFamilies,
  largestFamilyCount: plan.largestFamilyCount,
  published: false,
}));

if (!publishRequested) {
  console.log(JSON.stringify({ mode: "dry-run", report }, null, 2));
  process.exit(0);
}

const publishedIds = new Map<string, string>();
for (const plan of selectedPlans) {
  const input = adminTestBuilderSchema.parse({
    title: plan.title,
    description: plan.description,
    testType: "sectional",
    module: "core",
    instructions:
      "Answer all 20 questions within 25 minutes. Feedback and explanations are available after submission.",
    isPremium: false,
    randomizeQuestions: true,
    randomizeOptions: true,
    intent: "draft",
    sections: [
      {
        title: plan.title,
        module: "core",
        sectionType: plan.questionType,
        durationSeconds: DURATION_SECONDS,
        focusDifficulty: plan.difficulty,
        questionIds: plan.questionIds,
      },
    ],
  });
  const saved = await saveAdminTest(actorId, input);
  await updateAdminTestPublication(actorId, saved.id, "publish");
  publishedIds.set(plan.title, saved.id);
}

const catalog = await getTestCatalog(actorId);
for (const plan of selectedPlans) {
  const testId = publishedIds.get(plan.title);
  const catalogItem = catalog.find((item) => item.id === testId);
  const overview = testId ? await getTestOverview(actorId, testId) : null;
  if (
    !testId ||
    !catalogItem ||
    !overview ||
    catalogItem.moduleType !== plan.questionType ||
    catalogItem.testType !== "sectional" ||
    catalogItem.sectionCount !== 1 ||
    catalogItem.questionCount !== TARGET_COUNT ||
    catalogItem.durationSeconds !== DURATION_SECONDS ||
    overview.questionCount !== TARGET_COUNT ||
    overview.durationSeconds !== DURATION_SECONDS
  ) {
    throw new Error(`${plan.title} failed post-publication catalog verification.`);
  }
  const reportItem = report.find((item) => item.mock === plan.title);
  if (reportItem) reportItem.published = true;
}

console.log(JSON.stringify({
  mode: "published",
  report,
  crossMockDuplicateCount:
    allSelectedIds.length - new Set(allSelectedIds).size,
  reuseOverrideUsed: false,
}, null, 2));
