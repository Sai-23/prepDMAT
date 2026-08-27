"use server";

import { requireUser } from "@/lib/auth/guards";
import { generateOnDemandCoreMock } from "@/lib/mocks/on-demand";
import { safeActionFailure } from "@/lib/security/public-errors";
import {
  enforceSecurityRateLimit,
  rateLimitActionError,
} from "@/lib/security/rate-limit";
import { getEnv } from "@/lib/validators/env";
import {
  advanceTestSection,
  gradeAndSubmitTest,
  processTestClock,
  saveTestResponse,
  startTestAttempt,
} from "@/lib/tests/data";
import {
  advanceTestSectionSchema,
  saveTestResponseSchema,
  submitTestSchema,
  testIdSchema,
  generatedMockRequestSchema,
} from "@/lib/tests/schemas";

export async function generateCoreMockForCurrentUser(input: unknown) {
  const user = await requireUser();
  const parsed = generatedMockRequestSchema.safeParse(input);
  if (!parsed.success) return { state: "failed" as const, error: "The generation request is invalid." };
  const env = getEnv();
  if (!env.ENABLE_ON_DEMAND_CORE_MOCKS) {
    return { state: "failed" as const, error: "On-demand Core mocks are not enabled yet." };
  }
  try {
    await enforceSecurityRateLimit("generation:mock", { userId: user.id });
  } catch (error) {
    return { state: "failed" as const, ...rateLimitActionError(error) };
  }
  return generateOnDemandCoreMock({
    userId: user.id,
    requestId: parsed.data.generationRequestId,
    historyWindow: env.CORE_MOCK_HISTORY_WINDOW,
    cooldownSeconds: env.CORE_MOCK_GENERATION_COOLDOWN_SECONDS,
  });
}

export async function startTestAction(testId: unknown) {
  const user = await requireUser();
  const parsed = testIdSchema.safeParse(testId);
  if (!parsed.success) return { error: "The selected test is invalid." };

  try {
    const result = await startTestAttempt(user.id, parsed.data);
    return { error: null, ...result };
  } catch (error) {
    return safeActionFailure(error, "Unable to start this test.");
  }
}

export async function saveTestResponseAction(input: unknown) {
  const user = await requireUser();
  const parsed = saveTestResponseSchema.safeParse(input);
  if (!parsed.success) return { error: "Your answer couldn't be saved. Try again." };

  try {
    await saveTestResponse(user.id, parsed.data);
    return { error: null, saved: true };
  } catch (error) {
    return safeActionFailure(error, "Unable to save this response.");
  }
}

export async function submitTestAction(input: unknown) {
  const user = await requireUser();
  const parsed = submitTestSchema.safeParse(input);
  if (!parsed.success) return { error: "The test submission is invalid." };

  try {
    const result = await gradeAndSubmitTest(
      user.id,
      parsed.data.attemptId,
      parsed.data.autoSubmitted,
    );
    return { error: null, ...result };
  } catch (error) {
    return safeActionFailure(error, "Unable to submit this test.");
  }
}

export async function advanceTestSectionAction(input: unknown) {
  const user = await requireUser();
  const parsed = advanceTestSectionSchema.safeParse(input);
  if (!parsed.success) return { error: "The section transition is invalid." };

  try {
    return {
      error: null,
      ...(await advanceTestSection(
        user.id,
        parsed.data.attemptId,
        parsed.data.currentSectionId,
      )),
    };
  } catch (error) {
    return safeActionFailure(error, "Unable to continue to the next section.");
  }
}

export async function processTestClockAction(input: unknown) {
  const user = await requireUser();
  const parsed = submitTestSchema.pick({ attemptId: true }).safeParse(input);
  if (!parsed.success) return { error: "The test attempt is invalid." };
  try {
    return { error: null, ...(await processTestClock(user.id, parsed.data.attemptId)) };
  } catch (error) {
    return safeActionFailure(error, "Unable to update the test clock.");
  }
}
