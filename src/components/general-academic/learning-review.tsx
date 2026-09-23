"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GeneralAcademicBookmarkButton, GeneralAcademicRetryButton } from "@/components/general-academic/learning-actions";
import { GeneralAcademicSource } from "@/components/general-academic/student-source";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicBookmarkItem, GeneralAcademicMistakeItem } from "@/lib/general-academic/learning-data";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";

export function GeneralAcademicLearningReview({ kind, record }: { kind: "bookmark"; record: GeneralAcademicBookmarkItem } | { kind: "mistake"; record: GeneralAcademicMistakeItem }) {
  const [panel, setPanel] = useState<"source" | "review">("review");
  const selected = record.item.question.options.find((option) => option.id === record.item.selectedOption);
  const correct = record.item.question.options.find((option) => option.id === record.item.correctOption);
  const attemptId = kind === "mistake" ? record.latestMissedAttemptId : record.sourceAttemptId;
  return (
    <div className="space-y-5">
      <div aria-label="Review panels" className="grid grid-cols-2 gap-2 lg:hidden" role="tablist"><button aria-selected={panel === "source"} className={`min-h-11 rounded-md border text-sm font-semibold ${panel === "source" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setPanel("source")} role="tab" type="button">Source</button><button aria-selected={panel === "review"} className={`min-h-11 rounded-md border text-sm font-semibold ${panel === "review" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setPanel("review")} role="tab" type="button">Review</button></div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <aside aria-label="Source panel" className={`${panel === "source" ? "block" : "hidden"} min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto sm:p-5`}><GeneralAcademicSource pack={record.pack} /></aside>
        <main className={`${panel === "review" ? "block" : "hidden"} min-w-0 lg:block`}><Card><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge>{GENERAL_ACADEMIC_DOMAIN_LABELS[record.pack.domain]}</Badge><Badge variant="subtle">{GENERAL_ACADEMIC_SKILL_LABELS[record.item.question.skill]}</Badge>{kind === "mistake" ? <Badge variant={record.status === "active" ? "warning" : "success"}>{record.status === "active" ? <CircleAlert className="mr-1 inline size-3" /> : <CheckCircle2 className="mr-1 inline size-3" />}{record.status === "active" ? "Active" : "Resolved"}</Badge> : null}</div><CardTitle className="mt-3 text-xl leading-8">{record.item.question.prompt}</CardTitle></CardHeader><CardContent className="space-y-5"><dl className="grid gap-3 text-sm"><div className="rounded bg-surface-container p-3"><dt className="font-semibold">{kind === "mistake" ? "Your latest incorrect answer" : "Your answer from this attempt"}</dt><dd className="mt-1">{selected ? `${selected.id}. ${selected.text}` : "No answer selected"}</dd></div><div className="rounded bg-success-container p-3"><dt className="font-semibold">Correct answer</dt><dd className="mt-1">{correct ? `${correct.id}. ${correct.text}` : record.item.correctOption}</dd></div></dl>{kind === "mistake" ? <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Times missed</dt><dd className="font-semibold">{record.timesIncorrect}</dd></div><div><dt className="text-muted-foreground">Last missed</dt><dd className="font-semibold">{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.lastMissedAt))}</dd></div></dl> : null}<section aria-label="Explanation" className="space-y-3"><h2 className="font-semibold">Explanation</h2><p className="text-sm leading-6">{record.item.explanation.summary}</p><ol className="list-decimal space-y-2 pl-5 text-sm leading-6">{record.item.explanation.steps.map((step, index) => <li key={`${record.item.question.id}-step-${index}`}>{step}</li>)}</ol><p className="rounded bg-primary-muted p-3 text-sm"><strong>Takeaway:</strong> {record.item.explanation.takeaway}</p></section><GeneralAcademicBookmarkButton attemptId={attemptId} initialBookmarked={kind === "bookmark" ? true : record.isBookmarked} packId={record.sourcePackId} questionId={record.item.question.id} source={kind === "bookmark" ? record.sourceType : record.latestSource} /></CardContent></Card></main>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><GeneralAcademicRetryButton attemptId={attemptId} packId={record.sourcePackId} source={kind === "bookmark" ? record.sourceType : record.latestSource} /><Button asChild variant="outline"><Link href={`/practice/general-academic?skill=${record.item.question.skill}`}>Practice Similar Skill</Link></Button><Button asChild variant="outline"><Link href={`/practice/general-academic?domain=${record.pack.domain}`}>Practice {GENERAL_ACADEMIC_DOMAIN_LABELS[record.pack.domain]}</Link></Button><Button asChild variant="ghost"><Link href={`/practice/general-academic/${kind === "bookmark" ? "bookmarks" : "mistakes"}`}>Back to {kind === "bookmark" ? "Bookmarks" : "Mistakes"}</Link></Button></div>
    </div>
  );
}
