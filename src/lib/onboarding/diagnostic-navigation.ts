import type { DiagnosticSessionState } from "@/lib/onboarding/data";
import type { PracticeAnswer } from "@/lib/practice/schemas";

type ActionError = { error: string | null };
type AdvanceResult = ActionError & { session?: DiagnosticSessionState };

export type DiagnosticNavigationInput = {
  session: DiagnosticSessionState;
  answer: PracticeAnswer;
  answerAlreadySaved: boolean;
};

export type DiagnosticNavigationDependencies = {
  save(input: {
    sessionId: string;
    questionId: string;
    answer: PracticeAnswer;
  }): Promise<ActionError>;
  advance(input: { sessionId: string }): Promise<AdvanceResult>;
  complete(input: { sessionId: string }): Promise<ActionError>;
};

export type DiagnosticNavigationResult =
  | { status: "advanced"; session: DiagnosticSessionState }
  | { status: "completed" }
  | { status: "error"; error: string; answerSaved: boolean };

export function createDiagnosticSubmissionGuard() {
  let active = false;
  return {
    acquire() {
      if (active) return false;
      active = true;
      return true;
    },
    release() {
      active = false;
    },
  };
}

export async function saveAndAdvanceDiagnostic(
  input: DiagnosticNavigationInput,
  dependencies: DiagnosticNavigationDependencies,
): Promise<DiagnosticNavigationResult> {
  let answerSaved = input.answerAlreadySaved;

  if (!answerSaved) {
    let saveResult: ActionError;
    try {
      saveResult = await dependencies.save({
        sessionId: input.session.sessionId,
        questionId: input.session.question.id,
        answer: input.answer,
      });
    } catch {
      return {
        status: "error",
        error: "Unable to save this answer. Check your connection and try again.",
        answerSaved: false,
      };
    }
    if (saveResult.error) {
      return { status: "error", error: saveResult.error, answerSaved: false };
    }
    answerSaved = true;
  }

  if (input.session.currentPosition === input.session.questionCount) {
    let completeResult: ActionError;
    try {
      completeResult = await dependencies.complete({ sessionId: input.session.sessionId });
    } catch {
      return {
        status: "error",
        error: "The answer was saved, but the diagnostic could not finish. Try again.",
        answerSaved,
      };
    }
    return completeResult.error
      ? { status: "error", error: completeResult.error, answerSaved }
      : { status: "completed" };
  }

  let advanceResult: AdvanceResult;
  try {
    advanceResult = await dependencies.advance({ sessionId: input.session.sessionId });
  } catch {
    return {
      status: "error",
      error: "The answer was saved, but the next question could not load. Try again.",
      answerSaved,
    };
  }
  if (advanceResult.error || !advanceResult.session) {
    return {
      status: "error",
      error: advanceResult.error ?? "Unable to load the next diagnostic question.",
      answerSaved,
    };
  }

  return { status: "advanced", session: advanceResult.session };
}
