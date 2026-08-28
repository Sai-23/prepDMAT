"use client";

import type { Route } from "next";
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronDown, RotateCcw, Save, XCircle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";

import { saveMistakeEntryAction, toggleBookmarkAction } from "@/app/learning/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MistakeQuestion } from "@/lib/learning/schemas";
import { MODULE_LABELS } from "@/lib/progress/model";

type EntryState = { note: string; isUnderstood: boolean; isBookmarked: boolean };
type FailedMutation = { mistake: MistakeQuestion; isUnderstood: boolean } | null;

const MistakeQuestionReview = dynamic(
  () => import("./mistake-question-review").then((module) => module.MistakeQuestionReview),
  { loading: () => <p className="text-sm text-muted-foreground">Loading question…</p> },
);

export function MistakeNotebook({ mistakes, status, total }: {
  mistakes: MistakeQuestion[];
  status: "needs_review" | "understood" | "all";
  total: number;
}) {
  const [states, setStates] = useState<Record<string, EntryState>>(() => Object.fromEntries(
    mistakes.map((mistake) => [mistake.id, { note: mistake.note, isUnderstood: mistake.isUnderstood, isBookmarked: mistake.isBookmarked }]),
  ));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [failedMutation, setFailedMutation] = useState<FailedMutation>(null);

  const saveEntry = async (mistake: MistakeQuestion, nextUnderstood: boolean, optimistic: boolean) => {
    if (pendingId) return;
    const previous = states[mistake.id];
    if (!previous) return;
    setMessage(null);
    setFailedMutation(null);
    if (optimistic) setStates((current) => ({ ...current, [mistake.id]: { ...current[mistake.id], isUnderstood: nextUnderstood } }));
    setPendingId(mistake.id);
    const response = await saveMistakeEntryAction({ sourceKind: mistake.sourceKind, sourceId: mistake.id, note: previous.note, isUnderstood: nextUnderstood });
    setPendingId(null);
    if (response.error) {
      if (optimistic) setStates((current) => ({ ...current, [mistake.id]: { ...current[mistake.id], isUnderstood: previous.isUnderstood } }));
      setFailedMutation({ mistake, isUnderstood: nextUnderstood });
      setMessage({ type: "error", text: response.error });
      return;
    }
    setStates((current) => ({ ...current, [mistake.id]: { ...current[mistake.id], isUnderstood: nextUnderstood } }));
    if ((status === "needs_review" && nextUnderstood) || (status === "understood" && !nextUnderstood)) setHidden((current) => new Set(current).add(mistake.id));
    setMessage({ type: "success", text: "Review state saved." });
  };

  const toggleBookmark = async (mistake: MistakeQuestion) => {
    const previous = states[mistake.id];
    if (!previous || !mistake.sourceQuestionId || pendingId) return;
    const nextValue = !previous.isBookmarked;
    setMessage(null);
    setStates((current) => ({ ...current, [mistake.id]: { ...current[mistake.id], isBookmarked: nextValue } }));
    setPendingId(mistake.id);
    const response = await toggleBookmarkAction({ questionId: mistake.sourceQuestionId, bookmarked: nextValue });
    setPendingId(null);
    if (response.error) {
      setStates((current) => ({ ...current, [mistake.id]: { ...current[mistake.id], isBookmarked: previous.isBookmarked } }));
      setMessage({ type: "error", text: response.error });
    }
  };

  const visible = mistakes.filter((mistake) => !hidden.has(mistake.id));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" role="status">{total === 1 ? "1 mistake" : `${total} mistakes`} in this review queue</p>
      {message ? (
        <div className={message.type === "success" ? "flex flex-wrap items-center gap-3 rounded-md bg-success-container p-3 text-sm text-success-container-foreground" : "flex flex-wrap items-center gap-3 rounded-md bg-error-container p-3 text-sm text-error-container-foreground"} role={message.type === "error" ? "alert" : "status"}>
          <span>{message.text}</span>
          {failedMutation ? <Button disabled={Boolean(pendingId)} onClick={() => saveEntry(failedMutation.mistake, failedMutation.isUnderstood, true)} size="sm" variant="secondary">Retry</Button> : null}
        </div>
      ) : null}
      {visible.length ? visible.map((mistake) => {
        const state = states[mistake.id];
        const isPending = pendingId === mistake.id;
        const retryUrl = mistake.sourceQuestionId ? `/practice?question=${mistake.sourceQuestionId}&module=${mistake.question.questionType}` as Route : null;
        return (
          <Card className={state?.isUnderstood ? "border-success/40" : "border-error/40"} key={`${mistake.sourceKind}:${mistake.id}`}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">{MODULE_LABELS[mistake.question.questionType]}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">{mistake.question.difficulty} · {mistake.source} · {mistake.lastIncorrectAt ? new Date(mistake.lastIncorrectAt).toLocaleDateString() : "Date unavailable"}</p>
                </div>
                {state?.isUnderstood ? <span className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="h-5 w-5" /> Understood</span> : <span className="flex items-center gap-2 text-sm font-semibold text-error"><XCircle className="h-5 w-5" /> Needs review</span>}
              </div>
              <CardTitle className="text-lg leading-7">{mistake.question.questionText}</CardTitle>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="font-semibold">Your answer:</span> {mistake.answerText}</p>
                <p><span className="font-semibold">Correct answer:</span> {mistake.correctAnswerText}</p>
              </div>
            </CardHeader>
            <CardContent>
              <details className="group rounded-md border border-workspace-border bg-surface-lowest">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">Review <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                <div className="space-y-5 border-t border-workspace-border p-4">
                  {mistake.question.passage ? <p className="border-l-4 border-primary bg-primary-muted p-4 text-sm leading-7">{mistake.question.passage}</p> : null}
                  {mistake.question.formula ? <p className="overflow-x-auto rounded-md bg-code-background p-4 text-center font-mono text-code-foreground">{mistake.question.formula}</p> : null}
                  <MistakeQuestionReview mistake={mistake} />
                  <div className="border-l-4 border-primary bg-primary-muted p-4"><p className="font-semibold">Explanation</p><p className="mt-2 text-sm leading-7">{mistake.explanation}</p></div>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold">Personal note</span>
                    <textarea className="min-h-24 w-full resize-y rounded-md border border-workspace-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" maxLength={2000} onChange={(event) => setStates((current) => ({ ...current, [mistake.id]: { ...current[mistake.id], note: event.target.value } }))} placeholder="What should you remember next time?" value={state?.note ?? ""} />
                  </label>
                  <div className="flex flex-wrap gap-2 border-t border-workspace-border pt-4">
                    <Button disabled={isPending} onClick={() => saveEntry(mistake, state?.isUnderstood ?? false, false)} size="sm" variant="secondary"><Save className="h-4 w-4" /> Save note</Button>
                    <Button disabled={isPending} onClick={() => saveEntry(mistake, !state?.isUnderstood, true)} size="sm"><CheckCircle2 className="h-4 w-4" />{state?.isUnderstood ? "Move to needs review" : "Mark understood"}</Button>
                    {mistake.sourceQuestionId ? <Button disabled={isPending} onClick={() => toggleBookmark(mistake)} size="sm" variant="ghost">{state?.isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{state?.isBookmarked ? "Bookmarked" : "Bookmark"}</Button> : null}
                    {retryUrl ? <Button asChild size="sm" variant="secondary"><Link href={retryUrl}><RotateCcw className="h-4 w-4" /> Reattempt</Link></Button> : null}
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        );
      }) : <Card className="border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">{status === "needs_review" ? "You're caught up. All reviewed mistakes are understood." : "No mistakes match these filters."}</CardContent></Card>}
    </div>
  );
}
