"use client";

import { CheckCircle2, CircleX, Flag, MinusCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { GeneralAcademicBookmarkButton } from "@/components/general-academic/learning-actions";
import { GeneralAcademicSource } from "@/components/general-academic/student-source";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicMockReview } from "@/lib/general-academic/mock";
import { GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";

type ReviewFilter = "all" | "incorrect" | "unanswered" | "flagged";

export function GeneralAcademicMockDetailedReview({ review, bookmarkKeys, mistakeKeys }: { review: GeneralAcademicMockReview; bookmarkKeys: string[]; mistakeKeys: string[] }) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [packId, setPackId] = useState<string>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"source" | "review">("review");
  const visible = useMemo(() => review.items.filter((item) =>
    (packId === "all" || item.pack.id === packId)
    && (filter === "all" || (filter === "incorrect" && Boolean(item.selectedOption) && !item.isCorrect)
      || (filter === "unanswered" && !item.selectedOption) || (filter === "flagged" && item.isFlagged))), [filter, packId, review.items]);
  const current = visible.find((item) => `${item.pack.id}:${item.question.id}` === selectedKey) ?? visible[0] ?? null;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Review filter<select className="h-11 rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => { setFilter(event.target.value as ReviewFilter); setSelectedKey(null); }} value={filter}><option value="all">All questions</option><option value="incorrect">Incorrect</option><option value="unanswered">Unanswered</option><option value="flagged">Flagged</option></select></label><label className="grid gap-1 text-sm font-semibold">Source pack<select className="h-11 rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => { setPackId(event.target.value); setSelectedKey(null); }} value={packId}><option value="all">All source packs</option>{review.attempt.packs.map((pack, index) => <option key={pack.id} value={pack.id}>Pack {index + 1}: {pack.title}</option>)}</select></label></div>
      <p aria-live="polite" className="text-sm text-muted-foreground">Showing {visible.length} of {review.items.length} questions.</p>
      {current ? <><div aria-label="Review panels" className="grid grid-cols-2 gap-2 lg:hidden" role="tablist"><button aria-selected={mobilePanel === "source"} className={`min-h-11 rounded-md border text-sm font-semibold ${mobilePanel === "source" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setMobilePanel("source")} role="tab" type="button">Source</button><button aria-selected={mobilePanel === "review"} className={`min-h-11 rounded-md border text-sm font-semibold ${mobilePanel === "review" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setMobilePanel("review")} role="tab" type="button">Review</button></div><div className="grid min-w-0 gap-5 lg:grid-cols-2"><aside aria-label="Source panel" className={`${mobilePanel === "source" ? "block" : "hidden"} min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto sm:p-5`}><GeneralAcademicSource pack={current.pack} /></aside><main className={`${mobilePanel === "review" ? "block" : "hidden"} min-w-0 lg:block`}><Card><CardHeader><div className="flex flex-wrap gap-2"><Badge>{GENERAL_ACADEMIC_SKILL_LABELS[current.question.skill]}</Badge><Badge variant={current.isCorrect ? "success" : "warning"}>{current.isCorrect ? <CheckCircle2 className="mr-1 inline size-3" /> : current.selectedOption ? <CircleX className="mr-1 inline size-3" /> : <MinusCircle className="mr-1 inline size-3" />}{current.isCorrect ? "Correct" : current.selectedOption ? "Incorrect" : "Unanswered"}</Badge>{current.isFlagged ? <Badge variant="subtle"><Flag className="mr-1 inline size-3" /> Flagged</Badge> : null}{mistakeKeys.includes(`${current.pack.id}:${current.question.id}`) ? <Badge variant="warning">Added to Mistakes</Badge> : null}</div><CardTitle className="mt-3 text-xl leading-8">{current.question.prompt}</CardTitle></CardHeader><CardContent className="space-y-5"><dl className="grid gap-3 text-sm"><div className="rounded bg-surface-container p-3"><dt className="font-semibold">Your answer</dt><dd className="mt-1">{current.selectedOption ? `${current.selectedOption}. ${current.question.options.find((option) => option.id === current.selectedOption)?.text ?? ""}` : "No answer selected"}</dd></div><div className="rounded bg-success-container p-3"><dt className="font-semibold">Correct answer</dt><dd className="mt-1">{current.correctOption}. {current.question.options.find((option) => option.id === current.correctOption)?.text}</dd></div></dl><section aria-label="Explanation" className="space-y-3"><h2 className="font-semibold">Explanation</h2><p className="text-sm leading-6">{current.explanation.summary}</p><ol className="list-decimal space-y-2 pl-5 text-sm leading-6">{current.explanation.steps.map((step, index) => <li key={`${current.question.id}-step-${index}`}>{step}</li>)}</ol><p className="rounded bg-primary-muted p-3 text-sm"><strong>Takeaway:</strong> {current.explanation.takeaway}</p></section><GeneralAcademicBookmarkButton attemptId={review.attempt.id} initialBookmarked={bookmarkKeys.includes(`${current.pack.id}:${current.question.id}`)} packId={current.pack.id} questionId={current.question.id} source="mock" /></CardContent></Card></main></div></> : <Card><CardContent className="p-8 text-center"><h2 className="font-semibold">No questions match these filters</h2><p className="mt-2 text-sm text-muted-foreground">Choose another review or source-pack filter.</p></CardContent></Card>}
      <nav aria-label="Review question navigation" className="flex flex-wrap gap-2">{visible.map((item) => { const key = `${item.pack.id}:${item.question.id}`; const number = review.items.indexOf(item) + 1; return <button aria-current={current === item ? "step" : undefined} aria-label={`Review question ${number}`} className={`min-h-11 min-w-11 rounded-md border px-3 text-sm font-semibold ${current === item ? "border-primary bg-primary text-primary-foreground" : "border-workspace-border"}`} key={key} onClick={() => { setSelectedKey(key); setMobilePanel("review"); }} type="button">{number}</button>; })}</nav>
      <Button asChild variant="outline"><Link href={`/mock/general-academic/${review.attempt.id}/results`}>Back to Results</Link></Button>
    </div>
  );
}
