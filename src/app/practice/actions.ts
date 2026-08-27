"use server";

import { requireUser } from "@/lib/auth/guards";
import {
  abandonPracticeSession,
  completePracticeSession,
  createPracticeSession,
  getNextPracticeQuestion,
  markPracticeQuestionShown,
  openPracticeExplanation,
  recordPracticeAnswer,
  reportPracticeQuestion,
} from "@/lib/practice/data";
import {
  answerSubmissionSchema,
  completePracticeSchema,
  practiceConfigSchema,
  practiceQuestionIdentitySchema,
  practiceReportSchema,
} from "@/lib/practice/schemas";

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function startPracticeAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceConfigSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the practice settings and try again." };
  try {
    const session = await createPracticeSession(user.id, parsed.data);
    return session ? { error: null, session } : { error: "Unable to restore the new practice session." };
  } catch (error) {
    return { error: message(error, "Unable to start practice right now.") };
  }
}

export async function showPracticeQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceQuestionIdentitySchema.safeParse(input);
  if (!parsed.success) return { error: "The practice question is invalid." };
  try {
    await markPracticeQuestionShown(user.id, parsed.data.sessionId, parsed.data.questionId);
    return { error: null };
  } catch (error) {
    return { error: message(error, "Unable to restore response timing.") };
  }
}

export async function submitPracticeAnswerAction(input: unknown) {
  const user = await requireUser();
  const parsed = answerSubmissionSchema.safeParse(input);
  if (!parsed.success) return { error: "The answer submission was invalid." };
  try {
    return { error: null, ...(await recordPracticeAnswer(user.id, parsed.data)) };
  } catch (error) {
    return { error: message(error, "Unable to save this answer.") };
  }
}

export async function nextPracticeQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = completePracticeSchema.safeParse(input);
  if (!parsed.success) return { error: "The practice session was invalid." };
  try {
    return { error: null, session: await getNextPracticeQuestion(user.id, parsed.data.sessionId) };
  } catch (error) {
    return { error: message(error, "Unable to load the next question.") };
  }
}

export async function completePracticeAction(input: unknown) {
  const user = await requireUser();
  const parsed = completePracticeSchema.safeParse(input);
  if (!parsed.success) return { error: "The practice session was invalid." };
  try {
    return { error: null, summary: await completePracticeSession(user.id, parsed.data.sessionId) };
  } catch (error) {
    return { error: message(error, "Unable to complete this practice session.") };
  }
}

export async function abandonPracticeAction(input: unknown) {
  const user = await requireUser();
  const parsed = completePracticeSchema.safeParse(input);
  if (!parsed.success) return { error: "The practice session was invalid." };
  try {
    await abandonPracticeSession(user.id, parsed.data.sessionId);
    return { error: null };
  } catch (error) {
    return { error: message(error, "Unable to leave this practice session.") };
  }
}

export async function openPracticeExplanationAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceQuestionIdentitySchema.safeParse(input);
  if (!parsed.success) return { error: "The explanation request was invalid." };
  try {
    await openPracticeExplanation(user.id, parsed.data.sessionId, parsed.data.questionId);
    return { error: null };
  } catch (error) {
    return { error: message(error, "Unable to record explanation activity.") };
  }
}

export async function reportPracticeQuestionAction(input: unknown) {
  const user = await requireUser();
  const parsed = practiceReportSchema.safeParse(input);
  if (!parsed.success) return { error: "The question report is invalid." };
  try {
    await reportPracticeQuestion(user.id, parsed.data);
    return { error: null, success: true };
  } catch (error) {
    return { error: message(error, "Unable to report this question.") };
  }
}
