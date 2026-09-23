"use client";

import { Check, ChevronLeft, ChevronRight, Clock3, Flag, LogOut, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { abandonGeneralAcademicPracticeAction, saveGeneralAcademicPracticeAction, submitGeneralAcademicPracticeAction } from "@/app/practice/general-academic/actions";
import { GeneralAcademicSource } from "@/components/general-academic/student-source";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { GeneralAcademicPracticeAnswer, GeneralAcademicPracticeAttempt } from "@/lib/general-academic/practice";

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function PracticeClock({ attempt, onExpire }: { attempt: GeneralAcademicPracticeAttempt; onExpire(): void }) {
  const calculate = useCallback(() => attempt.expiresAt
    ? Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000))
    : Math.max(0, Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)), [attempt.expiresAt, attempt.startedAt]);
  const [seconds, setSeconds] = useState(calculate);
  useEffect(() => {
    let expired = false;
    const tick = () => {
      const value = calculate();
      setSeconds(value);
      if (attempt.expiresAt && value === 0 && !expired) { expired = true; onExpire(); }
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt.expiresAt, calculate, onExpire]);
  return <span aria-label={attempt.expiresAt ? `${formatDuration(seconds)} remaining` : `${formatDuration(seconds)} elapsed`} className="font-mono text-sm font-semibold" role="timer"><Clock3 className="mr-1 inline size-4" />{formatDuration(seconds)} {attempt.expiresAt ? "left" : "elapsed"}</span>;
}

export function GeneralAcademicPracticeWorkspace({ attempt }: { attempt: GeneralAcademicPracticeAttempt }) {
  const router = useRouter();
  const initialAnswers = useMemo(() => Object.fromEntries(attempt.pack.questions.map((question) => {
    const saved = attempt.answers.find((answer) => answer.questionId === question.id);
    return [question.id, saved ?? { questionId: question.id, selectedOption: null, isFlagged: false, responseSeconds: 0, answeredAt: null }];
  })) as Record<string, GeneralAcademicPracticeAnswer>, [attempt.answers, attempt.pack.questions]);
  const [answers, setAnswers] = useState(initialAnswers);
  const answersRef = useRef(answers);
  const [currentIndex, setCurrentIndex] = useState(attempt.currentQuestionIndex);
  const [mobilePanel, setMobilePanel] = useState<"source" | "question">("question");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const question = attempt.pack.questions[currentIndex];

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saveState === "saving") event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const persist = useCallback((questionId: string, nextIndex: number) => {
    const run = async () => {
      const answer = answersRef.current[questionId];
      if (!answer) return false;
      setSaveState("saving");
      try {
        const result = await saveGeneralAcademicPracticeAction({ attemptId: attempt.id, questionId, selectedOption: answer.selectedOption, isFlagged: answer.isFlagged, currentQuestionIndex: nextIndex });
        if (!result.ok) { setSaveState("error"); setError(result.message); return false; }
        setSaveState("saved"); setError(null); return true;
      } catch {
        setSaveState("error");
        setError("Your answer could not be saved. Try again.");
        return false;
      }
    };
    const queued = saveQueueRef.current.then(run, run);
    saveQueueRef.current = queued;
    return queued;
  }, [attempt.id]);

  const scheduleSave = (questionId: string, nextIndex: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = window.setTimeout(() => { void persist(questionId, nextIndex); }, 350);
  };

  const updateAnswer = (patch: Partial<GeneralAcademicPracticeAnswer>) => {
    const next = { ...answersRef.current[question.id], ...patch };
    const updated = { ...answersRef.current, [question.id]: next };
    answersRef.current = updated;
    setAnswers(updated);
    scheduleSave(question.id, currentIndex);
  };

  const navigate = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= attempt.pack.questions.length || nextIndex === currentIndex) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    void persist(question.id, nextIndex);
    setCurrentIndex(nextIndex);
    setMobilePanel("question");
  };

  const answered = Object.values(answers).filter((answer) => answer.selectedOption).length;
  const flagged = Object.values(answers).filter((answer) => answer.isFlagged).length;
  const unanswered = attempt.pack.questions.length - answered;

  const submitNow = useCallback((allowExpiredSubmit = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitOpen(false);
    startTransition(async () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const timerHasExpired = Boolean(attempt.expiresAt && new Date(attempt.expiresAt).getTime() <= Date.now());
      if (allowExpiredSubmit || timerHasExpired) await saveQueueRef.current;
      const saved = allowExpiredSubmit || timerHasExpired
        ? false
        : await persist(attempt.pack.questions[currentIndex].id, currentIndex);
      if (!saved && !allowExpiredSubmit && !timerHasExpired) { submittingRef.current = false; return; }
      const result = await submitGeneralAcademicPracticeAction({ attemptId: attempt.id });
      if (!result.ok) { submittingRef.current = false; setError(result.message); return; }
      router.push(`/practice/general-academic/${attempt.id}/results`);
    });
  }, [attempt.expiresAt, attempt.id, attempt.pack.questions, currentIndex, persist, router]);

  const expire = useCallback(() => submitNow(true), [submitNow]);

  const saveAndLeave = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    startTransition(async () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const saved = await persist(question.id, currentIndex);
      if (!saved) { submittingRef.current = false; setExitOpen(false); return; }
      router.push("/practice/general-academic");
    });
  };

  const abandonNow = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    startTransition(async () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      await saveQueueRef.current;
      const result = await abandonGeneralAcademicPracticeAction({ attemptId: attempt.id });
      if (!result.ok) { submittingRef.current = false; setError(result.message); setExitOpen(false); return; }
      router.push("/practice/general-academic");
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-workspace-border bg-surface-lowest p-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">General Academic Practice</p><p className="font-semibold">Question {currentIndex + 1} of {attempt.pack.questions.length}</p></div><div className="flex items-center gap-3"><PracticeClock attempt={attempt} onExpire={expire} /><span aria-live="polite" className={`text-xs ${saveState === "error" ? "text-error" : "text-muted-foreground"}`}>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved"}</span><Button aria-label="Leave practice" onClick={() => setExitOpen(true)} size="sm" variant="ghost"><LogOut className="size-4" /> Exit</Button></div></header>

      <div className="grid grid-cols-2 gap-2 lg:hidden" role="tablist" aria-label="Practice panels"><button aria-selected={mobilePanel === "source"} className={`min-h-11 rounded-md border text-sm font-semibold ${mobilePanel === "source" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setMobilePanel("source")} role="tab" type="button">Source</button><button aria-selected={mobilePanel === "question"} className={`min-h-11 rounded-md border text-sm font-semibold ${mobilePanel === "question" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setMobilePanel("question")} role="tab" type="button">Question</button></div>

      {error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error/30 bg-error-container p-3 text-sm" role="alert"><span>{error} Your selected answers are still visible on this device.</span><Button onClick={() => void persist(question.id, currentIndex)} size="sm" variant="outline">Retry save</Button></div> : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section aria-label="Source panel" className={`${mobilePanel === "source" ? "block" : "hidden"} min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto sm:p-6`}><GeneralAcademicSource pack={attempt.pack} /></section>
        <section aria-label="Question panel" className={`${mobilePanel === "question" ? "block" : "hidden"} min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto sm:p-6`}><div className="space-y-5"><div><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Question {currentIndex + 1}</p><Button aria-pressed={answers[question.id].isFlagged} onClick={() => updateAnswer({ isFlagged: !answers[question.id].isFlagged })} size="sm" variant={answers[question.id].isFlagged ? "secondary" : "ghost"}><Flag className="size-4" /> {answers[question.id].isFlagged ? "Flagged" : "Flag for review"}</Button></div><h2 className="mt-3 text-xl font-semibold leading-8">{question.prompt}</h2></div><fieldset className="space-y-3"><legend className="sr-only">Choose one answer</legend>{question.options.map((option) => <label className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm focus-within:ring-2 focus-within:ring-primary ${answers[question.id].selectedOption === option.id ? "border-primary bg-primary-muted" : "border-workspace-border"}`} key={option.id}><input aria-label={`${option.id}: ${option.text}`} checked={answers[question.id].selectedOption === option.id} className="mt-1 size-4" name={`question-${question.id}`} onChange={() => updateAnswer({ selectedOption: option.id })} type="radio" value={option.id} /><span><strong className="mr-2">{option.id}</strong>{option.text}</span></label>)}</fieldset><p className="rounded-md bg-surface-container p-3 text-xs text-muted-foreground">Answers are checked only after you submit the complete source pack.</p></div></section>
      </div>

      <nav aria-label="Question navigation" className="space-y-3 rounded-lg border border-workspace-border bg-surface-lowest p-3"><div className="flex flex-wrap gap-2">{attempt.pack.questions.map((item, index) => { const state = answers[item.id]; const label = `${index + 1}${state.isFlagged ? ", flagged" : state.selectedOption ? ", answered" : ", unanswered"}${index === currentIndex ? ", current" : ""}`; return <button aria-current={index === currentIndex ? "step" : undefined} aria-label={`Question ${label}`} className={`relative min-h-11 min-w-11 rounded-md border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${index === currentIndex ? "border-primary bg-primary text-primary-foreground" : "border-workspace-border"}`} key={item.id} onClick={() => navigate(index)} type="button">{index + 1}{state.selectedOption ? <Check aria-hidden="true" className="absolute right-0.5 top-0.5 size-3" /> : null}{state.isFlagged ? <Flag aria-hidden="true" className="absolute bottom-0.5 right-0.5 size-3" /> : null}</button>; })}</div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"><Button disabled={currentIndex === 0} onClick={() => navigate(currentIndex - 1)} variant="outline"><ChevronLeft className="size-4" /> Previous</Button><Button onClick={() => setSubmitOpen(true)} variant="secondary"><Send className="size-4" /> Submit Practice</Button><Button disabled={currentIndex === attempt.pack.questions.length - 1} onClick={() => navigate(currentIndex + 1)}>Next <ChevronRight className="size-4" /></Button></div></nav>

      <Dialog onOpenChange={setSubmitOpen} open={submitOpen} title="Submit practice?"><div className="space-y-4"><dl className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded bg-surface-container p-3"><dt>Answered</dt><dd className="text-xl font-semibold">{answered}</dd></div><div className="rounded bg-surface-container p-3"><dt>Unanswered</dt><dd className="text-xl font-semibold">{unanswered}</dd></div><div className="rounded bg-surface-container p-3"><dt>Flagged</dt><dd className="text-xl font-semibold">{flagged}</dd></div></dl><p className="text-sm text-muted-foreground">You won&apos;t be able to change your answers after submitting. Unanswered questions are allowed.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={() => setSubmitOpen(false)} variant="outline">Continue Practice</Button><Button disabled={pending} onClick={() => submitNow()}>{pending ? "Submitting…" : "Submit"}</Button></div></div></Dialog>
      <Dialog onOpenChange={setExitOpen} open={exitOpen} title="Leave this practice?"><p className="text-sm text-muted-foreground">You can keep it in progress and resume later, or abandon it to choose a different pack.</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={() => setExitOpen(false)} variant="outline">Continue Practice</Button><Button disabled={pending} onClick={saveAndLeave} variant="secondary">{pending ? "Saving…" : "Save and Leave"}</Button><Button disabled={pending} onClick={abandonNow} variant="destructive">Abandon</Button></div></Dialog>
    </div>
  );
}
