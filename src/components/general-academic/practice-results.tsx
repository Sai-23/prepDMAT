import { ArrowRight, CheckCircle2, CircleX, Clock3, MinusCircle } from "lucide-react";
import Link from "next/link";

import { GeneralAcademicBookmarkButton, GeneralAcademicRetryButton } from "@/components/general-academic/learning-actions";
import { GeneralAcademicSource } from "@/components/general-academic/student-source";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicPracticeReview } from "@/lib/general-academic/practice";
import type { GeneralAcademicPracticeRecommendation } from "@/lib/general-academic/learning";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function GeneralAcademicPracticeResults({ activeMistakeCount = 0, recommendation, review }: { activeMistakeCount?: number; recommendation?: GeneralAcademicPracticeRecommendation | null; review: GeneralAcademicPracticeReview }) {
  const lowestSkill = [...review.skills].sort((left, right) => left.accuracy - right.accuracy)[0];
  return (
    <div className="space-y-6">
      <Card><CardHeader><div className="flex flex-wrap gap-2"><Badge>{GENERAL_ACADEMIC_DOMAIN_LABELS[review.attempt.pack.domain]}</Badge><Badge variant="subtle">PrepDMAT {review.attempt.pack.difficulty}</Badge></div><CardTitle>{review.attempt.pack.title}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric label="Questions" value={review.summary.total} /><Metric label="Correct" value={review.summary.correct} /><Metric label="Incorrect" value={review.summary.incorrect} /><Metric label="Unanswered" value={review.summary.unanswered} /><Metric label="Accuracy" value={`${Math.round(review.summary.accuracy)}%`} /><Metric label="Time" value={formatTime(review.attempt.elapsedSeconds)} /></CardContent></Card>
      <p className="rounded-md bg-primary-muted p-4 text-sm">This is PrepDMAT practice feedback, not an official dMAT score.</p>
      <Card><CardHeader><CardTitle>Performance by skill</CardTitle></CardHeader><CardContent><ul className="divide-y divide-workspace-separator">{review.skills.map((skill) => <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={skill.skill}><span>{GENERAL_ACADEMIC_SKILL_LABELS[skill.skill]}</span><strong>{skill.correct} / {skill.attempted} answered correctly</strong></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>Domain performance</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-3"><span>{GENERAL_ACADEMIC_DOMAIN_LABELS[review.attempt.pack.domain]}</span><strong>{review.summary.correct} / {review.summary.total} · {Math.round(review.summary.accuracy)}%</strong></CardContent></Card>
      {review.summary.incorrect ? <p className="rounded-md border border-warning/40 bg-warning-container p-4 text-sm"><strong>{review.summary.incorrect} answered question{review.summary.incorrect === 1 ? "" : "s"}</strong> updated in source-aware Mistake Review. You currently have {activeMistakeCount} active GAM mistake{activeMistakeCount === 1 ? "" : "s"}.</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Button asChild><Link href={`/practice/general-academic/${review.attempt.id}/review`}>Review Answers &amp; Bookmark <ArrowRight className="size-4" /></Link></Button>{review.summary.incorrect ? <Button asChild variant="outline"><Link href="/practice/general-academic/mistakes">Review Mistakes</Link></Button> : null}{recommendation?.type === "skill" ? <Button asChild variant="outline"><Link href={recommendation.href}>Practice Recommended Skill</Link></Button> : lowestSkill ? <Button asChild variant="outline"><Link href={`/practice/general-academic?skill=${lowestSkill.skill}`}>Practice Similar Skill</Link></Button> : null}<GeneralAcademicRetryButton attemptId={review.attempt.id} /><Button asChild variant="ghost"><Link href="/practice/general-academic">Practice Another Pack</Link></Button></div>
    </div>
  );
}

export function GeneralAcademicDetailedReview({ bookmarkQuestionIds = [], mistakeQuestionIds = [], review }: { bookmarkQuestionIds?: string[]; mistakeQuestionIds?: string[]; review: GeneralAcademicPracticeReview }) {
  const bookmarks = new Set(bookmarkQuestionIds);
  const mistakes = new Set(mistakeQuestionIds);
  return (
    <div className="space-y-5">
      <details className="rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:hidden"><summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View academic source</summary><div className="mt-5"><GeneralAcademicSource pack={review.attempt.pack} /></div></details>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2"><aside className="hidden min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"><GeneralAcademicSource pack={review.attempt.pack} /></aside><ol className="min-w-0 space-y-5">{review.items.map((item, index) => { const selected = item.question.options.find((option) => option.id === item.selectedOption); const correct = item.question.options.find((option) => option.id === item.correctOption); const OutcomeIcon = !item.selectedOption ? MinusCircle : item.isCorrect ? CheckCircle2 : CircleX; const outcome = !item.selectedOption ? "Unanswered" : item.isCorrect ? "Correct" : "Incorrect"; return <li key={item.question.id}><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Question {index + 1}</p><div className="flex flex-wrap items-center gap-2"><Badge variant={item.isCorrect ? "success" : "warning"}><OutcomeIcon className="mr-1 inline size-3" />{outcome}</Badge>{mistakes.has(item.question.id) ? <Badge variant="warning">Added to Mistakes</Badge> : null}</div></div><CardTitle className="text-lg leading-7">{item.question.prompt}</CardTitle></CardHeader><CardContent className="space-y-4"><dl className="grid gap-3 text-sm"><div className="rounded bg-surface-container p-3"><dt className="font-semibold">Your answer</dt><dd className="mt-1">{selected ? `${selected.id}. ${selected.text}` : "No answer selected"}</dd></div><div className="rounded bg-success-container p-3"><dt className="font-semibold">Correct answer</dt><dd className="mt-1">{correct ? `${correct.id}. ${correct.text}` : item.correctOption}</dd></div></dl><section aria-label="Explanation" className="space-y-3"><h3 className="font-semibold">Explanation</h3><p className="text-sm leading-6">{item.explanation.summary}</p><ol className="list-decimal space-y-2 pl-5 text-sm leading-6">{item.explanation.steps.map((step, stepIndex) => <li key={`${item.question.id}-step-${stepIndex}`}>{step}</li>)}</ol><p className="rounded bg-primary-muted p-3 text-sm"><strong>Takeaway:</strong> {item.explanation.takeaway}</p></section><GeneralAcademicBookmarkButton attemptId={review.attempt.id} initialBookmarked={bookmarks.has(item.question.id)} questionId={item.question.id} />{item.isFlagged ? <p className="text-xs text-muted-foreground">Flagged during practice</p> : null}</CardContent></Card></li>; })}</ol></div>
      <div className="flex flex-wrap gap-2"><Button asChild><Link href={`/practice/general-academic/${review.attempt.id}/results`}>Back to Results</Link></Button><Button asChild variant="outline"><Link href="/practice/general-academic">Practice Another Pack</Link></Button></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-surface-container p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p>{label === "Time" ? <Clock3 className="sr-only" /> : null}</div>;
}
