import "server-only";

import type {
  BookmarkQuestion,
  MistakeQuestion,
} from "@/lib/learning/schemas";
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
  input: { questionId: string; note: string; isUnderstood: boolean },
) {
  const admin = createSupabaseAdminClient();
  const { data: attempts } = await admin
    .from("test_attempts")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["submitted", "auto_submitted"]);
  const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
  const { data: incorrectResponse } = attemptIds.length
    ? await admin
        .from("user_responses")
        .select("id")
        .in("attempt_id", attemptIds)
        .eq("question_id", input.questionId)
        .eq("is_correct", false)
        .eq("response_status", "answered")
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!incorrectResponse) {
    throw new Error("This question is not part of your mistake history.");
  }

  const { error } = await admin.from("mistake_notebook_entries").upsert(
    {
      user_id: userId,
      question_id: input.questionId,
      note: input.note,
      is_understood: input.isUnderstood,
      understood_at: input.isUnderstood ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,question_id" },
  );

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

export async function getMistakes(userId: string): Promise<MistakeQuestion[]> {
  const admin = createSupabaseAdminClient();
  const { data: attemptData, error: attemptError } = await admin
    .from("test_attempts")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["submitted", "auto_submitted"]);

  if (attemptError) throw new Error("Unable to load your mistake history.");
  const attemptIds = (attemptData ?? []).map((attempt) => attempt.id);
  if (!attemptIds.length) return [];

  const { data: responseData, error: responseError } = await admin
    .from("user_responses")
    .select("question_id, selected_option_id, answered_at, created_at")
    .in("attempt_id", attemptIds)
    .not("question_id", "is", null)
    .eq("is_correct", false)
    .eq("response_status", "answered")
    .order("answered_at", { ascending: false })
    .limit(1000);

  if (responseError) throw new Error("Unable to load incorrect responses.");
  const responses = responseData ?? [];
  const grouped = new Map<
    string,
    {
      count: number;
      selectedOptionId: string | null;
      lastIncorrectAt: string | null;
    }
  >();

  for (const response of responses) {
    const current = grouped.get(response.question_id);
    if (current) {
      current.count += 1;
    } else {
      grouped.set(response.question_id, {
        count: 1,
        selectedOptionId: response.selected_option_id,
        lastIncorrectAt: response.answered_at ?? response.created_at,
      });
    }
  }

  const questionIds = [...grouped.keys()];
  const [
    { data: questionData, error: questionError },
    { data: optionData },
    { data: entryData, error: entryError },
    { data: bookmarkData, error: bookmarkError },
  ] = await Promise.all([
    admin
      .from("questions")
      .select(
        "id, module, question_type, topic, subtopic, difficulty, question_text, correct_option_id, explanation",
      )
      .in("id", questionIds)
      .eq("module", "core"),
    admin
      .from("question_options")
      .select("id, question_id, label, content, sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true }),
    admin
      .from("mistake_notebook_entries")
      .select("question_id, note, is_understood")
      .eq("user_id", userId)
      .in("question_id", questionIds),
    admin
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", questionIds),
  ]);

  if (questionError) throw new Error("Unable to load mistake questions.");
  if (entryError) {
    throw new Error(
      "Mistake notebook state is unavailable. Apply the Phase 7 migration first.",
    );
  }
  if (bookmarkError) throw new Error("Unable to load bookmark state.");
  const questions = (questionData ?? []) as LearningQuestionRow[];
  const options = (optionData ?? []) as OptionRow[];
  const entryByQuestion = new Map(
    (entryData ?? []).map((entry) => [entry.question_id, entry]),
  );
  const bookmarked = new Set(
    (bookmarkData ?? []).map((bookmark) => bookmark.question_id),
  );

  return questions.flatMap((question) => {
    const history = grouped.get(question.id);
    if (!history || !question.correct_option_id || !question.explanation) return [];
    const entry = entryByQuestion.get(question.id);
    return [
      {
        id: question.id,
        module: question.module,
        questionType: question.question_type,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        questionText: question.question_text,
        options: options
          .filter((option) => option.question_id === question.id)
          .map((option) => ({
            id: option.id,
            label: option.label,
            content: option.content,
          })),
        selectedOptionId: history.selectedOptionId,
        correctOptionId: question.correct_option_id,
        explanation: question.explanation,
        occurrenceCount: history.count,
        lastIncorrectAt: history.lastIncorrectAt,
        note: entry?.note ?? "",
        isUnderstood: entry?.is_understood ?? false,
        isBookmarked: bookmarked.has(question.id),
      },
    ];
  });
}
