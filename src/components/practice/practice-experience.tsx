"use client";

import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock3, Flag, LogOut } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { coreSkill } from "@/lib/progress/skills";

import { FigureSequencePracticeFeedback } from "./figure-sequence-practice-feedback";
import { LatinSquarePracticeFeedback } from "./latin-square-practice-feedback";
import { MathematicalEquationPracticeFeedback } from "./mathematical-equation-practice-feedback";
import { NativePracticeResponse } from "./native-practice-response";

const MODULES: Array<{ value: PracticeModule; title: string; description: string; format: string; purpose: string }> = [
  { value: "figure_sequence", title: "Figure Sequences", description: "Trace changing shapes, positions, rotations, and attributes.", format: "Two missing matrices", purpose: "Build visual rule recognition" },
  { value: "mathematical_equation", title: "Mathematical Equations", description: "Infer symbol values from a compact system of equations.", format: "Enter each symbol value", purpose: "Build relational arithmetic" },
  { value: "latin_square", title: "Latin Squares", description: "Use row and column constraints to find a missing symbol.", format: "Select one symbol", purpose: "Build constraint deduction" },
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

export function PracticeExperience({
  performance,
  initialSession,
  initialConfig,
}: {
  performance: PracticeModulePerformance[];
  initialSession: PracticeSessionState | null;
  initialConfig?: PracticeConfig;
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
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

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

  useEffect(() => {
    if (!session?.expiresAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(session.expiresAt!).getTime() - Date.now()) / 1000)));
    const initialTimer = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, [session?.expiresAt]);

  const canSubmit = useMemo(() => session ? validAnswer(answer, session) : false, [answer, session]);

  const submit = () => {
    if (!session || !answer || feedback || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await submitPracticeAnswerAction({ sessionId: session.sessionId, questionId: session.question.id, answer });
      if (result.error || !("isCorrect" in result) || typeof result.isCorrect !== "boolean") { setError(result.error ?? "Unable to check this answer."); return; }
      setFeedback({ isCorrect: result.isCorrect, correctAnswer: result.correctAnswer, explanation: result.explanation ?? "", explanationTrace: result.explanationTrace, educationalExplanation: result.educationalExplanation });
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
        onAnswer={setAnswer}
        onAdvance={advance}
        onExplanation={() => void openPracticeExplanationAction({ sessionId: session.sessionId, questionId: session.question.id })}
        onExit={() => startTransition(async () => {
          const result = await abandonPracticeAction({ sessionId: session.sessionId });
          if (result.error) { setError(result.error); return; }
          setSession(null); setAnswer(null); setFeedback(null); setSelectedModule(null);
        })}
        onSubmit={submit}
        remaining={session.expiresAt ? remaining : null}
        session={session}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="choose-module">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-2xl font-semibold" id="choose-module">Choose what to practise</h2><p className="mt-1 text-sm text-muted-foreground">One module per session keeps feedback focused and progress easy to interpret.</p></div>
          <p className="rounded-full bg-primary-muted px-3 py-1 text-xs font-semibold text-primary">Learning mode · immediate feedback</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {MODULES.map((item) => {
            const recent = performance.find((entry) => entry.module === item.value);
            const selected = selectedModule === item.value;
            return (
              <button aria-pressed={selected} className={`rounded-xl border p-5 text-left transition ${selected ? "border-primary bg-primary-muted ring-2 ring-primary" : "border-workspace-border bg-surface-lowest hover:border-primary"}`} key={item.value} onClick={() => setSelectedModule(item.value)} type="button">
                <span className="text-lg font-semibold">{item.title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">{item.description}</span>
                <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-primary">{item.format}</span>
                <span className="mt-1 block text-sm">{item.purpose}</span>
                <span className="mt-4 flex items-center gap-2 border-t border-workspace-separator pt-3 text-xs text-muted-foreground"><BarChart3 className="h-4 w-4" />{recent?.accuracy == null ? "No completed sessions yet" : `${Math.round(recent.accuracy)}% recent accuracy · ${recent.completedSessions} sessions`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle>Configure your session</CardTitle><CardDescription>Practice is for learning: answers lock after checking and a worked explanation is available immediately. Mock tests remain assessment-only and are stored separately.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {!selectedModule ? <p className="rounded-md bg-surface-low p-4 text-sm">Select a module above to continue.</p> : (
            <>
              {initialConfig?.questionId ? (
                <p className="rounded-md border border-primary bg-primary-muted p-4 text-sm"><strong>Exact-question review:</strong> this approved question will open as a one-question, untimed learning session.</p>
              ) : <>
                <ChoiceGroup label="Difficulty" options={["easy", "medium", "hard", "mixed"]} selected={difficulty} onSelect={(value) => setDifficulty(value as PracticeConfig["difficulty"])} />
                <ChoiceGroup label="Questions" options={["5", "10", "20"]} selected={String(questionCount)} onSelect={(value) => setQuestionCount(Number(value) as 5 | 10 | 20)} />
                <div><p className="mb-2 text-sm font-semibold">Timing</p><div className="grid gap-3 sm:grid-cols-2">{PRACTICE_TIMING_MODES.map((mode) => <button aria-pressed={timingMode === mode.value} className={`rounded-md border p-4 text-left ${timingMode === mode.value ? "border-primary bg-primary-muted" : "border-workspace-border"}`} key={mode.value} onClick={() => setTimingMode(mode.value)} type="button"><span className="font-semibold">{mode.title}</span><span className="mt-1 block text-sm text-muted-foreground">{mode.description}{mode.value === "timed" && questionCount === 20 ? " Uses the official 25-minute module pace." : ""}</span></button>)}</div></div>
              </>}
              {error ? <ErrorMessage message={error} /> : null}
              <Button disabled={isPending} onClick={() => startTransition(async () => {
                setError(null);
                const config: PracticeConfig = initialConfig?.questionId
                  ? { ...initialConfig, module: selectedModule } as PracticeConfig
                  : { module: selectedModule, difficulty, questionCount, timingMode, focusFamilies: initialConfig?.focusFamilies, sourceAttemptId: initialConfig?.sourceAttemptId };
                const result = await startPracticeAction(config);
                if (result.error || !result.session) { setError(result.error ?? "Unable to start practice."); return; }
                setSession(result.session); setAnswer(result.session.answer); setFeedback(result.session.feedback);
              })} size="lg">{isPending ? "Generating validated questions…" : "Start practice"}<ArrowRight className="h-4 w-4" /></Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChoiceGroup({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect(value: string): void }) {
  return <div><p className="mb-2 text-sm font-semibold">{label}</p><div className="flex flex-wrap gap-2">{options.map((option) => <button aria-pressed={selected === option} className={`min-w-20 rounded-md border px-4 py-2 text-sm font-semibold capitalize ${selected === option ? "border-primary bg-primary text-primary-foreground" : "border-workspace-border"}`} key={option} onClick={() => onSelect(option)} type="button">{option}</button>)}</div></div>;
}

function PracticeSession({ session, answer, feedback, canSubmit, remaining, error, isPending, onAnswer, onSubmit, onAdvance, onExplanation, onExit }: {
  session: PracticeSessionState; answer: PracticeAnswer | null; feedback: PracticeFeedback | null; canSubmit: boolean; remaining: number | null; error: string | null; isPending: boolean;
  onAnswer(answer: PracticeAnswer): void; onSubmit(): void; onAdvance(): void; onExplanation(): void; onExit(): void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("unclear_explanation");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [isReporting, startReporting] = useTransition();
  const progress = (session.currentPosition / session.questionCount) * 100;
  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="sticky top-0 z-10 rounded-xl border border-workspace-border bg-surface-lowest/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{moduleTitle(session.module)}</p><p className="font-semibold">Question {session.currentPosition} of {session.questionCount}</p></div><div className="flex items-center gap-3">{remaining !== null ? <span aria-live="polite" className={remaining <= 60 ? "font-mono font-semibold text-error" : "font-mono font-semibold"}><Clock3 className="mr-1 inline h-4 w-4" />{formatSeconds(remaining)}</span> : <span className="text-sm text-muted-foreground">Untimed</span>}<Button disabled={isPending} onClick={onExit} size="sm" variant="ghost"><LogOut className="h-4 w-4" />Exit</Button></div></div>
      <div aria-label={`${Math.round(progress)} percent complete`} className="mt-3 h-2 overflow-hidden rounded-full bg-surface-high" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
    </header>
    <Card><CardHeader><CardTitle className="text-xl">{session.question.questionText}</CardTitle><CardDescription>{session.question.topic} · {session.question.difficulty} · Target pace {formatSeconds(session.targetPaceSeconds)}</CardDescription></CardHeader><CardContent className="space-y-5">
      <NativePracticeResponse answer={answer} correctAnswer={feedback?.correctAnswer} disabled={Boolean(feedback) || isPending} onChange={onAnswer} question={session.question} />
      {!feedback ? <div className="flex flex-wrap items-center gap-3"><Button disabled={!canSubmit || isPending || remaining === 0} onClick={onSubmit} size="lg">{isPending ? "Checking…" : "Check answer"}</Button><span className="text-xs text-muted-foreground">Ctrl/⌘ + Enter</span></div> : null}
      {error ? <ErrorMessage message={error} /> : null}
    </CardContent></Card>
    {feedback ? <div className="space-y-4"><ModuleFeedback answer={answer!} feedback={feedback} onExplanation={onExplanation} session={session} /><div className="flex flex-wrap justify-between gap-3"><Button onClick={() => setReportOpen((value) => !value)} variant="ghost"><Flag className="h-4 w-4" />Report question</Button><Button disabled={isPending} onClick={onAdvance} size="lg">{session.currentPosition === session.questionCount ? "Complete session" : "Next question"}<ArrowRight className="h-4 w-4" /></Button></div>{reportOpen ? <form className="rounded-md border border-workspace-border bg-surface-lowest p-4" onSubmit={(event) => { event.preventDefault(); startReporting(async () => { const result = await reportPracticeQuestionAction({ sessionId: session.sessionId, questionId: session.question.id, reason: reportReason, details: reportDetails }); setReportStatus(result.error ?? "Report submitted. Thank you."); if (!result.error) setReportOpen(false); }); }}><label className="block text-sm font-semibold">Reason<select className="mt-2 h-10 w-full rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => setReportReason(event.target.value)} value={reportReason}><option value="incorrect_answer">Incorrect answer</option><option value="ambiguous_wording">Ambiguous wording</option><option value="unclear_explanation">Unclear explanation</option><option value="formatting_problem">Formatting problem</option><option value="technical_issue">Technical issue</option></select></label><label className="mt-3 block text-sm font-semibold">Details (optional)<textarea className="mt-2 min-h-24 w-full rounded-md border border-workspace-border bg-surface-lowest p-3 font-normal" maxLength={2000} onChange={(event) => setReportDetails(event.target.value)} value={reportDetails} /></label><div className="mt-3 flex justify-end"><Button disabled={isReporting} type="submit" variant="secondary">{isReporting ? "Submitting…" : "Submit report"}</Button></div></form> : null}{reportStatus ? <p aria-live="polite" className="text-sm text-muted-foreground">{reportStatus}</p> : null}</div> : null}
    <p className="text-center text-xs text-muted-foreground"><Flag className="mr-1 inline h-3.5 w-3.5" />Answers lock after Check Answer. Refreshing safely resumes this session.</p>
  </div>;
}

function ModuleFeedback({ session, answer, feedback, onExplanation }: { session: PracticeSessionState; answer: PracticeAnswer; feedback: PracticeFeedback; onExplanation(): void }) {
  if (session.module === "figure_sequence" && answer.kind === "two_stage_single_choice") return <FigureSequencePracticeFeedback correctAnswer={feedback.correctAnswer} difficulty={session.question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} onExplanationOpen={onExplanation} selectedAnswer={answer.optionIds} sequence={session.question.structuredData as FigureSequencePresentation} trace={feedback.explanationTrace} />;
  if (session.module === "mathematical_equation" && answer.kind === "symbol_assignment") return <MathematicalEquationPracticeFeedback correctAnswer={feedback.correctAnswer} data={session.question.structuredData as MathematicalEquationStructuredData} difficulty={session.question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} onExplanationOpen={onExplanation} selectedAnswer={answer.values} trace={feedback.explanationTrace} />;
  if (session.module === "latin_square" && answer.kind === "single_choice") return <LatinSquarePracticeFeedback correctAnswer={feedback.correctAnswer} data={session.question.structuredData as LatinSquareStructuredData} difficulty={session.question.difficulty} educationalExplanation={feedback.educationalExplanation} isCorrect={feedback.isCorrect} onExplanationOpen={onExplanation} selectedAnswer={answer.optionId} trace={feedback.explanationTrace} />;
  return <Card><CardContent className="pt-5"><p className="font-semibold">{feedback.isCorrect ? "Correct!" : "Not quite"}</p><p className="mt-2 text-sm leading-6">{feedback.explanation}</p></CardContent></Card>;
}

function PracticeSummaryView({ summary, onNew }: { summary: PracticeSummary; onNew(): void }) {
  return <div className="mx-auto max-w-4xl space-y-6"><Card><CardHeader><div className="flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-success" /><div><CardTitle>Practice complete</CardTitle><CardDescription>{moduleTitle(summary.module)} · {summary.difficulty}</CardDescription></div></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Score" value={`${summary.score}/${summary.correct + summary.incorrect}`} /><Metric label="Correct" value={String(summary.correct)} /><Metric label="Incorrect" value={String(summary.incorrect)} /><Metric label="Accuracy" value={`${Math.round(summary.accuracy)}%`} /><Metric label="Average time" value={formatSeconds(summary.averageTimeSeconds)} /></div><p className="mt-5 rounded-md bg-primary-muted p-4 text-sm font-medium">{summary.insight}</p></CardContent></Card><div className="flex flex-wrap gap-3"><Button asChild><Link href={`/practice/review/${summary.sessionId}` as Route}>Review every answer</Link></Button><Button onClick={onNew} variant="secondary">New practice session</Button>{summary.incorrectFamilies.length ? <Button asChild variant="outline"><Link href={`/practice?module=${summary.module}&focus=${encodeURIComponent(summary.incorrectFamilies.join(","))}` as Route}>Practice incorrect skills</Link></Button> : null}</div>{summary.incorrectFamilies.length ? <p className="text-sm text-muted-foreground">A new validated set will focus on {summary.incorrectFamilies.map((skill) => coreSkill(skill)?.label).filter(Boolean).join(", ")} where generation supports it.</p> : null}</div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-surface-low p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
function ErrorMessage({ message }: { message: string }) { return <p aria-live="assertive" className="flex items-start gap-2 rounded-md bg-error-container p-3 text-sm text-error-container-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>; }
