"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FigureSequencePresentation, LatinSquareStructuredData, MathematicalEquationStructuredData } from "@/lib/generation";
import type { PracticeReview as PracticeReviewData } from "@/lib/practice/schemas";

import { FigureSequencePracticeFeedback } from "./figure-sequence-practice-feedback";
import { LatinSquarePracticeFeedback } from "./latin-square-practice-feedback";
import { MathematicalEquationPracticeFeedback } from "./mathematical-equation-practice-feedback";
import { NativePracticeResponse } from "./native-practice-response";

export function PracticeReview({ review }: { review: PracticeReviewData }) {
  return <div className="space-y-6">
    <Card><CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-5">
      <Metric label="Score" value={`${review.summary.score}/${review.items.length}`} />
      <Metric label="Correct" value={String(review.summary.correct)} />
      <Metric label="Incorrect" value={String(review.summary.incorrect)} />
      <Metric label="Accuracy" value={`${Math.round(review.summary.accuracy)}%`} />
      <Metric label="Average time" value={`${Math.round(review.summary.averageTimeSeconds)}s`} />
    </CardContent></Card>
    <p className="rounded-md bg-primary-muted p-4 text-sm font-medium">{review.summary.insight}</p>
    <ol className="space-y-8">
      {review.items.map((item) => <li id={`question-${item.position}`} key={item.position}>
        <Card><CardHeader><p className="text-xs font-semibold uppercase tracking-wide text-primary">Question {item.position} · {item.question.difficulty} · {item.reasoningClassification}</p><CardTitle>{item.question.questionText}</CardTitle></CardHeader><CardContent className="space-y-5">
          <NativePracticeResponse answer={item.answer} correctAnswer={item.feedback.correctAnswer} disabled hideAnswerInputs={false} onChange={() => undefined} question={item.question} />
          <ReviewFeedback item={item} />
          <p className="text-xs text-muted-foreground">Time: {item.timeSpentSeconds}s · Family: {item.reasoningFamily}</p>
        </CardContent></Card>
      </li>)}
    </ol>
    <div className="flex flex-wrap gap-3"><Button asChild><Link href="/practice">Start another session</Link></Button>{review.summary.incorrectFamilies.length ? <Button asChild variant="secondary"><Link href={`/practice?module=${review.summary.module}&focus=${encodeURIComponent(review.summary.incorrectFamilies.join(","))}`}>Practice incorrect families</Link></Button> : null}</div>
  </div>;
}

function ReviewFeedback({ item }: { item: PracticeReviewData["items"][number] }) {
  const { answer, feedback, question } = item;
  if (question.questionType === "figure_sequence" && answer.kind === "two_stage_single_choice") return <FigureSequencePracticeFeedback correctAnswer={feedback.correctAnswer} difficulty={question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} selectedAnswer={answer.optionIds} sequence={question.structuredData as FigureSequencePresentation} trace={feedback.explanationTrace} />;
  if (question.questionType === "mathematical_equation" && answer.kind === "symbol_assignment") return <MathematicalEquationPracticeFeedback correctAnswer={feedback.correctAnswer} data={question.structuredData as MathematicalEquationStructuredData} difficulty={question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} selectedAnswer={answer.values} trace={feedback.explanationTrace} />;
  if (question.questionType === "latin_square" && answer.kind === "single_choice") return <LatinSquarePracticeFeedback correctAnswer={feedback.correctAnswer} data={question.structuredData as LatinSquareStructuredData} difficulty={question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} selectedAnswer={answer.optionId} trace={feedback.explanationTrace} />;
  return <p className="rounded-md bg-surface-low p-4 text-sm">{feedback.explanation}</p>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-surface-low p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>; }
