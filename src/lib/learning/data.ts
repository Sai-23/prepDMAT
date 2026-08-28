import "server-only";

import type {
  BookmarkQuestion,
  MistakeQuestion,
  MistakeSource,
  MistakeSourceKind,
} from "@/lib/learning/schemas";
import type { PrivatePracticeSnapshot } from "@/lib/practice/native";
import type {
  PracticeAnswer,
  PracticeQuestion,
} from "@/lib/practice/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LearningQuestionRow = {
  id: string;
  module: BookmarkQuestion["module"];
  question_type: BookmarkQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: BookmarkQuestion["difficulty"];
  question_text: string;
  correct_option_id?: string | null;
  explanation?: string;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  content: string;
  sort_order: number;
};

export type MistakeFilters = {
  status?: "needs_review" | "understood" | "all";
  module?: PracticeQuestion["questionType"] | "all";
  difficulty?: PracticeQuestion["difficulty"] | "all";
  source?: MistakeSource | "all";
  page?: number;
};

export type MistakePage = {
  items: MistakeQuestion[];
  page: number;
  pageSize: number;
  total: number;
  historyTotal: number;
};

type NotebookEntryRow = {
  question_id: string | null;
  practice_session_item_id: string | null;
  practice_attempt_item_id: string | null;
  note: string;
  is_understood: boolean;
};

function notebookKey(kind: MistakeSourceKind, id: string) {
  return `${kind}:${id}`;
}

function describeAnswer(question: PracticeQuestion, value: unknown): string {
  const answer = value as PracticeAnswer | null;
  if (!answer) return "No answer recorded";
  if (answer.kind === "single_choice") {
    const option = question.options.find((item) => item.id === answer.optionId);
    return option ? `${option.label}. ${option.content}` : answer.optionId;
  }
  if (answer.kind === "symbol_assignment") {
    return Object.entries(answer.values)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([symbol, number]) => `${symbol} = ${number}`)
      .join(", ");
  }
  return answer.optionIds
    .map((id) => {
      const option = question.options.find((item) => item.id === id);
      return option ? `${option.label}. ${option.content}` : id;
    })
    .join("; ");
}

function describeCorrectAnswer(
  question: PracticeQuestion,
  correctAnswer: unknown,
): string {
  if (typeof correctAnswer === "string") {
    const option = question.options.find((item) => item.id === correctAnswer);
    return option ? `${option.label}. ${option.content}` : correctAnswer;
  }
  if (Array.isArray(correctAnswer)) return correctAnswer.map(String).join("; ");
  if (correctAnswer && typeof correctAnswer === "object") {
    return Object.entries(correctAnswer as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key} = ${String(value)}`)
      .join(", ");
  }
  return "Answer unavailable";
}

function entryFor(
  entries: Map<string, NotebookEntryRow>,
  kind: MistakeSourceKind,
  id: string,
) {
  return entries.get(notebookKey(kind, id));
}

export async function setBookmark(
  userId: string,
  questionId: string,
  bookmarked: boolean,
) {
  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .eq("module", "core")
    .eq("verification_status", "approved")
    .eq("publication_status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (!question) throw new Error("This question is unavailable.");

  if (bookmarked) {
    const { error } = await admin
      .from("bookmarks")
      .upsert(
        { user_id: userId, question_id: questionId },
        { onConflict: "user_id,question_id" },
      );
    if (error) throw new Error("Unable to save this bookmark.");
  } else {
    const { error } = await admin
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("question_id", questionId);
    if (error) throw new Error("Unable to remove this bookmark.");
  }
}

export async function saveMistakeEntry(
  userId: string,
  input: {
    sourceKind: MistakeSourceKind;
    sourceId: string;
    note: string;
    isUnderstood: boolean;
  },
) {
  const admin = createSupabaseAdminClient();
  const now = input.isUnderstood ? new Date().toISOString() : null;
  const sourceColumn =
    input.sourceKind === "canonical_question"
      ? "question_id"
      : input.sourceKind === "practice_session_item"
        ? "practice_session_item_id"
        : "practice_attempt_item_id";

  if (input.sourceKind === "practice_session_item") {
    const { data: item } = await admin
      .from("practice_session_items")
      .select("session_id, is_correct, response_status")
      .eq("id", input.sourceId)
      .eq("is_correct", false)
      .eq("response_status", "answered")
      .maybeSingle();
    const { data: session } = item
      ? await admin
          .from("practice_sessions")
          .select("id")
          .eq("id", item.session_id)
          .eq("user_id", userId)
          .eq("status", "completed")
          .maybeSingle()
      : { data: null };
    if (!session) throw new Error("This item is not part of your mistake history.");
  } else {
    const { data: attempts } = await admin
      .from("test_attempts")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["submitted", "auto_submitted"]);
    const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
    let incorrectResponse = null;
    if (input.sourceKind === "canonical_question" && attemptIds.length) {
      const result = await admin
        .from("user_responses")
        .select("id")
        .in("attempt_id", attemptIds)
        .eq("question_id", input.sourceId)
        .eq("is_correct", false)
        .eq("response_status", "answered")
        .limit(1)
        .maybeSingle();
      incorrectResponse = result.data;
    } else if (attemptIds.length) {
      const { data: item } = await admin
        .from("practice_attempt_items")
        .select("attempt_id, question_key")
        .eq("id", input.sourceId)
        .in("attempt_id", attemptIds)
        .maybeSingle();
      if (item) {
        const result = await admin
          .from("user_responses")
          .select("id")
          .eq("attempt_id", item.attempt_id)
          .eq("question_key", item.question_key)
          .eq("is_correct", false)
          .eq("response_status", "answered")
          .maybeSingle();
        incorrectResponse = result.data;
      }
    }
    if (!incorrectResponse) {
      throw new Error("This item is not part of your mistake history.");
    }
  }

  const { data: existing } = await admin
    .from("mistake_notebook_entries")
    .select("id")
    .eq("user_id", userId)
    .eq(sourceColumn, input.sourceId)
    .maybeSingle();
  const mutation = existing
    ? admin
        .from("mistake_notebook_entries")
        .update({
          note: input.note,
          is_understood: input.isUnderstood,
          understood_at: now,
        })
        .eq("id", existing.id)
        .eq("user_id", userId)
    : admin.from("mistake_notebook_entries").insert({
        user_id: userId,
        question_id:
          input.sourceKind === "canonical_question" ? input.sourceId : null,
        practice_session_item_id:
          input.sourceKind === "practice_session_item" ? input.sourceId : null,
        practice_attempt_item_id:
          input.sourceKind === "mock_attempt_item" ? input.sourceId : null,
        note: input.note,
        is_understood: input.isUnderstood,
        understood_at: now,
      });
  const { error } = await mutation;

  if (error) {
    throw new Error(
      "Unable to save this notebook entry. Apply the Phase 7 migration first.",
    );
  }
}

export async function getBookmarks(userId: string): Promise<BookmarkQuestion[]> {
  const admin = createSupabaseAdminClient();
  const { data: bookmarkData, error } = await admin
    .from("bookmarks")
    .select("question_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load your bookmarks.");
  const bookmarks = bookmarkData ?? [];
  const questionIds = bookmarks.map((bookmark) => bookmark.question_id);
  if (!questionIds.length) return [];

  const { data: questionData, error: questionError } = await admin
    .from("questions")
    .select(
      "id, module, question_type, topic, subtopic, difficulty, question_text",
    )
    .in("id", questionIds)
    .eq("module", "core")
    .eq("verification_status", "approved")
    .eq("publication_status", "published")
    .is("deleted_at", null);

  if (questionError) throw new Error("Unable to load bookmarked questions.");
  const questionById = new Map(
    ((questionData ?? []) as LearningQuestionRow[]).map((question) => [
      question.id,
      question,
    ]),
  );

  return bookmarks.flatMap((bookmark) => {
    const question = questionById.get(bookmark.question_id);
    if (!question) return [];
    return [
      {
        id: question.id,
        module: question.module,
        questionType: question.question_type,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        questionText: question.question_text,
        bookmarkedAt: bookmark.created_at,
      },
    ];
  });
}

export async function getMistakes(
  userId: string,
  filters: MistakeFilters = {},
): Promise<MistakePage> {
  const admin = createSupabaseAdminClient();
  const [{ data: sessionData, error: sessionError }, { data: attemptData, error: attemptError }, { data: entryData, error: entryError }] =
    await Promise.all([
      admin
        .from("practice_sessions")
        .select("id, session_type, completed_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(500),
      admin
        .from("test_attempts")
        .select("id, submitted_at")
        .eq("user_id", userId)
        .in("status", ["submitted", "auto_submitted"])
        .order("submitted_at", { ascending: false })
        .limit(500),
      admin
        .from("mistake_notebook_entries")
        .select(
          "question_id, practice_session_item_id, practice_attempt_item_id, note, is_understood",
        )
        .eq("user_id", userId)
        .limit(2000),
    ]);

  if (sessionError || attemptError) throw new Error("Unable to load your mistake history.");
  if (entryError) {
    throw new Error(
      "Mistake notebook state is unavailable. Apply the latest migration first.",
    );
  }

  const entries = new Map<string, NotebookEntryRow>();
  for (const rawEntry of entryData ?? []) {
    const entry = rawEntry as NotebookEntryRow;
    if (entry.question_id) entries.set(notebookKey("canonical_question", entry.question_id), entry);
    if (entry.practice_session_item_id) entries.set(notebookKey("practice_session_item", entry.practice_session_item_id), entry);
    if (entry.practice_attempt_item_id) entries.set(notebookKey("mock_attempt_item", entry.practice_attempt_item_id), entry);
  }

  const sessionIds = (sessionData ?? []).map((session) => session.id);
  const attemptIds = (attemptData ?? []).map((attempt) => attempt.id);
  const [practiceResult, responseResult, mockItemResult] = await Promise.all([
    sessionIds.length
      ? admin
          .from("practice_session_items")
          .select(
            "id, session_id, source_question_id, public_snapshot, private_snapshot, response_payload, difficulty, answered_at",
          )
          .in("session_id", sessionIds)
          .eq("is_correct", false)
          .eq("response_status", "answered")
          .order("answered_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
    attemptIds.length
      ? admin
          .from("user_responses")
          .select(
            "attempt_id, question_id, question_key, selected_option_id, response_payload, answered_at, created_at",
          )
          .in("attempt_id", attemptIds)
          .eq("is_correct", false)
          .eq("response_status", "answered")
          .order("answered_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
    attemptIds.length
      ? admin
          .from("practice_attempt_items")
          .select(
            "id, attempt_id, source_question_id, question_key, public_snapshot, private_snapshot",
          )
          .in("attempt_id", attemptIds)
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (practiceResult.error || responseResult.error || mockItemResult.error) {
    throw new Error("Unable to load incorrect responses.");
  }

  const sessions = new Map(
    (sessionData ?? []).map((session) => [session.id, session]),
  );
  const mistakes: MistakeQuestion[] = [];
  const canonicalHistory = new Map<
    string,
    { count: number; selectedOptionId: string | null; lastIncorrectAt: string | null }
  >();

  for (const item of practiceResult.data ?? []) {
    const session = sessions.get(item.session_id);
    const question = item.public_snapshot as PracticeQuestion;
    const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
    if (!session || question.module !== "core") continue;
    const entry = entryFor(entries, "practice_session_item", item.id);
    const answer = item.response_payload as PracticeAnswer | null;
    mistakes.push({
      id: item.id,
      sourceKind: "practice_session_item",
      source: session.session_type === "diagnostic" ? "diagnostic" : "practice",
      sourceQuestionId: item.source_question_id,
      question,
      answer,
      correctAnswer: privateSnapshot.correctAnswer,
      answerText: describeAnswer(question, answer),
      correctAnswerText: describeCorrectAnswer(question, privateSnapshot.correctAnswer),
      explanation: privateSnapshot.explanation,
      occurrenceCount: 1,
      lastIncorrectAt: item.answered_at,
      note: entry?.note ?? "",
      isUnderstood: entry?.is_understood ?? false,
      isBookmarked: false,
    });
  }

  const mockItems = new Map(
    (mockItemResult.data ?? []).map((item) => [
      `${item.attempt_id}:${item.question_key}`,
      item,
    ]),
  );
  for (const response of responseResult.data ?? []) {
    const item = mockItems.get(`${response.attempt_id}:${response.question_key}`);
    if (!item) {
      if (!response.question_id) continue;
      const current = canonicalHistory.get(response.question_id);
      if (current) current.count += 1;
      else {
        canonicalHistory.set(response.question_id, {
          count: 1,
          selectedOptionId: response.selected_option_id,
          lastIncorrectAt: response.answered_at ?? response.created_at,
        });
      }
      continue;
    }
    const question = item.public_snapshot as PracticeQuestion;
    const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
    if (question.module !== "core") continue;
    const entry = entryFor(entries, "mock_attempt_item", item.id);
    const answer = response.response_payload ??
      (response.selected_option_id
        ? { kind: "single_choice", optionId: response.selected_option_id }
        : null);
    mistakes.push({
      id: item.id,
      sourceKind: "mock_attempt_item",
      source: "mock",
      sourceQuestionId: item.source_question_id,
      question,
      answer: answer as PracticeAnswer | null,
      correctAnswer: privateSnapshot.correctAnswer,
      answerText: describeAnswer(question, answer),
      correctAnswerText: describeCorrectAnswer(question, privateSnapshot.correctAnswer),
      explanation: privateSnapshot.explanation,
      occurrenceCount: 1,
      lastIncorrectAt: response.answered_at ?? response.created_at,
      note: entry?.note ?? "",
      isUnderstood: entry?.is_understood ?? false,
      isBookmarked: false,
    });
  }

  const canonicalIds = [...canonicalHistory.keys()];
  if (canonicalIds.length) {
    const [{ data: questionData, error: questionError }, { data: optionData }] =
      await Promise.all([
        admin
          .from("questions")
          .select(
            "id, module, question_type, topic, subtopic, difficulty, question_text, correct_option_id, explanation",
          )
          .in("id", canonicalIds)
          .eq("module", "core"),
        admin
          .from("question_options")
          .select("id, question_id, label, content, sort_order")
          .in("question_id", canonicalIds)
          .order("sort_order", { ascending: true }),
      ]);
    if (questionError) throw new Error("Unable to load mistake questions.");
    const options = (optionData ?? []) as OptionRow[];
    for (const rawQuestion of questionData ?? []) {
      const questionRow = rawQuestion as LearningQuestionRow;
      const history = canonicalHistory.get(questionRow.id);
      if (!history || !questionRow.correct_option_id || !questionRow.explanation) continue;
      const questionOptions = options
        .filter((option) => option.question_id === questionRow.id)
        .map(({ id, label, content }) => ({ id, label, content }));
      const question: PracticeQuestion = {
        id: questionRow.id,
        module: questionRow.module,
        questionType: questionRow.question_type,
        topic: questionRow.topic,
        subtopic: questionRow.subtopic,
        difficulty: questionRow.difficulty,
        questionText: questionRow.question_text,
        passage: null,
        code: null,
        formula: null,
        tableData: null,
        imageUrl: null,
        estimatedTimeSeconds: 0,
        options: questionOptions,
        response: { kind: "single_choice", options: questionOptions },
      };
      const entry = entryFor(entries, "canonical_question", questionRow.id);
      mistakes.push({
        id: questionRow.id,
        sourceKind: "canonical_question",
        source: "mock",
        sourceQuestionId: questionRow.id,
        question,
        answer: history.selectedOptionId
          ? { kind: "single_choice", optionId: history.selectedOptionId }
          : null,
        correctAnswer: questionRow.correct_option_id,
        answerText: describeAnswer(
          question,
          history.selectedOptionId
            ? { kind: "single_choice", optionId: history.selectedOptionId }
            : null,
        ),
        correctAnswerText: describeCorrectAnswer(question, questionRow.correct_option_id),
        explanation: questionRow.explanation,
        occurrenceCount: history.count,
        lastIncorrectAt: history.lastIncorrectAt,
        note: entry?.note ?? "",
        isUnderstood: entry?.is_understood ?? false,
        isBookmarked: false,
      });
    }
  }

  const sourceQuestionIds = [
    ...new Set(
      mistakes.flatMap((mistake) =>
        mistake.sourceQuestionId ? [mistake.sourceQuestionId] : [],
      ),
    ),
  ];
  if (sourceQuestionIds.length) {
    const { data: bookmarkData, error: bookmarkError } = await admin
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", sourceQuestionIds);
    if (bookmarkError) throw new Error("Unable to load bookmark state.");
    const bookmarked = new Set(
      (bookmarkData ?? []).map((bookmark) => bookmark.question_id),
    );
    mistakes.forEach((mistake) => {
      mistake.isBookmarked = mistake.sourceQuestionId
        ? bookmarked.has(mistake.sourceQuestionId)
        : false;
    });
  }

  const status = filters.status ?? "needs_review";
  const filtered = mistakes
    .filter((mistake) =>
      status === "all" ||
      (status === "understood" ? mistake.isUnderstood : !mistake.isUnderstood),
    )
    .filter((mistake) =>
      !filters.module || filters.module === "all"
        ? true
        : mistake.question.questionType === filters.module,
    )
    .filter((mistake) =>
      !filters.difficulty || filters.difficulty === "all"
        ? true
        : mistake.question.difficulty === filters.difficulty,
    )
    .filter((mistake) =>
      !filters.source || filters.source === "all"
        ? true
        : mistake.source === filters.source,
    )
    .sort((left, right) =>
      (right.lastIncorrectAt ?? "").localeCompare(left.lastIncorrectAt ?? ""),
    );
  const pageSize = 20;
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(requestedPage, maxPage);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: filtered.length,
    historyTotal: mistakes.length,
  };
}
