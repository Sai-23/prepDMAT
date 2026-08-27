"use server";

import { requireUser } from "@/lib/auth/guards";
import { safeActionFailure } from "@/lib/security/public-errors";
import {
  enforceSecurityRateLimit,
  rateLimitActionError,
} from "@/lib/security/rate-limit";
import {
  advanceDiagnosticQuestion,
  completeInitialDiagnostic,
  completeOnboardingWithoutDiagnostic,
  saveDiagnosticAnswer,
  showDiagnosticQuestion,
  startInitialDiagnostic,
} from "@/lib/onboarding/data";
import {
  answerSubmissionSchema,
  completePracticeSchema,
  practiceQuestionIdentitySchema,
} from "@/lib/practice/schemas";

export async function finishOnboardingAction(preference: "practice_first" | "explore") {
  const user = await requireUser();
  if (preference !== "practice_first" && preference !== "explore") {
    return { error: "Choose a valid first step." };
  }
  try {
    await completeOnboardingWithoutDiagnostic(user.id, preference);
    return { error: null };
  } catch (error) {
    return safeActionFailure(error, "Unable to save your choice.");
  }
}

export async function startDiagnosticAction() {
  const user = await requireUser();
  try {
    await enforceSecurityRateLimit("generation:diagnostic", { userId: user.id });
  } catch (error) {
    return rateLimitActionError(error);
  }
  try {
    await startInitialDiagnostic(user.id);
    return { error: null };
  } catch (error) {
    return safeActionFailure(error, "Unable to start the diagnostic.");
  }
}

export async function showDiagnosticQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceQuestionIdentitySchema.safeParse(input);
  if (!parsed.success) return { error: "The diagnostic question is invalid." };
  try {
    await showDiagnosticQuestion(user.id, parsed.data.sessionId, parsed.data.questionId);
    return { error: null };
  } catch (error) {
    return safeActionFailure(error, "Unable to start response timing.");
  }
}

export async function submitDiagnosticAnswerAction(input: unknown) {
  const user = await requireUser();
  const parsed = answerSubmissionSchema.safeParse(input);
  if (!parsed.success) return { error: "The diagnostic answer is invalid." };
  try {
    await saveDiagnosticAnswer(user.id, parsed.data);
    return { error: null, saved: true as const };
  } catch (error) {
    return safeActionFailure(error, "Unable to save this answer.");
  }
}

export async function nextDiagnosticQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = completePracticeSchema.safeParse(input);
  if (!parsed.success) return { error: "The diagnostic session is invalid." };
  try {
    return { error: null, session: await advanceDiagnosticQuestion(user.id, parsed.data.sessionId) };
  } catch (error) {
    return safeActionFailure(error, "Unable to load the next question.");
  }
}

export async function completeDiagnosticAction(input: unknown) {
  const user = await requireUser();
  const parsed = completePracticeSchema.safeParse(input);
  if (!parsed.success) return { error: "The diagnostic session is invalid." };
  try {
    await completeInitialDiagnostic(user.id, parsed.data.sessionId);
    return { error: null };
  } catch (error) {
    return safeActionFailure(error, "Unable to complete the diagnostic.");
  }
}
