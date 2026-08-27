"use server";

import { requireUser } from "@/lib/auth/guards";
import { generateOnDemandCoreMock } from "@/lib/mocks/on-demand";
import { getEnv } from "@/lib/validators/env";
import {
  gradeAndSubmitTest,
  processTestClock,
  saveTestResponse,
  startTestAttempt,
} from "@/lib/tests/data";
import {
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
    return {
      error: error instanceof Error ? error.message : "Unable to start this test.",
    };
  }
}

export async function saveTestResponseAction(input: unknown) {
  const user = await requireUser();
  const parsed = saveTestResponseSchema.safeParse(input);
  if (!parsed.success) return { error: "The response data is invalid." };

  try {
    await saveTestResponse(user.id, parsed.data);
    return { error: null, saved: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save this response.",
    };
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
    return {
      error:
        error instanceof Error ? error.message : "Unable to submit this test.",
    };
  }
}

export async function processTestClockAction(input: unknown) {
  const user = await requireUser();
  const parsed = submitTestSchema.pick({ attemptId: true }).safeParse(input);
  if (!parsed.success) return { error: "The test attempt is invalid." };
  try {
    return { error: null, ...(await processTestClock(user.id, parsed.data.attemptId)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update the test clock." };
  }
}
