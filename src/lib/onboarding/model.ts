import { buildCoreProgress, MODULE_LABELS, type ProgressObservation } from "@/lib/progress/model";
import type { CoreSkillId } from "@/lib/progress/skills";
import type { PracticeModule } from "@/lib/practice/schemas";

export type DiagnosticEvidence = {
  id: string;
  module: PracticeModule;
  difficulty: "easy" | "medium" | "hard";
  correct: boolean;
  answeredAt: string;
  responseTimeSeconds: number;
  expectedTimeSeconds: number | null;
  skills: CoreSkillId[];
};

export type InitialModuleProfile = {
  module: PracticeModule;
  label: string;
  correct: number;
  total: number;
  difficulty: Record<"easy" | "medium" | "hard", { correct: number; total: number }>;
  confidence: "Early estimate";
};

export type InitialCoreRecommendation = {
  title: string;
  reason: string;
  label: string;
  href: string;
  module: PracticeModule;
  skill: string | null;
};

export type InitialCoreProfile = {
  totalCorrect: number;
  totalQuestions: number;
  modules: InitialModuleProfile[];
  observations: string[];
  supportedSkills: Array<{ label: string; moduleLabel: string; attempts: number; correct: number }>;
  recommendation: InitialCoreRecommendation;
  confidenceLabel: "Initial signal";
  confidenceDescription: string;
};

const moduleOrder: readonly PracticeModule[] = ["figure_sequence", "mathematical_equation", "latin_square"];

function moduleHref(questionModule: PracticeModule) {
  return `/practice?module=${questionModule}&difficulty=mixed&count=10`;
}

export function buildInitialCoreProfile(evidence: readonly DiagnosticEvidence[]): InitialCoreProfile {
  const observations: ProgressObservation[] = evidence.map((item) => ({
    id: `diagnostic:${item.id}`,
    sessionId: "initial-diagnostic",
    module: item.module,
    difficulty: item.difficulty,
    source: "practice",
    correct: item.correct,
    responseTimeSeconds: item.responseTimeSeconds,
    expectedTimeSeconds: item.expectedTimeSeconds,
    answeredAt: item.answeredAt,
    skills: item.skills,
  }));
  // This in-memory Phase 8 projection is used only for the starting profile.
  // Diagnostic observations never enter getCoreProgress or longitudinal trends.
  const projection = buildCoreProgress(observations);
  const modules = moduleOrder.map((questionModule): InitialModuleProfile => {
    const rows = evidence.filter((item) => item.module === questionModule);
    const difficulty = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
    };
    rows.forEach((row) => {
      difficulty[row.difficulty].total += 1;
      if (row.correct) difficulty[row.difficulty].correct += 1;
    });
    return {
      module: questionModule,
      label: MODULE_LABELS[questionModule],
      correct: rows.filter((row) => row.correct).length,
      total: rows.length,
      difficulty,
      confidence: "Early estimate",
    };
  });
  const ranked = [...modules].sort((left, right) =>
    left.correct - right.correct || moduleOrder.indexOf(left.module) - moduleOrder.indexOf(right.module));
  const weakest = ranked[0];
  const strongest = [...modules].sort((left, right) => right.correct - left.correct)[0];
  const phase8Recommendation = projection.recommendations[0];
  const recommendation = phase8Recommendation
    ? {
        title: `Start with ${phase8Recommendation.skill}`,
        reason: `${phase8Recommendation.reason} This is an initial signal from a short diagnostic, not a reliable weakness label.`,
        label: `Practice ${phase8Recommendation.skill}`,
        href: `/practice?module=${phase8Recommendation.module}&difficulty=${phase8Recommendation.difficulty}&count=10&focusName=${encodeURIComponent(phase8Recommendation.skill)}`,
        module: phase8Recommendation.module,
        skill: phase8Recommendation.skill,
      }
    : {
        title: `Start with ${weakest.label}`,
        reason: `${weakest.correct} of ${weakest.total} were correct in this module. Use a short mixed set to gather more reliable evidence.`,
        label: `Practice ${weakest.label}`,
        href: moduleHref(weakest.module),
        module: weakest.module,
        skill: null,
      };
  const earlyObservations = weakest.correct === strongest.correct
    ? ["Your three module results are closely balanced in this short sample."]
    : [
        `${weakest.label} produced the lowest initial result (${weakest.correct} of ${weakest.total}).`,
        `${strongest.label} produced the highest initial result (${strongest.correct} of ${strongest.total}).`,
      ];
  const supportedSkills = projection.modules.flatMap((module) => module.skills)
    .filter((skill) => skill.attemptCount >= 2)
    .sort((left, right) => right.attemptCount - left.attemptCount)
    .slice(0, 4)
    .map((skill) => ({
      label: skill.label,
      moduleLabel: MODULE_LABELS[skill.module],
      attempts: skill.attemptCount,
      correct: skill.correctCount,
    }));

  return {
    totalCorrect: evidence.filter((item) => item.correct).length,
    totalQuestions: evidence.length,
    modules,
    observations: earlyObservations,
    supportedSkills,
    recommendation,
    confidenceLabel: "Initial signal",
    confidenceDescription: "Fifteen questions provide a starting point only. Ordinary Practice and Core Mocks build the longitudinal evidence used for reliable recommendations.",
  };
}
