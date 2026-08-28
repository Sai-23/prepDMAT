"use client";

import type { Route } from "next";
import { ArrowLeft, ArrowRight, BookmarkCheck, CheckCircle2, Clock3, LogOut, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { advanceTestSectionAction, processTestClockAction, saveTestResponseAction, submitTestAction } from "@/app/tests/actions";
import { AssessmentActionZone, AssessmentShell } from "@/components/assessment/assessment-shell";
import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import { ActionError } from "@/components/shared/action-error";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { formatStudyTime } from "@/lib/dashboard/recommendations";
import type { PracticeAnswer } from "@/lib/practice/schemas";
import { isTestAnswerComplete, LatestResponseQueue, type SaveState } from "@/lib/tests/active-response";
import type { TestAttemptPayload, TestQuestion } from "@/lib/tests/schemas";

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

type TestResult = { correct: number; total: number; accuracy: number; totalTimeSeconds: number };
type PersistedResponse = { answer: PracticeAnswer | null; markedForReview: boolean; timeSpentSeconds: number };

const StableMockResponse = memo(function StableMockResponse({ answer, disabled, onChange, question }: {
  answer: PracticeAnswer | null;
  disabled: boolean;
  onChange(answer: PracticeAnswer): void;
  question: TestQuestion;
}) {
  return <NativePracticeResponse answer={answer} disabled={disabled} onChange={onChange} question={question} />;
});

const TestTimer = memo(function TestTimer({ expiresAt, onExpire, serverNow }: {
  expiresAt: string;
  onExpire(): void;
  serverNow: string;
}) {
  const clockOffset = useRef(0);
  const expired = useRef(false);
  const secondsAt = useCallback(() => Math.max(0, Math.ceil(
    (new Date(expiresAt).getTime() - (Date.now() + clockOffset.current)) / 1000,
  )), [expiresAt]);
  const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(
    0,
    Math.ceil(
      (new Date(expiresAt).getTime() - new Date(serverNow).getTime()) / 1000,
    ),
  ));

  useEffect(() => {
    clockOffset.current = new Date(serverNow).getTime() - Date.now();
    expired.current = false;
    const updateRemaining = () => {
      const seconds = secondsAt();
      setRemainingSeconds(seconds);
      if (seconds === 0 && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [onExpire, secondsAt, serverNow]);

  return <span aria-label={`${formatTimer(remainingSeconds)} remaining`} className="flex items-center gap-2 rounded-md border border-workspace-border bg-code-background px-3 py-2 font-mono text-sm font-semibold text-code-foreground sm:px-4" data-testid="isolated-test-timer" role="timer">
    <Clock3 aria-hidden="true" className="h-4 w-4" />
    {formatTimer(remainingSeconds)}
  </span>;
});

export function TestRunner({ attempt }: { attempt: TestAttemptPayload }) {
  const router = useRouter();
  const [currentSectionId, setCurrentSectionId] = useState(attempt.currentSectionId);
  const [sectionExpiresAt, setSectionExpiresAt] = useState(attempt.sectionExpiresAt);
  const [availableQuestions, setAvailableQuestions] = useState(attempt.questions);
  const sectionQuestions = useMemo(
    () => availableQuestions.filter((item) => item.sectionId === currentSectionId),
    [availableQuestions, currentSectionId],
  );
  const initialQuestionIndex = Math.max(0, sectionQuestions.findIndex((item) => item.id === attempt.currentQuestionId));
  const [questionIndex, setQuestionIndex] = useState(initialQuestionIndex);
  const [answers, setAnswers] = useState<Record<string, PracticeAnswer | null>>(() => Object.fromEntries(
    attempt.initialResponses.map((response) => [response.questionId, response.answer]),
  ));
  const [marked, setMarked] = useState<Set<string>>(() => new Set(
    attempt.initialResponses.filter((response) => response.markedForReview).map((response) => response.questionId),
  ));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [confirmation, setConfirmation] = useState<"exit" | "section" | "submit" | null>(null);
  const [isChangingSection, setIsChangingSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answersRef = useRef(answers);
  const markedRef = useRef(marked);
  const currentSectionIdRef = useRef(currentSectionId);
  const question = sectionQuestions[questionIndex];
  const currentQuestionIdRef = useRef(question?.id ?? attempt.currentQuestionId);
  const timeSpent = useRef(new Map(
    attempt.initialResponses.map((response) => [response.questionId, response.timeSpentSeconds]),
  ));
  const visibleSince = useRef(0);
  const debounceTimers = useRef(new Map<string, number>());
  const submittingRef = useRef(false);
  const changingSectionRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const queueRef = useRef<LatestResponseQueue<PersistedResponse> | null>(null);
  if (queueRef.current == null) {
    queueRef.current = new LatestResponseQueue(async (questionId, payload) => {
      const response = await saveTestResponseAction({ attemptId: attempt.attemptId, questionId, ...payload });
      if (response.error) throw new Error(response.error);
    });
  }
  const responseQueue = queueRef.current;

  useEffect(() => {
    visibleSince.current = Date.now();
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [question?.id]);

  const timeForQuestion = useCallback((questionId: string) => {
    const accumulated = Number(timeSpent.current.get(questionId) ?? 0);
    if (currentQuestionIdRef.current !== questionId || visibleSince.current === 0) return accumulated;
    return accumulated + Math.max(0, Math.round((Date.now() - visibleSince.current) / 1000));
  }, []);

  const accrueCurrentQuestionTime = useCallback(() => {
    const questionId = currentQuestionIdRef.current;
    timeSpent.current.set(questionId, timeForQuestion(questionId));
    visibleSince.current = Date.now();
  }, [timeForQuestion]);

  const stageQuestion = useCallback((questionId: string) => {
    responseQueue.stage(questionId, {
      answer: answersRef.current[questionId] ?? null,
      markedForReview: markedRef.current.has(questionId),
      timeSpentSeconds: timeForQuestion(questionId),
    });
    setSaveState("saving");
  }, [responseQueue, timeForQuestion]);

  const flushQuestion = useCallback(async (questionId: string) => {
    const debounceTimer = debounceTimers.current.get(questionId);
    if (debounceTimer !== undefined) {
      window.clearTimeout(debounceTimer);
      debounceTimers.current.delete(questionId);
    }
    try {
      await responseQueue.flush(questionId);
      if (!responseQueue.isDirty(questionId)) setSaveState("saved");
    } catch {
      setSaveState("error");
      setError("Your answer couldn't be saved. Try again.");
      throw new Error("response_save_failed");
    }
  }, [responseQueue]);

  const scheduleSave = useCallback((questionId: string, debounce: boolean) => {
    stageQuestion(questionId);
    const existingTimer = debounceTimers.current.get(questionId);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);
    if (!debounce) {
      void flushQuestion(questionId).catch(() => undefined);
      return;
    }
    debounceTimers.current.set(questionId, window.setTimeout(() => {
      debounceTimers.current.delete(questionId);
      void flushQuestion(questionId).catch(() => undefined);
    }, 350));
  }, [flushQuestion, stageQuestion]);

  const handleAnswerChange = useCallback((answer: PracticeAnswer) => {
    const questionId = currentQuestionIdRef.current;
    answersRef.current = { ...answersRef.current, [questionId]: answer };
    setAnswers(answersRef.current);
    setError(null);
    scheduleSave(questionId, answer.kind === "symbol_assignment");
  }, [scheduleSave]);

  const moveToQuestion = useCallback((nextIndex: number) => {
    const nextQuestion = sectionQuestions[nextIndex];
    if (!nextQuestion || nextQuestion.id === currentQuestionIdRef.current) return;
    const previousQuestionId = currentQuestionIdRef.current;
    accrueCurrentQuestionTime();
    stageQuestion(previousQuestionId);
    void flushQuestion(previousQuestionId).catch(() => undefined);
    currentQuestionIdRef.current = nextQuestion.id;
    visibleSince.current = Date.now();
    setQuestionIndex(nextIndex);
    setError(null);
  }, [accrueCurrentQuestionTime, flushQuestion, sectionQuestions, stageQuestion]);

  const applySectionTransition = useCallback((transition: {
    sectionId: string;
    questionId: string | null;
    sectionExpiresAt: string;
    questions: TestQuestion[];
    initialResponses: TestAttemptPayload["initialResponses"];
  }) => {
    const nextQuestions = transition.questions;
    const nextIndex = Math.max(0, nextQuestions.findIndex((item) => item.id === transition.questionId));
    const nextQuestion = nextQuestions[nextIndex];
    setAvailableQuestions((current) => [
      ...current.filter((item) => item.sectionId !== transition.sectionId),
      ...nextQuestions,
    ]);
    const restoredAnswers = Object.fromEntries(
      transition.initialResponses.map((response) => [response.questionId, response.answer]),
    );
    answersRef.current = { ...answersRef.current, ...restoredAnswers };
    setAnswers(answersRef.current);
    const restoredMarked = new Set(markedRef.current);
    transition.initialResponses.forEach((response) => {
      if (response.markedForReview) restoredMarked.add(response.questionId);
      else restoredMarked.delete(response.questionId);
      timeSpent.current.set(response.questionId, response.timeSpentSeconds);
    });
    markedRef.current = restoredMarked;
    setMarked(restoredMarked);
    currentSectionIdRef.current = transition.sectionId;
    currentQuestionIdRef.current = nextQuestion?.id ?? transition.questionId ?? "";
    visibleSince.current = Date.now();
    setCurrentSectionId(transition.sectionId);
    setQuestionIndex(nextIndex);
    setSectionExpiresAt(transition.sectionExpiresAt);
    setSaveState("idle");
  }, []);

  const flushAllResponses = useCallback(async () => {
    accrueCurrentQuestionTime();
    stageQuestion(currentQuestionIdRef.current);
    debounceTimers.current.forEach((timer) => window.clearTimeout(timer));
    debounceTimers.current.clear();
    try {
      await responseQueue.flushAll();
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      setError("Your answer couldn't be saved. Try again.");
      return false;
    }
  }, [accrueCurrentQuestionTime, responseQueue, stageQuestion]);

  const advanceSection = useCallback(async () => {
    if (changingSectionRef.current || submittingRef.current) return;
    changingSectionRef.current = true;
    setIsChangingSection(true);
    setConfirmation(null);
    setError(null);
    try {
      if (!(await flushAllResponses())) return;
      const response = await advanceTestSectionAction({ attemptId: attempt.attemptId, currentSectionId: currentSectionIdRef.current });
      if (response.error || !("sectionId" in response)) {
        setError(response.error ?? "Unable to continue to the next section.");
        return;
      }
      applySectionTransition(response);
    } finally {
      changingSectionRef.current = false;
      setIsChangingSection(false);
    }
  }, [applySectionTransition, attempt.attemptId, flushAllResponses]);

  const submitTest = useCallback(async (autoSubmitted = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      if (!autoSubmitted && !(await flushAllResponses())) {
        setConfirmation(null);
        return;
      }
      const response = await submitTestAction({ attemptId: attempt.attemptId, autoSubmitted });
      if (!("correct" in response)) {
        setConfirmation(null);
        setError(response.error);
        return;
      }
      setResult({ correct: response.correct, total: response.total || availableQuestions.length, accuracy: response.accuracy, totalTimeSeconds: response.totalTimeSeconds });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [attempt.attemptId, availableQuestions.length, flushAllResponses]);

  const leaveTest = useCallback(async () => {
    if (changingSectionRef.current || submittingRef.current) return;
    changingSectionRef.current = true;
    setIsChangingSection(true);
    setError(null);
    try {
      if (!(await flushAllResponses())) return;
      setConfirmation(null);
      router.push("/tests");
    } finally {
      changingSectionRef.current = false;
      setIsChangingSection(false);
    }
  }, [flushAllResponses, router]);

  const handleClockExpiry = useCallback(async () => {
    if (changingSectionRef.current || submittingRef.current) return;
    changingSectionRef.current = true;
    setIsChangingSection(true);
    setError(null);
    try {
      const response = await processTestClockAction({ attemptId: attempt.attemptId });
      if (response.error) setError(response.error);
      else if ("finalized" in response && response.finalized && "correct" in response) {
        setResult({ correct: response.correct, total: response.total, accuracy: response.accuracy, totalTimeSeconds: response.totalTimeSeconds });
      } else if (
        "sectionId" in response
        && response.sectionId
        && response.sectionExpiresAt
        && "questions" in response
        && "initialResponses" in response
      ) {
        applySectionTransition({
          sectionId: response.sectionId,
          questionId: response.questionId ?? null,
          sectionExpiresAt: response.sectionExpiresAt,
          questions: response.questions,
          initialResponses: response.initialResponses,
        });
      }
    } finally {
      changingSectionRef.current = false;
      setIsChangingSection(false);
    }
  }, [applySectionTransition, attempt.attemptId]);

  useEffect(() => () => {
    debounceTimers.current.forEach((timer) => window.clearTimeout(timer));
    debounceTimers.current.clear();
  }, []);

  const answeredCount = availableQuestions.filter((item) => isTestAnswerComplete(item, answers[item.id])).length;
  const flaggedCount = marked.size;
  const unansweredCount = availableQuestions.length - answeredCount;
  const currentSectionIndex = attempt.sections.findIndex((section) => section.id === currentSectionId);
  const isFinalSection = currentSectionIndex === attempt.sections.length - 1;
  const isLastQuestion = questionIndex === sectionQuestions.length - 1;
  const isTrueFinalQuestion = isFinalSection && isLastQuestion;
  const interactionBlocked = isSubmitting || isChangingSection;

  if (result) {
    return <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6"><Card className="overflow-hidden">
      <div className="bg-primary p-10 text-center text-primary-foreground"><CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12" /><p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] opacity-80">Test submitted</p><h1 className="mt-2 text-3xl font-semibold">{attempt.title}</h1><p className="mt-5 text-5xl font-semibold">{Math.round(result.accuracy)}%</p><p className="mt-2 opacity-80">{result.correct} of {result.total} correct</p></div>
      <CardContent className="space-y-6 p-6"><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">Answered</p><p className="mt-1 text-2xl font-semibold">{answeredCount}</p></div><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">Accuracy</p><p className="mt-1 text-2xl font-semibold">{Math.round(result.accuracy)}%</p></div><div className="rounded-2xl bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">Recorded time</p><p className="mt-1 text-2xl font-semibold">{formatStudyTime(result.totalTimeSeconds)}</p></div></div><div className="flex flex-col justify-center gap-3 sm:flex-row"><Button asChild variant="secondary"><Link href="/tests">Back to tests</Link></Button><Button asChild><Link href={`/results?attempt=${attempt.attemptId}` as Route}>Review answers</Link></Button><Button asChild variant="secondary"><Link href="/dashboard">Dashboard</Link></Button></div></CardContent>
    </Card></main>;
  }

  if (!question) return null;

  return <main className="mx-auto h-full w-full min-w-0 max-w-7xl overflow-hidden px-3 pt-2 sm:px-6 lg:px-8">
    <AssessmentShell
      actions={<AssessmentActionZone
        primary={isTrueFinalQuestion ? <Button className="min-h-11 w-full sm:w-auto" disabled={interactionBlocked} onClick={() => setConfirmation("submit")}><Send aria-hidden="true" className="h-4 w-4" />Submit Test</Button> : isLastQuestion ? <Button className="min-h-11 w-full sm:w-auto" disabled={interactionBlocked} onClick={() => setConfirmation("section")}>{isChangingSection ? "Starting next section…" : "End Section & Continue"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button> : <Button className="min-h-11 w-full sm:w-auto" disabled={interactionBlocked} onClick={() => moveToQuestion(questionIndex + 1)}>Next<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>}
        secondary={<Button className="min-h-11 w-full sm:w-auto" disabled={questionIndex === 0 || interactionBlocked} onClick={() => moveToQuestion(questionIndex - 1)} variant="secondary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Previous</Button>}
        status={<span aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : saveState === "error" ? "Not saved" : `${answeredCount}/${availableQuestions.length} answered`}</span>}
        tertiary={<Button className="min-h-11 justify-start px-2 sm:justify-center" disabled={interactionBlocked} onClick={() => { const nextMarked = new Set(markedRef.current); if (nextMarked.has(question.id)) nextMarked.delete(question.id); else nextMarked.add(question.id); markedRef.current = nextMarked; setMarked(nextMarked); setError(null); scheduleSave(question.id, false); }} variant={marked.has(question.id) ? "secondary" : "ghost"}><BookmarkCheck aria-hidden="true" className="h-4 w-4" />{marked.has(question.id) ? "Marked for review" : "Mark for review"}</Button>}
      />}
      contentClassName="px-1"
      contentRef={contentRef}
      header={<div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-workspace-border bg-surface-lowest p-3"><div className="min-w-0"><p className="truncate font-semibold text-on-surface">{attempt.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{question.sectionTitle}</p></div><div className="flex min-w-0 flex-wrap items-center justify-end gap-2"><span className="hidden text-sm text-on-surface-variant sm:inline">{answeredCount}/{availableQuestions.length} answered</span><TestTimer expiresAt={sectionExpiresAt} onExpire={handleClockExpiry} serverNow={attempt.serverNow} /><ThemeToggle compact /><Button aria-label="Exit mock" disabled={interactionBlocked} onClick={() => setConfirmation("exit")} size="sm" variant="ghost"><LogOut aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Exit</span></Button></div></div>}
    >

    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,17.5rem)]">
      <Card className="min-w-0 overflow-hidden"><CardHeader className={question.questionType === "latin_square" ? "p-4 pb-2" : undefined}><div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="subtle">Question {questionIndex + 1} of {sectionQuestions.length}</Badge><Badge>{question.difficulty}</Badge></div><CardTitle className={question.questionType === "latin_square" ? "break-words pt-2 text-xl leading-7" : "break-words pt-3 text-2xl leading-9"}>{question.questionText}</CardTitle></CardHeader><CardContent className={question.questionType === "latin_square" ? "min-w-0 space-y-3 px-4 pb-4 pt-0" : "min-w-0 space-y-5"}>
        {question.passage ? <div className="rounded-md border-l-4 border-primary bg-primary-muted p-5 text-sm leading-7 text-on-surface">{question.passage}</div> : null}
        {question.code ? <pre className="max-w-full overflow-x-auto rounded-md bg-code-background p-5 text-sm leading-6 text-code-foreground"><code>{question.code}</code></pre> : null}
        {question.formula ? <div className="max-w-full overflow-x-auto rounded-md border border-workspace-border bg-code-background p-5 text-center font-mono text-xl text-code-foreground">{question.formula}</div> : null}
        {question.tableData ? <pre className="max-w-full overflow-x-auto rounded-md bg-code-background p-4 text-sm">{JSON.stringify(question.tableData, null, 2)}</pre> : null}
        <StableMockResponse answer={answers[question.id] ?? null} disabled={interactionBlocked} onChange={handleAnswerChange} question={question} />
        {error ? <ActionError action={saveState === "error" ? { label: "Retry", onClick: () => { stageQuestion(question.id); void flushQuestion(question.id).catch(() => undefined); } } : undefined} description={`${error} Your current response remains on screen.`} title="That action didn't complete" /> : null}
      </CardContent></Card>

      <aside className="min-w-0 space-y-5"><Card className="min-w-0"><CardHeader><CardTitle className="text-base">Question navigator</CardTitle></CardHeader><CardContent className="min-w-0">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(2.75rem,1fr))] gap-2" data-testid="question-navigator-grid">{sectionQuestions.map((item, index) => { const isCurrent = index === questionIndex; const isAnswered = isTestAnswerComplete(item, answers[item.id]); const isMarked = marked.has(item.id); const stateLabel = [isCurrent ? "current" : null, isAnswered ? "answered" : "unanswered", isMarked ? "flagged for review" : null].filter(Boolean).join(", "); return <button aria-current={isCurrent ? "step" : undefined} aria-label={`Question ${index + 1}, ${stateLabel}`} className={["relative flex min-h-11 min-w-11 items-center justify-center rounded-md border text-sm font-semibold", isCurrent ? "border-primary bg-primary-muted text-on-surface ring-2 ring-primary ring-offset-1 ring-offset-background" : isAnswered ? "border-success bg-success-container text-success-container-foreground" : "border-workspace-border bg-surface-container text-on-surface-variant"].join(" ")} disabled={interactionBlocked} data-question-state={isCurrent ? "current" : isAnswered ? "answered" : "unanswered"} key={item.id} onClick={() => moveToQuestion(index)} type="button">{isCurrent ? <span aria-hidden="true" className="absolute left-1 top-0 text-primary">•</span> : null}{index + 1}{isAnswered && !isCurrent ? <CheckCircle2 aria-hidden="true" className="absolute bottom-0.5 right-0.5 h-3 w-3" /> : null}{isMarked ? <BookmarkCheck aria-hidden="true" className="absolute right-0.5 top-0.5 h-3.5 w-3.5 text-warning" /> : null}</button>; })}</div>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-on-surface-variant"><p className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-sm border-2 border-primary bg-primary-muted" />Current</p><p className="flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success" />Answered</p><p className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-sm border border-workspace-border bg-surface-container" />Unanswered</p><p className="flex items-center gap-2"><BookmarkCheck aria-hidden="true" className="h-3.5 w-3.5 text-warning" />Flagged for review</p></div>
      </CardContent></Card></aside>
    </div>
    </AssessmentShell>

    <Dialog onOpenChange={(open) => { if (!open && !isChangingSection) setConfirmation(null); }} open={confirmation === "exit"} title="Leave this mock?"><div className="space-y-5"><p className="text-sm leading-6 text-on-surface-variant">Your latest response will be saved before you leave. The timer continues running, and you can resume from Mock Tests.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={isChangingSection} onClick={() => setConfirmation(null)} variant="secondary">Keep working</Button><Button disabled={isChangingSection} onClick={() => void leaveTest()}>{isChangingSection ? "Saving…" : "Save and exit"}<LogOut className="h-4 w-4" /></Button></div></div></Dialog>
    <Dialog dismissible={!isSubmitting} onOpenChange={(open) => { if (!open && !isSubmitting) setConfirmation(null); }} open={confirmation === "submit"} title="Submit your mock?"><div className="space-y-5"><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-md bg-success-container p-3"><p className="text-2xl font-semibold">{answeredCount}</p><p className="text-xs">Answered</p></div><div className="rounded-md bg-surface-container p-3"><p className="text-2xl font-semibold">{unansweredCount}</p><p className="text-xs">Unanswered</p></div><div className="rounded-md bg-warning-container p-3"><p className="text-2xl font-semibold">{flaggedCount}</p><p className="text-xs">Flagged</p></div></div>{unansweredCount ? <p className="text-sm text-on-surface-variant">Unanswered questions will be graded as incorrect. You can return to the test before submitting.</p> : null}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={isSubmitting} onClick={() => setConfirmation(null)} variant="secondary">Return to Test</Button><Button disabled={isSubmitting} onClick={() => void submitTest(false)}><Send className="h-4 w-4" />{isSubmitting ? "Submitting…" : "Submit Mock"}</Button></div></div></Dialog>
    <Dialog onOpenChange={(open) => { if (!open && !isChangingSection) setConfirmation(null); }} open={confirmation === "section"} title="End this section?"><div className="space-y-5"><p className="text-sm leading-6 text-on-surface-variant">Your latest answers will be saved before the next timed section begins. You won&apos;t be able to return to this section.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button disabled={isChangingSection} onClick={() => setConfirmation(null)} variant="secondary">Return to Section</Button><Button disabled={isChangingSection} onClick={() => void advanceSection()}>{isChangingSection ? "Starting…" : "End Section & Continue"}<ArrowRight className="h-4 w-4" /></Button></div></div></Dialog>
  </main>;
}
