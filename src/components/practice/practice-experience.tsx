"use client";

import { ArrowRight, CheckCircle2, Clock3, Flag, LogOut } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import {
  abandonPracticeAction,
  completePracticeAction,
  nextPracticeQuestionAction,
  openPracticeExplanationAction,
  reportPracticeQuestionAction,
  showPracticeQuestionAction,
  startPracticeAction,
  submitPracticeAnswerAction,
} from "@/app/practice/actions";
import { AssessmentActionZone, AssessmentShell } from "@/components/assessment/assessment-shell";
import { ActionError } from "@/components/shared/action-error";
import { CoreModuleMotif } from "@/components/tests/mock-category-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import type { FigureSequencePresentation, LatinSquareStructuredData, MathematicalEquationStructuredData } from "@/lib/generation";
import type {
  PracticeAnswer,
  PracticeConfig,
  PracticeFeedback,
  PracticeModule,
  PracticeModulePerformance,
  PracticeSessionState,
  PracticeSummary,
} from "@/lib/practice/schemas";
import { PRACTICE_TIMING_MODES } from "@/lib/practice/timing";

import { NativePracticeResponse } from "./native-practice-response";

const FigureSequencePracticeFeedback = dynamic(
  () => import("./figure-sequence-practice-feedback")
    .then((module) => module.FigureSequencePracticeFeedback),
  { loading: () => <p className="text-sm text-muted-foreground">Preparing worked explanation…</p> },
);
const LatinSquarePracticeFeedback = dynamic(
  () => import("./latin-square-practice-feedback")
    .then((module) => module.LatinSquarePracticeFeedback),
  { loading: () => <p className="text-sm text-muted-foreground">Preparing worked explanation…</p> },
);
const MathematicalEquationPracticeFeedback = dynamic(
  () => import("./mathematical-equation-practice-feedback")
    .then((module) => module.MathematicalEquationPracticeFeedback),
  { loading: () => <p className="text-sm text-muted-foreground">Preparing worked explanation…</p> },
);

const MODULES: Array<{ value: PracticeModule; title: string; description: string }> = [
  { value: "figure_sequence", title: "Figure Sequences", description: "Continue visual patterns" },
  { value: "mathematical_equation", title: "Mathematical Equations", description: "Solve for each letter" },
  { value: "latin_square", title: "Latin Squares", description: "Complete the 5 × 5 grid" },
];

function moduleTitle(module: PracticeModule) {
  return MODULES.find((item) => item.value === module)?.title ?? module;
}

function validAnswer(answer: PracticeAnswer | null, session: PracticeSessionState) {
  if (!answer) return false;
  if (answer.kind === "two_stage_single_choice") return answer.optionIds.every(Boolean);
  if (answer.kind === "symbol_assignment") {
    const response = session.question.response;
    return response?.kind === "symbol_assignment" && response.symbols.every((symbol) => Number.isInteger(answer.values[symbol]));
  }
  return Boolean(answer.optionId);
}

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

const PracticeTimer = memo(function PracticeTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire(): void;
}) {
  const secondsAt = useCallback(
    () => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)),
    [expiresAt],
  );
  const [remaining, setRemaining] = useState(secondsAt);

  useEffect(() => {
    let expired = false;
    const tick = () => {
      const next = secondsAt();
      setRemaining(next);
      if (next === 0 && !expired) {
        expired = true;
        onExpire();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [onExpire, secondsAt]);

  return (
    <span
      aria-label={`${formatSeconds(remaining)} remaining`}
      className={remaining <= 60 ? "font-mono font-semibold text-error" : "font-mono font-semibold"}
      data-testid="isolated-practice-timer"
      role="timer"
    >
      <Clock3 className="mr-1 inline h-4 w-4" />
      {formatSeconds(remaining)}
    </span>
  );
});

export function PracticeExperience({
  performance,
  initialSession,
  initialConfig,
  libraryIntro,
}: {
  performance: PracticeModulePerformance[];
  initialSession: PracticeSessionState | null;
  initialConfig?: PracticeConfig;
  libraryIntro?: ReactNode;
}) {
  const [selectedModule, setSelectedModule] = useState<PracticeModule | null>(initialConfig?.module ?? null);
  const [difficulty, setDifficulty] = useState<PracticeConfig["difficulty"]>(initialConfig?.difficulty ?? "mixed");
  const [questionCount, setQuestionCount] = useState<PracticeConfig["questionCount"]>(initialConfig?.questionCount ?? 10);
  const [timingMode, setTimingMode] = useState<PracticeConfig["timingMode"]>(initialConfig?.timingMode ?? "untimed");
  const [session, setSession] = useState(initialSession);
  const [answer, setAnswer] = useState<PracticeAnswer | null>(initialSession?.answer ?? null);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(initialSession?.feedback ?? null);
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [isPending, startTransition] = useTransition();
  const handleExpire = useCallback(() => setExpired(true), []);

  useEffect(() => {
    if (!session || feedback || session.answer) return;
    void showPracticeQuestionAction({ sessionId: session.sessionId, questionId: session.question.id });
  }, [feedback, session]);

  useEffect(() => {
    if (!session) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [session]);

  const canSubmit = useMemo(() => session ? validAnswer(answer, session) : false, [answer, session]);

  const startPractice = () => startTransition(async () => {
    if (!selectedModule) return;
    setError(null);
    const config: PracticeConfig = initialConfig?.questionId
      ? { ...initialConfig, module: selectedModule } as PracticeConfig
      : { module: selectedModule, difficulty, questionCount, timingMode, focusFamilies: initialConfig?.focusFamilies, sourceAttemptId: initialConfig?.sourceAttemptId };
    const result = await startPracticeAction(config);
    if (result.error || !result.session) { setError(result.error ?? "Unable to start practice."); return; }
    setSession(result.session); setExpired(false); setAnswer(result.session.answer); setFeedback(result.session.feedback);
  });

  const submit = () => {
    if (!session || !answer || feedback || !canSubmit || expired) return;
    setError(null);
    startTransition(async () => {
      const result = await submitPracticeAnswerAction({ sessionId: session.sessionId, questionId: session.question.id, answer });
      if (result.error || !("isCorrect" in result) || typeof result.isCorrect !== "boolean") { setError(result.error ?? "Unable to check this answer."); return; }
      setFeedback({ isCorrect: result.isCorrect, correctAnswer: result.correctAnswer, explanation: result.explanation ?? "", explanationTrace: result.explanationTrace, figureExplanationTrace: result.figureExplanationTrace, latinExplanationTrace: result.latinExplanationTrace, mathematicalExplanationTrace: result.mathematicalExplanationTrace, educationalExplanation: result.educationalExplanation });
    });
  };

  const advance = () => {
    if (!session || !feedback) return;
    setError(null);
    startTransition(async () => {
      if (session.currentPosition >= session.questionCount) {
        const result = await completePracticeAction({ sessionId: session.sessionId });
        if (result.error || !result.summary) { setError(result.error ?? "Unable to complete this session."); return; }
        setSummary(result.summary);
        setSession(null);
        return;
      }
      const result = await nextPracticeQuestionAction({ sessionId: session.sessionId });
      if (result.error || !result.session) { setError(result.error ?? "Unable to load the next question."); return; }
      setSession(result.session);
      setExpired(false);
      setAnswer(result.session.answer);
      setFeedback(result.session.feedback);
    });
  };

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      event.preventDefault();
      if (feedback) advance(); else submit();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  if (summary) return <PracticeSummaryView summary={summary} onNew={() => { setSummary(null); setSelectedModule(null); }} />;

  if (session) {
    return (
      <PracticeSession
        answer={answer}
        canSubmit={canSubmit}
        error={error}
        feedback={feedback}
        isPending={isPending}
        key={session.question.id}
        onAnswer={setAnswer}
        onAdvance={advance}
        onExplanation={() => void openPracticeExplanationAction({ sessionId: session.sessionId, questionId: session.question.id })}
        onExit={() => startTransition(async () => {
          const result = await abandonPracticeAction({ sessionId: session.sessionId });
          if (result.error) { setError(result.error); return; }
          setSession(null); setAnswer(null); setFeedback(null); setSelectedModule(null);
        })}
        onSubmit={submit}
        expired={expired}
        onExpire={handleExpire}
        session={session}
      />
    );
  }

  const recentAccuracy = selectedModule
    ? performance.find((entry) => entry.module === selectedModule)?.accuracy
    : null;
  const timingLabel = PRACTICE_TIMING_MODES.find(
    (mode) => mode.value === timingMode,
  )?.title ?? timingMode;
  const difficultyLabel = `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;
  const selectionSummary = selectedModule
    ? `${moduleTitle(selectedModule)} · ${difficultyLabel} · ${questionCount} questions · ${timingLabel}`
    : null;

  return (
    <div className="space-y-8" data-practice-library>
      {libraryIntro}
      <div className="space-y-5">
      <section aria-labelledby="choose-module">
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-on-surface" id="choose-module">Choose a Core module</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Select what you want to practise.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((item) => {
            const selected = selectedModule === item.value;
            return (
              <button aria-pressed={selected} className={`group relative min-h-28 overflow-hidden rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${selected ? "border-primary bg-primary-muted ring-2 ring-primary" : "border-workspace-border bg-surface-lowest hover:border-primary hover:bg-surface-low"}`} key={item.value} onClick={() => setSelectedModule(item.value)} type="button">
                <span aria-hidden="true" className="absolute -bottom-2 right-1 h-20 w-24 rounded-lg bg-surface-high text-primary opacity-45">
                  <CoreModuleMotif moduleType={item.value} />
                </span>
                <span className="relative z-10 flex max-w-[75%] flex-col">
                  <span className="text-base font-semibold text-on-surface">{item.title}</span>
                  <span className="mt-1 text-sm text-on-surface-variant">{item.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {selected ? <><CheckCircle2 aria-hidden="true" className="size-4" />Selected</> : <>Select module<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" /></>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedModule ? (
        <Card>
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Configure your session</CardTitle>
                <CardDescription className="mt-1">Answers lock after checking and worked explanations appear immediately.</CardDescription>
              </div>
              {recentAccuracy != null ? (
                <p className="rounded-md bg-surface-low px-3 py-2 text-sm text-on-surface-variant">
                  Recent accuracy: <strong className="text-on-surface">{Math.round(recentAccuracy)}%</strong>
                </p>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            {initialConfig?.questionId ? (
              <p className="rounded-md border border-primary bg-primary-muted p-3 text-sm"><strong>Exact-question review:</strong> this approved question will open as a one-question, untimed learning session.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.4fr]">
                <ChoiceGroup label="Difficulty" options={["easy", "medium", "hard", "mixed"]} selected={difficulty} onSelect={(value) => setDifficulty(value as PracticeConfig["difficulty"])} />
                <ChoiceGroup label="Questions" options={["5", "10", "20"]} selected={String(questionCount)} onSelect={(value) => setQuestionCount(Number(value) as 5 | 10 | 20)} />
                <fieldset className="min-w-0 rounded-lg border border-workspace-border bg-surface-low p-3 md:col-span-2 lg:col-span-1">
                  <legend className="px-1 text-sm font-semibold text-on-surface">Timing</legend>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {PRACTICE_TIMING_MODES.map((mode) => (
                      <button aria-pressed={timingMode === mode.value} className={`min-h-11 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${timingMode === mode.value ? "border-primary bg-primary-muted" : "border-workspace-border bg-surface-lowest hover:border-primary"}`} key={mode.value} onClick={() => setTimingMode(mode.value)} type="button">
                        <span className="block text-sm font-semibold text-on-surface">{mode.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">{mode.value === "untimed" ? "No countdown" : questionCount === 20 ? "Official 25-minute pace" : "Timed target pace"}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            {error ? <ActionError action={{ label: "Retry", onClick: startPractice, disabled: isPending }} description={`${error} Your practice wasn't created.`} title="Couldn't start this practice" /> : null}
            <div className="flex flex-col gap-3 border-t border-workspace-separator pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-sm font-medium text-on-surface-variant">
                {initialConfig?.questionId ? `${moduleTitle(selectedModule)} · Exact-question review · Untimed learning` : selectionSummary}
              </p>
              {!error ? <Button className="min-h-11 w-full sm:w-auto" disabled={isPending} onClick={startPractice} size="lg">{isPending ? "Preparing questions…" : "Start practice"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
      </div>
    </div>
  );
}

function ChoiceGroup({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect(value: string): void }) {
  const columns = options.length === 4 ? "grid-cols-2" : "grid-cols-3";
  return <fieldset className="min-w-0 rounded-lg border border-workspace-border bg-surface-low p-3"><legend className="px-1 text-sm font-semibold text-on-surface">{label}</legend><div className={`mt-1 grid gap-2 ${columns}`}>{options.map((option) => <button aria-pressed={selected === option} className={`min-h-11 min-w-0 rounded-md border px-3 py-2 text-sm font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === option ? "border-primary bg-primary text-primary-foreground" : "border-workspace-border bg-surface-lowest text-on-surface hover:border-primary"}`} key={option} onClick={() => onSelect(option)} type="button">{option}</button>)}</div></fieldset>;
}

function PracticeSession({ session, answer, feedback, canSubmit, expired, error, isPending, onAnswer, onSubmit, onAdvance, onExplanation, onExit, onExpire }: {
  session: PracticeSessionState; answer: PracticeAnswer | null; feedback: PracticeFeedback | null; canSubmit: boolean; expired: boolean; error: string | null; isPending: boolean;
  onAnswer(answer: PracticeAnswer): void; onSubmit(): void; onAdvance(): void; onExplanation(): void; onExit(): void; onExpire(): void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [reportReason, setReportReason] = useState("unclear_explanation");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [isReporting, startReporting] = useTransition();
  const contentRef = useRef<HTMLDivElement>(null);
  const progress = (session.currentPosition / session.questionCount) * 100;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [session.question.id]);

  return <AssessmentShell
    actions={<AssessmentActionZone
      primary={<Button className="min-h-11 w-full sm:w-auto" disabled={isPending || (!feedback && (!canSubmit || expired))} onClick={feedback ? onAdvance : onSubmit} size="lg">{isPending ? (feedback ? "Loading…" : "Checking…") : feedback ? (session.currentPosition === session.questionCount ? "Finish practice" : "Next question") : "Check answer"}<ArrowRight className="h-4 w-4" /></Button>}
      status={<span>{expired ? "Time expired — your selected answer is preserved." : feedback ? "Answer locked after checking." : "Ctrl/⌘ + Enter"}</span>}
      tertiary={feedback ? <Button className="min-h-11 justify-start px-2 sm:justify-center" onClick={() => setReportOpen((value) => !value)} variant="ghost"><Flag className="h-4 w-4" />Report question</Button> : undefined}
    />}
    className="mx-auto max-w-5xl"
    contentClassName="space-y-4 px-1"
    contentRef={contentRef}
    header={<header className="rounded-xl border border-workspace-border bg-surface-lowest/95 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{moduleTitle(session.module)}</p><p className="font-semibold">Question {session.currentPosition} of {session.questionCount}</p></div><div className="flex items-center gap-3">{session.expiresAt ? <PracticeTimer expiresAt={session.expiresAt} onExpire={onExpire} /> : <span className="text-sm text-muted-foreground">Untimed</span>}<Button disabled={isPending} onClick={() => setExitOpen(true)} size="sm" variant="ghost"><LogOut className="h-4 w-4" />Exit</Button></div></div>
      <div aria-label={`${Math.round(progress)} percent complete`} className="mt-3 h-2 overflow-hidden rounded-full bg-surface-high" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
    </header>}
  >
    <Card><CardHeader className={session.question.questionType === "latin_square" ? "p-4 pb-2" : undefined}><CardTitle className="text-xl">{session.question.questionText}</CardTitle><CardDescription>{session.question.topic} · {session.question.difficulty} · Target pace {formatSeconds(session.targetPaceSeconds)}</CardDescription></CardHeader><CardContent className={session.question.questionType === "latin_square" ? "space-y-3 px-4 pb-4 pt-0" : "space-y-5"}>
      <NativePracticeResponse answer={answer} correctAnswer={feedback?.correctAnswer} disabled={Boolean(feedback) || isPending} onChange={onAnswer} question={session.question} />
    </CardContent></Card>
    {error ? <ActionError action={{ label: "Retry", onClick: feedback ? onAdvance : onSubmit, disabled: isPending }} description={`${error} Your answer and current question are unchanged.`} title="That action didn't complete" /> : null}
    {feedback ? <div className="space-y-4"><ModuleFeedback answer={answer!} feedback={feedback} onExplanation={onExplanation} session={session} />{reportOpen ? <form className="rounded-md border border-workspace-border bg-surface-lowest p-4" onSubmit={(event) => { event.preventDefault(); startReporting(async () => { const result = await reportPracticeQuestionAction({ sessionId: session.sessionId, questionId: session.question.id, reason: reportReason, details: reportDetails }); setReportStatus(result.error ?? "Report submitted. Thank you."); if (!result.error) setReportOpen(false); }); }}><label className="block text-sm font-semibold">Reason<select className="mt-2 h-11 w-full rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => setReportReason(event.target.value)} value={reportReason}><option value="incorrect_answer">Incorrect answer</option><option value="ambiguous_wording">Ambiguous wording</option><option value="unclear_explanation">Unclear explanation</option><option value="formatting_problem">Formatting problem</option><option value="technical_issue">Technical issue</option></select></label><label className="mt-3 block text-sm font-semibold">Details (optional)<textarea className="mt-2 min-h-24 w-full rounded-md border border-workspace-border bg-surface-lowest p-3 font-normal" maxLength={2000} onChange={(event) => setReportDetails(event.target.value)} value={reportDetails} /></label><div className="mt-3 flex justify-end"><Button className="min-h-11" disabled={isReporting} type="submit" variant="secondary">{isReporting ? "Submitting…" : "Submit report"}</Button></div></form> : null}{reportStatus ? <p aria-live="polite" className="text-sm text-muted-foreground">{reportStatus}</p> : null}</div> : null}
    <p className="text-center text-xs text-muted-foreground"><Flag className="mr-1 inline h-3.5 w-3.5" />Answers lock after Check Answer. Refreshing safely resumes this session.</p>
    <Dialog onOpenChange={setExitOpen} open={exitOpen} title="Leave this practice session?"><div className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Leaving ends this session. Your checked answers remain in your history.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={() => setExitOpen(false)} variant="secondary">Keep practising</Button><Button disabled={isPending} onClick={onExit} variant="destructive"><LogOut className="h-4 w-4" />Leave session</Button></div></div></Dialog>
  </AssessmentShell>;
}

function ModuleFeedback({ session, answer, feedback, onExplanation }: { session: PracticeSessionState; answer: PracticeAnswer; feedback: PracticeFeedback; onExplanation(): void }) {
  if (session.module === "figure_sequence" && answer.kind === "two_stage_single_choice") return <FigureSequencePracticeFeedback correctAnswer={feedback.correctAnswer} difficulty={session.question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} onExplanationOpen={onExplanation} selectedAnswer={answer.optionIds} sequence={session.question.structuredData as FigureSequencePresentation} trace={feedback.figureExplanationTrace} />;
  if (session.module === "mathematical_equation" && answer.kind === "symbol_assignment") return <MathematicalEquationPracticeFeedback correctAnswer={feedback.correctAnswer} data={session.question.structuredData as MathematicalEquationStructuredData} difficulty={session.question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} onExplanationOpen={onExplanation} selectedAnswer={answer.values} trace={feedback.mathematicalExplanationTrace} />;
  if (session.module === "latin_square" && answer.kind === "single_choice") return <LatinSquarePracticeFeedback correctAnswer={feedback.correctAnswer} data={session.question.structuredData as LatinSquareStructuredData} difficulty={session.question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} onExplanationOpen={onExplanation} selectedAnswer={answer.optionId} trace={feedback.latinExplanationTrace} />;
  return <Card><CardContent className="pt-5"><p className="font-semibold">{feedback.isCorrect ? "Correct!" : "Not quite"}</p><p className="mt-2 text-sm leading-6">{feedback.explanation}</p></CardContent></Card>;
}

function PracticeSummaryView({ summary, onNew }: { summary: PracticeSummary; onNew(): void }) {
  return <div className="mx-auto max-w-4xl space-y-6"><Card><CardHeader><div className="flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-success" /><div><CardTitle>Practice complete</CardTitle><CardDescription>{moduleTitle(summary.module)} · {summary.difficulty}</CardDescription></div></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><Metric label="Accuracy" value={`${Math.round(summary.accuracy)}%`} /><Metric label="Mistakes" value={String(summary.incorrect)} /><Metric label="Average time" value={formatSeconds(summary.averageTimeSeconds)} /></div><p className="mt-5 rounded-md bg-primary-muted p-4 text-sm font-medium">{summary.insight}</p></CardContent></Card><div className="flex flex-wrap gap-3"><Button asChild><Link href={`/practice/review/${summary.sessionId}` as Route}>Review every answer</Link></Button><Button onClick={onNew} variant="secondary">New practice session</Button></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-surface-low p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
