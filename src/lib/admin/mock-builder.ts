import type { AdminQuestionBankItem } from "./test-schemas";
import { seededShuffle } from "@/lib/tests/randomization";
import { SMART_FILL_MAX_QUESTION_COUNT } from "./test-schemas";

export type MockQuestionFilters = {
  module: "core" | null;
  sectionType: AdminQuestionBankItem["questionType"] | "mixed";
  questionType: AdminQuestionBankItem["questionType"] | "all";
  difficulty: AdminQuestionBankItem["difficulty"] | "all";
  search: string;
};

export function filterMockQuestions(
  questions: readonly AdminQuestionBankItem[],
  filters: MockQuestionFilters,
) {
  const search = filters.search.trim().toLowerCase();
  return questions.filter((question) =>
    (!filters.module || question.module === filters.module) &&
    (filters.sectionType === "mixed" || question.questionType === filters.sectionType) &&
    (filters.questionType === "all" || question.questionType === filters.questionType) &&
    (filters.difficulty === "all" || question.difficulty === filters.difficulty) &&
    (!search || `${question.id} ${question.questionText} ${question.topic} ${question.subtopic ?? ""}`.toLowerCase().includes(search)),
  );
}

export function summarizeMockComposition(questions: readonly AdminQuestionBankItem[]) {
  return {
    difficulty: {
      easy: questions.filter((question) => question.difficulty === "easy").length,
      medium: questions.filter((question) => question.difficulty === "medium").length,
      hard: questions.filter((question) => question.difficulty === "hard").length,
    },
    questionType: {
      figure_sequence: questions.filter((question) => question.questionType === "figure_sequence").length,
      mathematical_equation: questions.filter((question) => question.questionType === "mathematical_equation").length,
      latin_square: questions.filter((question) => question.questionType === "latin_square").length,
    },
  };
}

export type SmartFillOptions = {
  questionType: AdminQuestionBankItem["questionType"];
  difficulty: AdminQuestionBankItem["difficulty"];
  count: number;
  excludedQuestionIds: ReadonlySet<string>;
  allowPublishedFocusedReuse: boolean;
  seed: string;
};

export type SmartFillTargetState =
  | { status: "invalid"; message: string }
  | { status: "at_target"; targetCount: number; currentCount: number }
  | {
      status: "above_target";
      targetCount: number;
      currentCount: number;
      excessCount: number;
    }
  | {
      status: "needs_questions";
      targetCount: number;
      currentCount: number;
      additionalCount: number;
    };

export function getSmartFillTargetState(
  targetValue: string | number,
  currentCount: number,
): SmartFillTargetState {
  if (
    (typeof targetValue === "string" && targetValue.trim() === "") ||
    !Number.isFinite(Number(targetValue)) ||
    !Number.isInteger(Number(targetValue)) ||
    Number(targetValue) < 1 ||
    Number(targetValue) > SMART_FILL_MAX_QUESTION_COUNT
  ) {
    return {
      status: "invalid",
      message: `Enter a whole number between 1 and ${SMART_FILL_MAX_QUESTION_COUNT}.`,
    };
  }
  const targetCount = Number(targetValue);
  if (currentCount === targetCount) {
    return { status: "at_target", targetCount, currentCount };
  }
  if (currentCount > targetCount) {
    return {
      status: "above_target",
      targetCount,
      currentCount,
      excessCount: currentCount - targetCount,
    };
  }
  return {
    status: "needs_questions",
    targetCount,
    currentCount,
    additionalCount: targetCount - currentCount,
  };
}

export type SmartFillResult =
  | {
      status: "selected";
      questions: AdminQuestionBankItem[];
      unusedAvailable: number;
      totalAvailable: number;
      reusedPublishedCount: number;
    }
  | {
      status: "insufficient";
      questions: [];
      unusedAvailable: number;
      totalAvailable: number;
      required: number;
    };

function structurallyDiverseOrder(
  questions: readonly AdminQuestionBankItem[],
  seed: string,
) {
  const families = new Map<string, AdminQuestionBankItem[]>();
  seededShuffle([...questions], seed).forEach((question) => {
    const family = question.selectionFamily ?? `question:${question.id}`;
    const group = families.get(family) ?? [];
    group.push(question);
    families.set(family, group);
  });

  const groups = seededShuffle([...families.values()], `${seed}:families`);
  const ordered: AdminQuestionBankItem[] = [];
  while (groups.some((group) => group.length > 0)) {
    groups.forEach((group) => {
      const next = group.shift();
      if (next) ordered.push(next);
    });
  }
  return ordered;
}

export function getSmartFillAvailability(
  questions: readonly AdminQuestionBankItem[],
  options: Pick<SmartFillOptions, "questionType" | "difficulty" | "excludedQuestionIds">,
) {
  const matching = questions.filter(
    (question) =>
      question.questionType === options.questionType &&
      question.difficulty === options.difficulty &&
      !options.excludedQuestionIds.has(question.id),
  );
  const unused = matching.filter(
    (question) => !question.usedInPublishedFocusedMock,
  );
  return {
    unusedAvailable: unused.length,
    totalAvailable: matching.length,
  };
}

export function selectSmartFillQuestions(
  questions: readonly AdminQuestionBankItem[],
  options: SmartFillOptions,
): SmartFillResult {
  const matching = questions.filter(
    (question) =>
      question.questionType === options.questionType &&
      question.difficulty === options.difficulty &&
      !options.excludedQuestionIds.has(question.id),
  );
  const unused = matching.filter(
    (question) => !question.usedInPublishedFocusedMock,
  );
  const protectedQuestions = matching.filter(
    (question) => question.usedInPublishedFocusedMock,
  );
  const available = options.allowPublishedFocusedReuse
    ? matching.length
    : unused.length;

  if (available < options.count) {
    return {
      status: "insufficient",
      questions: [],
      unusedAvailable: unused.length,
      totalAvailable: matching.length,
      required: options.count,
    };
  }

  const ordered = [
    ...structurallyDiverseOrder(unused, `${options.seed}:unused`),
    ...(options.allowPublishedFocusedReuse
      ? structurallyDiverseOrder(protectedQuestions, `${options.seed}:reused`)
      : []),
  ];
  const selected = ordered.slice(0, options.count);
  return {
    status: "selected",
    questions: selected,
    unusedAvailable: unused.length,
    totalAvailable: matching.length,
    reusedPublishedCount: selected.filter(
      (question) => question.usedInPublishedFocusedMock,
    ).length,
  };
}
