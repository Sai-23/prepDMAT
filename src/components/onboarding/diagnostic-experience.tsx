"use client";

import { ArrowRight, LockKeyhole, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";

import {
  continueDiagnosticAction,
  showDiagnosticQuestionAction,
} from "@/app/onboarding/actions";
import {
  continuePublicDiagnosticAction,
  showPublicDiagnosticQuestionAction,
} from "@/app/diagnostic/actions";
import { AssessmentActionZone, AssessmentShell } from "@/components/assessment/assessment-shell";
import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import { ActionError } from "@/components/shared/action-error";
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

export function DiagnosticExperience({
  initialSession,
  publicSession = false,
}: {
  initialSession: DiagnosticSessionState;
  publicSession?: boolean;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [answer, setAnswer] = useState<PracticeAnswer | null>(initialSession.answer);
  const [answered, setAnswered] = useState(initialSession.answered);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submissionGuard = useRef(createDiagnosticSubmissionGuard());
  const contentRef = useRef<HTMLDivElement>(null);
  const canSubmit = useMemo(
    () => isCompleteAnswer(answer, session.question),
    [answer, session.question],
  );
  const canContinue = (answered || canSubmit) && !pending;
  const isFinalQuestion = session.currentPosition === session.questionCount;

  useEffect(() => {
    if (answered) return;
    const showQuestion = publicSession
      ? showPublicDiagnosticQuestionAction
      : showDiagnosticQuestionAction;
    void showQuestion({
      sessionId: session.sessionId,
      questionId: session.question.id,
    });
  }, [answered, publicSession, session.question.id, session.sessionId]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [session.question.id]);

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
        const continueQuestion = publicSession
          ? continuePublicDiagnosticAction
          : continueDiagnosticAction;
        const result = await continueQuestion({
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
          router.replace(publicSession ? "/diagnostic/result" : "/onboarding/diagnostic/summary");
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
    <form
      className="mx-auto h-full max-w-5xl"
      onKeyDown={handleKeyboardSubmit}
      onSubmit={(event) => {
        event.preventDefault();
        saveAndContinue();
      }}
    >
      <AssessmentShell
        actions={<AssessmentActionZone
          primary={<Button className="min-h-12 w-full px-5 sm:w-auto" disabled={!canContinue} size="lg" type="submit">{pending ? "Saving..." : error ? "Retry" : isFinalQuestion ? "Finish Diagnostic" : "Save & Continue"}{!pending ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}</Button>}
          status={<div className="min-w-0 flex-1 space-y-1.5"><p className="font-semibold text-on-surface">Question {session.currentPosition} of {session.questionCount}</p><div aria-label={`${progress} percent complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="h-2 min-w-28 overflow-hidden rounded-full bg-surface-high sm:w-52" role="progressbar"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div></div>}
        />}
        contentClassName="px-1"
        contentRef={contentRef}
        header={<header className="rounded-xl border border-workspace-border bg-surface-lowest p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {publicSession ? "Free Core diagnostic" : "Initial Core diagnostic"}
          </p>
           <div className="flex items-center gap-2"><p className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><LockKeyhole aria-hidden="true" className="h-4 w-4" />Results shown after completion</p><Button asChild size="sm" variant="ghost"><Link href={publicSession ? "/diagnostic" : "/dashboard"}><LogOut aria-hidden="true" className="h-4 w-4" />Exit</Link></Button></div>
        </div>
      </header>}
      >
      <Card>
        <CardHeader className={session.question.questionType === "latin_square" ? "p-4 pb-2" : undefined}>
          <CardTitle className="text-xl">{session.question.questionText}</CardTitle>
          <CardDescription>
            {session.question.topic} · {session.question.difficulty} · Untimed
          </CardDescription>
        </CardHeader>
        <CardContent className={session.question.questionType === "latin_square" ? "space-y-3 px-4 pb-4 pt-0" : "space-y-6"}>
            <NativePracticeResponse
              answer={answer}
              disabled={answered || pending}
              onChange={setAnswer}
              question={session.question}
            />

            {error ? <ActionError description={`${error} Your selected answer and current question are unchanged. Select Retry to try again.`} title="Answer not saved" /> : null}
        </CardContent>
      </Card>
      </AssessmentShell>
    </form>
  );
}
