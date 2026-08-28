"use client";

import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  MinusCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { useId, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";

import { toggleBookmarkAction } from "@/app/learning/actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResultQuestion } from "@/lib/results/schemas";
import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import { PracticeAnswerFeedback } from "@/components/practice/practice-answer-feedback";
import { MathematicalEquationPracticeFeedback } from "@/components/practice/mathematical-equation-practice-feedback";
import { FigureSequencePracticeFeedback } from "@/components/practice/figure-sequence-practice-feedback";
import { LatinSquarePracticeFeedback } from "@/components/practice/latin-square-practice-feedback";
import type { FigureSequencePresentation } from "@/lib/generation/figure-sequences";
import type { MathematicalEquationStructuredData } from "@/lib/generation/mathematical-equations";
import type { LatinSquareStructuredData } from "@/lib/generation/latin-squares";
import type { MockQuestionAnalysis } from "@/lib/results/mock-analysis";
import { MODULE_LABELS } from "@/lib/progress/model";
import { coreSkill, type CoreSkillId } from "@/lib/progress/skills";
import { Button } from "@/components/ui/button";

type ReviewFilter = "all" | "correct" | "incorrect" | "unanswered" | "slow" | "fast_incorrect" | "marked";

export function ResultReview({
  questions,
  analysis = [],
}: {
  questions: ResultQuestion[];
  analysis?: MockQuestionAnalysis[];
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [skillFilter, setSkillFilter] = useState<CoreSkillId | "all">("all");
  const [bookmarked, setBookmarked] = useState(
    () =>
      new Set(
        questions
          .filter((question) => question.isBookmarked)
          .map((question) => question.id),
      ),
  );
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkPending, startBookmarkTransition] = useTransition();
  const counts: Record<ReviewFilter, number> = {
    all: questions.length,
    correct: questions.filter((question) => question.isCorrect).length,
    incorrect: questions.filter(
      (question) =>
        question.responseStatus === "answered" && !question.isCorrect,
    ).length,
    unanswered: questions.filter(
      (question) => question.responseStatus !== "answered",
    ).length,
    marked: questions.filter((question) => question.markedForReview).length,
    slow: analysis.filter((question) => question.timing === "slow_correct" || question.timing === "slow_incorrect").length,
    fast_incorrect: analysis.filter((question) => question.timing === "fast_incorrect").length,
  };
  const analysisById = new Map(analysis.map((question) => [question.questionId, question]));
  const availableSkills = [...new Set(questions.flatMap((question) => question.skillIds ?? []))]
    .map((id) => coreSkill(id)).filter(Boolean);
  const visibleQuestions = questions.filter((question) => {
    const timing = analysisById.get(question.id)?.timing;
    if (skillFilter !== "all" && !question.skillIds?.includes(skillFilter)) return false;
    if (filter === "correct") return question.isCorrect;
    if (filter === "incorrect") {
      return question.responseStatus === "answered" && !question.isCorrect;
    }
    if (filter === "unanswered") return question.responseStatus !== "answered";
    if (filter === "marked") return question.markedForReview;
    if (filter === "slow") return timing === "slow_correct" || timing === "slow_incorrect";
    if (filter === "fast_incorrect") return timing === "fast_incorrect";
    return true;
  });

  const toggleBookmark = (questionId: string) => {
    const nextValue = !bookmarked.has(questionId);
    setBookmarkError(null);
    startBookmarkTransition(async () => {
      const response = await toggleBookmarkAction({
        questionId,
        bookmarked: nextValue,
      });
      if (response.error) {
        setBookmarkError(response.error);
        return;
      }
      setBookmarked((current) => {
        const next = new Set(current);
        if (nextValue) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Question status and timing filters">
        {(["all", "incorrect", "unanswered", "correct", "slow", "fast_incorrect", "marked"] as const).map(
          (value) => (
            <button
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-lowest text-on-surface-variant ring-1 ring-workspace-border hover:bg-surface-low",
              ].join(" ")}
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              type="button"
            >
              {value === "fast_incorrect" ? "Fast incorrect" : value.charAt(0).toUpperCase() + value.slice(1)} ({counts[value]})
            </button>
          ),
        )}
      </div>
      {availableSkills.length ? <label className="flex items-center gap-2 text-sm font-medium"><span>Skill</span><select className="min-h-10 rounded-md border border-input-border bg-input-background px-3 text-on-surface" onChange={(event) => setSkillFilter(event.target.value as CoreSkillId | "all")} value={skillFilter}><option value="all">All skills</option>{availableSkills.map((skill) => skill ? <option key={skill.id} value={skill.id}>{skill.label}</option> : null)}</select></label> : null}
      </div>

      {bookmarkError ? (
        <p className="rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
          {bookmarkError}
        </p>
      ) : null}

      {visibleQuestions.length ? (
        visibleQuestions.map((question) => {
          const questionAnalysis = analysisById.get(question.id);
          const unanswered = question.responseStatus !== "answered";
          const selectedOption = question.options.find(
            (option) => option.id === question.selectedOptionId,
          );
          const correctOption = question.options.find(
            (option) => option.id === question.correctOptionId,
          );
          const equationReview =
            question.questionType === "mathematical_equation" &&
            question.response?.kind === "symbol_assignment";
          const equationAnswer = question.answer?.kind === "symbol_assignment"
            ? question.answer.values
            : {};
          const figureReview = question.questionType === "figure_sequence" &&
            question.response?.kind === "two_stage_single_choice";
          const figureAnswer = question.answer?.kind === "two_stage_single_choice"
            ? question.answer.optionIds
            : ["", ""];
          const latinReview = question.questionType === "latin_square" &&
            question.response?.kind === "single_choice" && Array.isArray(question.explanationTrace);
          const latinAnswer = question.answer?.kind === "single_choice"
            ? question.answer.optionId
            : null;

          return (
            <Card
              aria-labelledby={`question-${question.id}`}
              className={
                question.isCorrect
                  ? "border-success"
                  : unanswered
                    ? "border-warning"
                    : "border-error"
              }
              key={question.id}
              role="article"
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="subtle">
                      Question {question.questionNumber ?? "—"}
                    </Badge>
                    <Badge variant="subtle">{question.sectionTitle}</Badge>
                    <Badge>{question.difficulty}</Badge>
                    {questionAnalysis?.timing === "fast_incorrect" ? (
                      <Badge variant="warning">Fast incorrect</Badge>
                    ) : questionAnalysis?.timing === "slow_correct" ||
                      questionAnalysis?.timing === "slow_incorrect" ? (
                      <Badge variant="warning">Slow response</Badge>
                    ) : null}
                    {question.markedForReview ? (
                      <Badge variant="warning">
                        <BookmarkCheck className="mr-1 h-3 w-3" />
                        Marked
                      </Badge>
                    ) : null}
                  </div>
                  <div
                    className={[
                      "flex items-center gap-2 text-sm font-semibold",
                      question.isCorrect
                        ? "text-success"
                        : unanswered
                          ? "text-warning"
                          : "text-error",
                    ].join(" ")}
                  >
                    {question.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : unanswered ? (
                      <MinusCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    {question.isCorrect
                      ? "Correct"
                      : unanswered
                        ? "Unanswered"
                        : "Incorrect"}
                  </div>
                </div>
                {question.canBookmark !== false ? <div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-muted disabled:opacity-50"
                    disabled={bookmarkPending}
                    onClick={() => toggleBookmark(question.id)}
                    type="button"
                  >
                    {bookmarked.has(question.id) ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {bookmarked.has(question.id)
                      ? "Saved to bookmarks"
                      : "Save question"}
                  </button>
                </div> : null}
                <CardTitle className="pt-3 text-xl leading-8" id={`question-${question.id}`}>
                  {question.questionText}
                </CardTitle>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  {question.timeSpentSeconds > 0
                    ? `${question.timeSpentSeconds}s recorded`
                    : "Timing unavailable"}
                  {` · ${MODULE_LABELS[question.questionType]} · ${question.topic}`}
                  {question.subtopic ? ` · ${question.subtopic}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {question.skillIds?.length ? question.skillIds.map((skillId) => {
                    const skill = coreSkill(skillId);
                    return skill ? <Badge key={skillId} variant="subtle">{skill.label}</Badge> : null;
                  }) : <span className="text-xs text-slate-500">Skill attribution unavailable</span>}
                  {!question.isCorrect ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/practice?module=${question.questionType}&difficulty=${question.difficulty}&count=5` as Route}>
                        Practice this module
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {question.passage ? (
                  <div className="rounded-md border-l-4 border-primary bg-primary-muted p-5 text-sm leading-7 text-on-surface">
                    {question.passage}
                  </div>
                ) : null}
                {question.code ? (
                  <pre className="overflow-x-auto rounded-md bg-code-background p-5 text-sm leading-6 text-code-foreground">
                    <code>{question.code}</code>
                  </pre>
                ) : null}
                {question.formula ? (
                  <div className="rounded-md border border-workspace-border bg-code-background p-5 text-center font-mono text-xl text-code-foreground">
                    {question.formula}
                  </div>
                ) : null}

                {equationReview ? (
                  <MathematicalEquationPracticeFeedback
                    correctAnswer={question.correctAnswer}
                    data={question.structuredData as MathematicalEquationStructuredData}
                    difficulty={question.difficulty}
                    educationalExplanation={question.educationalExplanation}
                    initialView="all"
                    isCorrect={question.isCorrect}
                    selectedAnswer={equationAnswer}
                    showOutcomeHeader={false}
                    trace={question.mathematicalExplanationTrace}
                  />
                ) : figureReview ? (
                  <FigureSequencePracticeFeedback
                    correctAnswer={question.correctAnswer}
                    difficulty={question.difficulty}
                    educationalExplanation={question.educationalExplanation}
                    initialView="all"
                    isCorrect={question.isCorrect}
                    selectedAnswer={figureAnswer}
                    sequence={question.structuredData as FigureSequencePresentation}
                    trace={question.figureExplanationTrace}
                  />
                ) : latinReview ? (
                  <LatinSquarePracticeFeedback
                    correctAnswer={question.correctAnswer}
                    data={question.structuredData as LatinSquareStructuredData}
                    difficulty={question.difficulty}
                    educationalExplanation={question.educationalExplanation}
                    initialView="all"
                    isCorrect={question.isCorrect}
                    selectedAnswer={latinAnswer}
                    trace={question.latinExplanationTrace}
                  />
                ) : question.response?.kind && question.response.kind !== "single_choice" ? (
                  <div className="space-y-4">
                    <NativePracticeResponse answer={question.answer ?? null} correctAnswer={question.correctAnswer} disabled onChange={() => undefined} question={{ ...question, estimatedTimeSeconds: 1, imageUrl: null, tableData: null }} />
                    <PracticeAnswerFeedback answer={question.answer ?? null} correctAnswer={question.correctAnswer} question={{ ...question, estimatedTimeSeconds: 1, imageUrl: null, tableData: null }} />
                  </div>
                ) : <div className="grid gap-3">
                  {question.options.map((option) => {
                    const isCorrectOption = option.id === question.correctOptionId;
                    const isSelected = option.id === question.selectedOptionId;
                    return (
                      <div
                        className={[
                          "flex min-h-14 items-center gap-3 rounded-md border p-4 text-sm",
                          isCorrectOption
                            ? "border-success bg-success-container text-success-container-foreground"
                            : isSelected
                              ? "border-error bg-error-container text-error-container-foreground"
                              : "border-workspace-border bg-surface-lowest",
                        ].join(" ")}
                        key={option.id}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current font-semibold">
                          {option.label}
                        </span>
                        <span className="flex-1">{option.content}</span>
                        {isCorrectOption ? (
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Correct answer
                          </span>
                        ) : isSelected ? (
                          <span className="flex items-center gap-1 text-xs font-semibold">
                            <XCircle className="h-4 w-4" />
                            Your answer
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>}

                {equationReview || figureReview || latinReview ? null : (
                  <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Your response: {selectedOption?.label ?? "No answer"} · Correct:{" "}
                    {correctOption?.label ?? "Unavailable"}
                  </p>
                  <ReviewExplanationDisclosure explanation={question.explanation} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-slate-600">
            No questions match this review filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewExplanationDisclosure({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(false);
  const walkthroughId = useId();
  return (
    <div className="rounded-md bg-surface-low p-4">
      <Button
        aria-controls={walkthroughId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Eye aria-hidden="true" className="h-4 w-4" />
        {open ? "Hide walkthrough" : "Show me how to solve it"}
      </Button>
      {open ? (
        <div className="mt-4 border-t border-workspace-separator pt-4" id={walkthroughId}>
          <p className="font-semibold text-on-surface">How to solve it</p>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">{explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
