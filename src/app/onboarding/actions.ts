"use server";

import { requireUser } from "@/lib/auth/guards";
import { safeActionFailure } from "@/lib/security/public-errors";
import {
  enforceSecurityRateLimit,
  rateLimitActionError,
} from "@/lib/security/rate-limit";
import {
  completeOnboardingWithoutDiagnostic,
  continueInitialDiagnostic,
  showDiagnosticQuestion,
  startInitialDiagnostic,
} from "@/lib/onboarding/data";
import {
  answerSubmissionSchema,
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

export async function continueDiagnosticAction(input: unknown) {
  const user = await requireUser();
  const parsed = answerSubmissionSchema.safeParse(input);
  if (!parsed.success) return { error: "The diagnostic answer is invalid." };
  try {
    await enforceSecurityRateLimit("assessment:answer", { userId: user.id });
  } catch (error) {
    return {
      ...rateLimitActionError(error),
      status: "error" as const,
      answerSaved: false,
    };
  }
  try {
    return { error: null, ...(await continueInitialDiagnostic(user.id, parsed.data)) };
  } catch (error) {
    return {
      ...safeActionFailure(error, "Unable to continue the diagnostic."),
      status: "error" as const,
      answerSaved: false,
    };
  }
}
