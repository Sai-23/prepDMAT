import "server-only";

import type { PracticeModule } from "@/lib/practice/schemas";
import { getCoreProgress } from "@/lib/progress/data";

import { getAttemptResult } from "./data";
import {
  analyzeMockAttempt,
  getMockMistakes as mistakesFromAnalysis,
  getMockRecommendations as recommendationsFromAnalysis,
  getSectionAnalysis as sectionFromAnalysis,
} from "./mock-analysis";

export async function getMockAnalysis(userId: string, attemptId: string) {
  const result = await getAttemptResult(userId, attemptId);
  if (!result) return null;
  const analysis = analyzeMockAttempt(result);
  if (!analysis.eligible) return { result, analysis };

  try {
    const progress = await getCoreProgress(userId);
    const context: string[] = [];
    analysis.sections.forEach((section) => {
      const historical = progress.modules.find((module) => module.module === section.module);
      if (!historical || historical.attemptCount < 6 || historical.recentAccuracy === null || section.scoreAccuracy === null) return;
      const delta = section.scoreAccuracy - historical.recentAccuracy;
      if (Math.abs(delta) >= 10 && context.length < 2) {
        context.push(`${section.label} was ${Math.round(Math.abs(delta))} points ${delta > 0 ? "above" : "below"} your recent accuracy.`);
      }
    });
    const weak = new Set(progress.weakAreas.map((skill) => skill.skillId));
    const overlapping = analysis.skillLosses.find((loss) => weak.has(loss.skillId));
    if (overlapping && context.length < 2) context.push(`${overlapping.label} is also one of your current progress weak areas.`);
    analysis.longitudinalContext = context;
  } catch {
    // Attempt-specific analysis remains useful when longitudinal context is unavailable.
  }
  return { result, analysis };
}

export async function getSectionAnalysis(userId: string, attemptId: string, module: PracticeModule) {
  const loaded = await getMockAnalysis(userId, attemptId);
  return loaded ? sectionFromAnalysis(loaded.analysis, module) : null;
}

export async function getMockMistakes(userId: string, attemptId: string) {
  const loaded = await getMockAnalysis(userId, attemptId);
  return loaded ? mistakesFromAnalysis(loaded.analysis) : null;
}

export async function getMockRecommendations(userId: string, attemptId: string) {
  const loaded = await getMockAnalysis(userId, attemptId);
  return loaded ? recommendationsFromAnalysis(loaded.analysis) : null;
}
