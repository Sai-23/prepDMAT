"use server";

import { getCurrentUser } from "@/lib/auth/guards";
import {
  continuePublicDiagnostic,
  createPublicDiagnostic,
  showPublicDiagnosticQuestion,
} from "@/lib/onboarding/public-diagnostic";
import { startInitialDiagnostic } from "@/lib/onboarding/data";
import {
  answerSubmissionSchema,
  practiceQuestionIdentitySchema,
} from "@/lib/practice/schemas";
import { safeActionFailure } from "@/lib/security/public-errors";
import {
  enforceSecurityRateLimit,
  rateLimitActionError,
} from "@/lib/security/rate-limit";

export async function startPublicDiagnosticAction() {
  const user = await getCurrentUser();
  try {
    if (user) {
      await enforceSecurityRateLimit("generation:diagnostic", { userId: user.id });
    } else {
      await enforceSecurityRateLimit("generation:public-diagnostic");
    }
  } catch (error) {
    return rateLimitActionError(error);
  }
  try {
    if (user) {
      await startInitialDiagnostic(user.id);
      return { error: null, destination: "/onboarding/diagnostic" as const };
    }
    await createPublicDiagnostic();
    return { error: null, destination: "/diagnostic/take" as const };
  } catch (error) {
    return safeActionFailure(error, "Unable to start the diagnostic.");
  }
}

export async function showPublicDiagnosticQuestionAction(input: unknown) {
  const parsed = practiceQuestionIdentitySchema.safeParse(input);
  if (!parsed.success) return { error: "The diagnostic question is invalid." };
  try {
    await showPublicDiagnosticQuestion(parsed.data.sessionId, parsed.data.questionId);
    return { error: null };
  } catch (error) {
    return safeActionFailure(error, "Unable to start response timing.");
  }
}

export async function continuePublicDiagnosticAction(input: unknown) {
  const parsed = answerSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "The diagnostic answer is invalid.", status: "error" as const, answerSaved: false };
  }
  try {
    await enforceSecurityRateLimit("assessment:public-diagnostic");
  } catch (error) {
    return { ...rateLimitActionError(error), status: "error" as const, answerSaved: false };
  }
  try {
    return { error: null, ...(await continuePublicDiagnostic(parsed.data)) };
  } catch (error) {
    return {
      ...safeActionFailure(error, "Unable to continue the diagnostic."),
      status: "error" as const,
      answerSaved: false,
    };
  }
}
