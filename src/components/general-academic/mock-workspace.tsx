"use client";

import { Check, ChevronLeft, ChevronRight, Clock3, Flag, Grid2X2, LogOut, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveGeneralAcademicMockAction, submitGeneralAcademicMockAction } from "@/app/mock/general-academic/actions";
import { GeneralAcademicSource } from "@/components/general-academic/student-source";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { GeneralAcademicMockAnswer, GeneralAcademicMockAttempt } from "@/lib/general-academic/mock";

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 3600)).padStart(2, "0")}:${String(Math.floor((safe % 3600) / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function MockClock({ attempt, onExpire, onTick }: { attempt: GeneralAcademicMockAttempt; onExpire(): void; onTick(seconds: number): void }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - new Date(attempt.serverNow).getTime()) / 1000)));
  useEffect(() => {
    let expired = false;
    const offset = Date.now() - new Date(attempt.serverNow).getTime();
    const calculate = () => Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - (Date.now() - offset)) / 1000));
    const tick = () => {
      const value = calculate();
      setSeconds(value);
      onTick(value);
      if (value === 0 && !expired) { expired = true; onExpire(); }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt.expiresAt, attempt.serverNow, onExpire, onTick]);
  return <span aria-label={`${formatDuration(seconds)} remaining in General Academic mock`} className="whitespace-nowrap font-mono text-sm font-semibold" role="timer"><Clock3 className="mr-1 inline size-4" />{formatDuration(seconds)}</span>;
}

export function GeneralAcademicMockWorkspace({ attempt }: { attempt: GeneralAcademicMockAttempt }) {
  const router = useRouter();
  const initialRemaining = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - new Date(attempt.serverNow).getTime()) / 1000));
  const questions = useMemo(() => attempt.packs.flatMap((pack, packIndex) => pack.questions.map((question) => ({ pack, packIndex, question }))), [attempt.packs]);
  const initialIndex = Math.max(0, questions.findIndex((item) => item.packIndex === attempt.currentPackIndex && item.question.id === attempt.currentQuestionId));
  const initialAnswers = useMemo(() => Object.fromEntries(questions.map(({ pack, question }) => {
    const saved = attempt.answers.find((answer) => answer.packId === pack.id && answer.questionId === question.id);
    return [`${pack.id}:${question.id}`, saved ?? { packId: pack.id, questionId: question.id, selectedOption: null, isFlagged: false, responseSeconds: 0, answeredAt: null }];
  })) as Record<string, GeneralAcademicMockAnswer>, [attempt.answers, questions]);
  const [answers, setAnswers] = useState(initialAnswers);
  const answersRef = useRef(answers);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mobilePanel, setMobilePanel] = useState<"source" | "question">("question");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const remainingRef = useRef(initialRemaining);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const current = questions[currentIndex];
  const answerKey = `${current.pack.id}:${current.question.id}`;

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saveState === "saving") event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const persist = useCallback((packId: string, questionId: string, nextIndex: number) => {
    const run = async () => {
      const answer = answersRef.current[`${packId}:${questionId}`];
      const next = questions[nextIndex];
      if (!answer || !next) return false;
      setSaveState("saving");
      try {
        const result = await saveGeneralAcademicMockAction({
          attemptId: attempt.id, packId, questionId, selectedOption: answer.selectedOption,
          isFlagged: answer.isFlagged, currentPackIndex: next.packIndex, currentQuestionId: next.question.id,
        });
        if (!result.ok) { setSaveState("error"); setError(result.message); return false; }
        if (result.status === "submitted") { router.push(`/mock/general-academic/${attempt.id}/results`); return false; }
        setSaveState("saved"); setError(null); return true;
      } catch {
        setSaveState("error"); setError("Your answer could not be saved. Try again."); return false;
      }
    };
    const queued = saveQueueRef.current.then(run, run);
    saveQueueRef.current = queued;
    return queued;
  }, [attempt.id, questions, router]);

  const scheduleSave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = window.setTimeout(() => { void persist(current.pack.id, current.question.id, currentIndex); }, 350);
  };

  const updateAnswer = (patch: Partial<GeneralAcademicMockAnswer>) => {
    const next = { ...answersRef.current[answerKey], ...patch };
    const updated = { ...answersRef.current, [answerKey]: next };
    answersRef.current = updated;
    setAnswers(updated);
    scheduleSave();
  };

  const navigate = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= questions.length || nextIndex === currentIndex) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    void persist(current.pack.id, current.question.id, nextIndex);
    setCurrentIndex(nextIndex);
    setMobilePanel("question");
    setPaletteOpen(false);
  };

  const submitNow = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitOpen(false);
    startTransition(async () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      await saveQueueRef.current;
      const saved = await persist(current.pack.id, current.question.id, currentIndex);
      if (!saved && remainingRef.current > 0) { submittingRef.current = false; return; }
      const result = await submitGeneralAcademicMockAction({ attemptId: attempt.id });
      if (!result.ok) { submittingRef.current = false; setError(result.message); return; }
      router.push(`/mock/general-academic/${attempt.id}/results`);
    });
  }, [attempt.id, current.pack.id, current.question.id, currentIndex, persist, router]);
  const expire = useCallback(() => submitNow(), [submitNow]);
  const tick = useCallback((value: number) => { remainingRef.current = value; setRemaining(value); }, []);
  const leave = () => {
    if (submittingRef.current) return;
    startTransition(async () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      await saveQueueRef.current;
      const saved = await persist(current.pack.id, current.question.id, currentIndex);
      if (saved) router.push("/mock/general-academic");
    });
  };
  const answered = Object.values(answers).filter((answer) => answer.selectedOption).length;
  const flagged = Object.values(answers).filter((answer) => answer.isFlagged).length;

  const palette = <div className="space-y-4"><p className="text-xs text-muted-foreground"><Check className="mr-1 inline size-3" /> Answered · <Flag className="mx-1 inline size-3" /> Flagged · no icon: unanswered</p>{attempt.packs.map((pack, packIndex) => <section aria-label={`Pack ${packIndex + 1} questions`} key={pack.id}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pack {packIndex + 1}</p><div className="flex flex-wrap gap-2">{pack.questions.map((question) => { const index = questions.findIndex((item) => item.pack.id === pack.id && item.question.id === question.id); const state = answers[`${pack.id}:${question.id}`]; const label = `${index + 1}, ${state.selectedOption ? "answered" : "unanswered"}${state.isFlagged ? ", flagged" : ""}${index === currentIndex ? ", current" : ""}`; return <button aria-current={index === currentIndex ? "step" : undefined} aria-label={`Question ${label}`} className={`relative min-h-11 min-w-11 rounded-md border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${index === currentIndex ? "border-primary bg-primary text-primary-foreground" : "border-workspace-border"}`} key={question.id} onClick={() => navigate(index)} type="button">{index + 1}{state.selectedOption ? <Check className="absolute right-0.5 top-0.5 size-3" /> : null}{state.isFlagged ? <Flag className="absolute bottom-0.5 right-0.5 size-3" /> : null}</button>; })}</div></section>)}</div>;

  return (
    <div className="space-y-4">
      <header className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-workspace-border bg-surface-lowest/95 p-3 shadow-sm backdrop-blur"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">General Academic Mock</p><p className="text-sm font-semibold">Pack {current.packIndex + 1} of {attempt.packs.length} · Question {currentIndex + 1} of {questions.length}</p></div><div className="flex flex-wrap items-center gap-2"><MockClock attempt={attempt} onExpire={expire} onTick={tick} /><span aria-live="polite" className={`text-xs ${saveState === "error" ? "text-error" : "text-muted-foreground"}`}>{saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved"}</span><Button disabled={pending} onClick={leave} size="sm" variant="ghost"><LogOut className="size-4" /> Exit</Button></div></header>
      <nav aria-label="Source pack navigation" className="flex gap-2 overflow-x-auto rounded-lg border border-workspace-border bg-surface-lowest p-2">{attempt.packs.map((pack, packIndex) => { const firstIndex = questions.findIndex((item) => item.pack.id === pack.id); return <button aria-current={packIndex === current.packIndex ? "step" : undefined} className={`min-h-11 shrink-0 rounded-md border px-3 text-sm font-semibold ${packIndex === current.packIndex ? "border-primary bg-primary-muted" : "border-workspace-border"}`} key={pack.id} onClick={() => navigate(firstIndex)} type="button">Pack {packIndex + 1}</button>; })}</nav>
      <div aria-label="Mock panels" className="grid grid-cols-3 gap-2 lg:hidden" role="tablist"><button aria-selected={mobilePanel === "source"} className={`min-h-11 rounded-md border text-sm font-semibold ${mobilePanel === "source" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setMobilePanel("source")} role="tab" type="button">Source</button><button aria-selected={mobilePanel === "question"} className={`min-h-11 rounded-md border text-sm font-semibold ${mobilePanel === "question" ? "border-primary bg-primary-muted" : "border-workspace-border"}`} onClick={() => setMobilePanel("question")} role="tab" type="button">Question</button><button className="min-h-11 rounded-md border border-workspace-border text-sm font-semibold" onClick={() => setPaletteOpen(true)} type="button"><Grid2X2 className="mr-1 inline size-4" /> Questions</button></div>
      {error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error/30 bg-error-container p-3 text-sm" role="alert"><span>{error} Your current selections remain visible on this device.</span><Button onClick={() => void persist(current.pack.id, current.question.id, currentIndex)} size="sm" variant="outline">Retry save</Button></div> : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem]">
        <section aria-label="Source panel" className={`${mobilePanel === "source" ? "block" : "hidden"} min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:block lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto sm:p-6`}><GeneralAcademicSource pack={current.pack} /></section>
        <section aria-label="Question panel" className={`${mobilePanel === "question" ? "block" : "hidden"} min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-4 lg:block lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto sm:p-6`}><div className="space-y-5"><div><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Question {currentIndex + 1}</p><Button aria-pressed={answers[answerKey].isFlagged} onClick={() => updateAnswer({ isFlagged: !answers[answerKey].isFlagged })} size="sm" variant={answers[answerKey].isFlagged ? "secondary" : "ghost"}><Flag className="size-4" /> {answers[answerKey].isFlagged ? "Flagged" : "Flag for review"}</Button></div><h1 className="mt-3 text-xl font-semibold leading-8">{current.question.prompt}</h1></div><fieldset className="space-y-3"><legend className="sr-only">Choose one answer</legend>{current.question.options.map((option) => <label className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm focus-within:ring-2 focus-within:ring-primary ${answers[answerKey].selectedOption === option.id ? "border-primary bg-primary-muted" : "border-workspace-border"}`} key={option.id}><input aria-label={`${option.id}: ${option.text}`} checked={answers[answerKey].selectedOption === option.id} className="mt-1 size-4" name={`question-${current.pack.id}-${current.question.id}`} onChange={() => updateAnswer({ selectedOption: option.id })} type="radio" value={option.id} /><span><strong className="mr-2">{option.id}</strong>{option.text}</span></label>)}</fieldset><p className="rounded-md bg-surface-container p-3 text-xs text-muted-foreground">Answers and explanations remain hidden until the complete mock is submitted.</p></div></section>
        <aside aria-label="Question palette" className="hidden rounded-lg border border-workspace-border bg-surface-lowest p-3 lg:block lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">{palette}</aside>
      </div>
      <nav aria-label="Mock controls" className="flex flex-col-reverse gap-2 rounded-lg border border-workspace-border bg-surface-lowest p-3 sm:flex-row sm:items-center sm:justify-between"><Button disabled={currentIndex === 0} onClick={() => navigate(currentIndex - 1)} variant="outline"><ChevronLeft className="size-4" /> Previous</Button><Button onClick={() => setSubmitOpen(true)} variant="secondary"><Send className="size-4" /> Submit Mock</Button><Button disabled={currentIndex === questions.length - 1} onClick={() => navigate(currentIndex + 1)}>Next <ChevronRight className="size-4" /></Button></nav>
      <Dialog onOpenChange={setPaletteOpen} open={paletteOpen} title="Mock questions"><div className="max-h-[65vh] overflow-y-auto">{palette}</div></Dialog>
      <Dialog onOpenChange={setSubmitOpen} open={submitOpen} title="Submit General Academic Mock?"><div className="space-y-4"><dl className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4"><div className="rounded bg-surface-container p-3"><dt>Answered</dt><dd className="text-xl font-semibold">{answered}</dd></div><div className="rounded bg-surface-container p-3"><dt>Unanswered</dt><dd className="text-xl font-semibold">{questions.length - answered}</dd></div><div className="rounded bg-surface-container p-3"><dt>Flagged</dt><dd className="text-xl font-semibold">{flagged}</dd></div><div className="rounded bg-surface-container p-3"><dt>Time remaining</dt><dd className="font-mono font-semibold">{formatDuration(remaining)}</dd></div></dl><p className="text-sm text-muted-foreground">You cannot change answers after submission. Unanswered questions are allowed.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={() => setSubmitOpen(false)} variant="outline">Continue Mock</Button><Button disabled={pending} onClick={submitNow}>{pending ? "Submitting…" : "Submit Mock"}</Button></div></div></Dialog>
    </div>
  );
}
