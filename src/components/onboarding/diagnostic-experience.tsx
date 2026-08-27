"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";

import {
  continueDiagnosticAction,
  showDiagnosticQuestionAction,
} from "@/app/onboarding/actions";
import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticSessionState } from "@/lib/onboarding/data";
import {
  createDiagnosticSubmissionGuard,
} from "@/lib/onboarding/diagnostic-navigation";
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

function isTypingControl(target: EventTarget | null) {
  return target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLButtonElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

export function DiagnosticExperience({ initialSession }: { initialSession: DiagnosticSessionState }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [answer, setAnswer] = useState<PracticeAnswer | null>(initialSession.answer);
  const [answered, setAnswered] = useState(initialSession.answered);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submissionGuard = useRef(createDiagnosticSubmissionGuard());
  const canSubmit = useMemo(
    () => isCompleteAnswer(answer, session.question),
    [answer, session.question],
  );
  const canContinue = (answered || canSubmit) && !pending;
  const isFinalQuestion = session.currentPosition === session.questionCount;

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

  const saveAndContinue = () => {
    if (!answer || !canContinue || !submissionGuard.current.acquire()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await continueDiagnosticAction({
          sessionId: session.sessionId,
          questionId: session.question.id,
          answer,
        });

        if (result.error || !("status" in result) || result.status === "error") {
          setAnswered("answerSaved" in result && result.answerSaved === true);
          setError(result.error ?? "Unable to continue the diagnostic.");
          return;
        }
        if (result.status === "completed") {
          router.replace("/onboarding/diagnostic/summary");
          return;
        }

        setSession(result.session);
        setAnswer(result.session.answer);
        setAnswered(result.session.answered);
      } finally {
        submissionGuard.current.release();
      }
    });
  };

  const handleKeyboardSubmit = (event: KeyboardEvent<HTMLFormElement>) => {
    if (
      event.key === "Enter"
      && (event.ctrlKey || event.metaKey)
      && !isTypingControl(event.target)
    ) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  const progress = Math.round((session.currentPosition / session.questionCount) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border border-workspace-border bg-surface-lowest p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Initial Core diagnostic
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            Results shown after completion
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{session.question.questionText}</CardTitle>
          <CardDescription>
            {session.question.topic} · {session.question.difficulty} · Untimed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onKeyDown={handleKeyboardSubmit}
            onSubmit={(event) => {
              event.preventDefault();
              saveAndContinue();
            }}
          >
            <NativePracticeResponse
              answer={answer}
              disabled={answered || pending}
              onChange={setAnswer}
              question={session.question}
            />

            {error ? (
              <p
                aria-live="assertive"
                className="rounded-md bg-error-container p-3 text-sm text-error-container-foreground"
              >
                {error} Select Retry to try again.
              </p>
            ) : null}

            <div className="grid gap-4 border-t border-workspace-separator pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-on-surface">
                  Question {session.currentPosition} of {session.questionCount}
                </p>
                <div
                  aria-label={`${progress} percent complete`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progress}
                  className="h-2 overflow-hidden rounded-full bg-surface-high"
                  role="progressbar"
                >
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <Button
                className="min-h-12 w-full px-5 sm:w-auto"
                disabled={!canContinue}
                size="lg"
                type="submit"
              >
                {pending
                  ? "Saving..."
                  : error
                    ? "Retry"
                    : isFinalQuestion
                      ? "Finish Diagnostic"
                      : "Save & Continue"}
                {!pending ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
