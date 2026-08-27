"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  completeDiagnosticAction,
  nextDiagnosticQuestionAction,
  showDiagnosticQuestionAction,
  submitDiagnosticAnswerAction,
} from "@/app/onboarding/actions";
import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticSessionState } from "@/lib/onboarding/data";
import type { PracticeAnswer, PracticeQuestion } from "@/lib/practice/schemas";

function isCompleteAnswer(answer: PracticeAnswer | null, question: PracticeQuestion) {
  if (!answer) return false;
  if (answer.kind === "two_stage_single_choice") return answer.optionIds.every(Boolean);
  if (answer.kind === "symbol_assignment") {
    return question.response?.kind === "symbol_assignment"
      && question.response.symbols.every((symbol) => Number.isInteger(answer.values[symbol]));
  }
  return Boolean(answer.optionId);
}

export function DiagnosticExperience({ initialSession }: { initialSession: DiagnosticSessionState }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [answer, setAnswer] = useState<PracticeAnswer | null>(initialSession.answer);
  const [answered, setAnswered] = useState(initialSession.answered);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canSubmit = useMemo(
    () => isCompleteAnswer(answer, session.question),
    [answer, session.question],
  );

  useEffect(() => {
    if (answered) return;
    void showDiagnosticQuestionAction({
      sessionId: session.sessionId,
      questionId: session.question.id,
    });
  }, [answered, session.question.id, session.sessionId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const submit = () => {
    if (!answer || answered || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await submitDiagnosticAnswerAction({
        sessionId: session.sessionId,
        questionId: session.question.id,
        answer,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAnswered(true);
    });
  };

  const advance = () => {
    if (!answered) return;
    setError(null);
    startTransition(async () => {
      if (session.currentPosition === session.questionCount) {
        const result = await completeDiagnosticAction({ sessionId: session.sessionId });
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/onboarding/diagnostic/summary");
        return;
      }
      const result = await nextDiagnosticQuestionAction({ sessionId: session.sessionId });
      if (result.error || !result.session) {
        setError(result.error ?? "Unable to load the next diagnostic question.");
        return;
      }
      setSession(result.session);
      setAnswer(result.session.answer);
      setAnswered(result.session.answered);
    });
  };

  const progress = Math.round((session.currentPosition / session.questionCount) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border border-workspace-border bg-surface-lowest p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Initial Core diagnostic</p>
            <p className="font-semibold">Question {session.currentPosition} of {session.questionCount}</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            Results shown after completion
          </p>
        </div>
        <div aria-label={`${progress} percent complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-3 h-2 overflow-hidden rounded-full bg-surface-high" role="progressbar">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{session.question.questionText}</CardTitle>
          <CardDescription>{session.question.topic} · {session.question.difficulty} · Untimed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <NativePracticeResponse
            answer={answer}
            disabled={answered || pending}
            onChange={setAnswer}
            question={session.question}
          />
          {answered ? (
            <p className="rounded-md bg-primary-muted p-3 text-sm font-medium">Answer saved. Correctness and explanations remain hidden until all 15 questions are complete.</p>
          ) : null}
          {error ? <p aria-live="assertive" className="rounded-md bg-error-container p-3 text-sm text-error-container-foreground">{error}</p> : null}
          <div className="flex justify-end">
            {answered ? (
              <Button disabled={pending} onClick={advance} size="lg">
                {session.currentPosition === session.questionCount ? "Finish diagnostic" : "Next question"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={!canSubmit || pending} onClick={submit} size="lg">
                {pending ? "Saving…" : "Save answer"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
