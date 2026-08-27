import type { GenerationDifficulty } from "@/lib/generation/types";
import type { PracticeModule } from "@/lib/practice/schemas";

import { CORE_MODULES, coreSkill, skillsForModule, type CoreSkillId } from "./skills";

export type ProgressSource = "practice" | "generated_mock" | "curated_mock";
export type Trend = "improving" | "stable" | "declining" | "insufficient_data";
export type Confidence = "insufficient_data" | "early_estimate" | "growing_confidence" | "reliable_estimate";
export type PerformanceStatus = "needs_attention" | "developing" | "stable" | "strong" | "insufficient_data";

export type ProgressObservation = {
  id: string;
  sessionId: string;
  module: PracticeModule;
  difficulty: GenerationDifficulty;
  source: ProgressSource;
  correct: boolean;
  responseTimeSeconds: number;
  expectedTimeSeconds: number | null;
  answeredAt: string;
  skills: CoreSkillId[];
};

export type DifficultyMetric = { attempts: number; correct: number; accuracy: number | null };
export type SourceMetric = DifficultyMetric;
export type ProgressMetric = {
  attemptCount: number;
  correctCount: number;
  accuracy: number | null;
  normalizedAccuracy: number | null;
  averageResponseTime: number | null;
  medianResponseTime: number | null;
  difficultyMix: Record<GenerationDifficulty, DifficultyMetric>;
  sourceMix: Record<ProgressSource, SourceMetric>;
  recentAccuracy: number | null;
  historicalAccuracy: number | null;
  trend: Trend;
  confidence: Confidence;
  confidenceScore: number;
  speedState: "accurate_fast" | "accurate_slower" | "fast_inaccurate" | "on_pace" | "insufficient_data";
};

export type SkillPerformance = ProgressMetric & {
  skillId: CoreSkillId;
  label: string;
  module: PracticeModule;
  effectiveAttemptCount: number;
  status: PerformanceStatus;
  weaknessScore: number;
};

export type ModuleProgress = ProgressMetric & {
  module: PracticeModule;
  label: string;
  skills: SkillPerformance[];
  recentSessions: Array<{ sessionId: string; answeredAt: string; accuracy: number; attempts: number; source: ProgressSource }>;
};

export type PracticeRecommendation = {
  skillId: CoreSkillId;
  skill: string;
  module: PracticeModule;
  difficulty: GenerationDifficulty;
  questionCount: 5 | 10;
  reason: string;
  priority: "high" | "medium";
  href: string;
};

export type CoreProgress = {
  generatedAt: string;
  totalQuestions: number;
  modules: ModuleProgress[];
  weakAreas: SkillPerformance[];
  strongAreas: SkillPerformance[];
  recommendations: PracticeRecommendation[];
};

export const MODULE_LABELS: Record<PracticeModule, string> = {
  figure_sequence: "Figure Sequences",
  mathematical_equation: "Mathematical Equations",
  latin_square: "Latin Squares",
};

const DIFFICULTY_CREDIT: Record<GenerationDifficulty, number> = { easy: 0.9, medium: 1, hard: 1.1 };
const emptyDifficulty = (): Record<GenerationDifficulty, DifficultyMetric> => ({
  easy: { attempts: 0, correct: 0, accuracy: null },
  medium: { attempts: 0, correct: 0, accuracy: null },
  hard: { attempts: 0, correct: 0, accuracy: null },
});
const emptySources = (): Record<ProgressSource, SourceMetric> => ({
  practice: { attempts: 0, correct: 0, accuracy: null },
  generated_mock: { attempts: 0, correct: 0, accuracy: null },
  curated_mock: { attempts: 0, correct: 0, accuracy: null },
});

function percentage(correct: number, total: number) {
  return total ? (correct / total) * 100 : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function confidenceFor(attempts: number): { label: Confidence; score: number } {
  if (attempts <= 2) return { label: "insufficient_data", score: Math.min(0.24, attempts * 0.12) };
  if (attempts <= 5) return { label: "early_estimate", score: 0.25 + (attempts - 3) * 0.08 };
  if (attempts <= 11) return { label: "growing_confidence", score: 0.5 + (attempts - 6) * 0.06 };
  return { label: "reliable_estimate", score: Math.min(1, 0.82 + (attempts - 12) * 0.01) };
}

function aggregateSessions(rows: readonly ProgressObservation[]) {
  const sessions = new Map<string, ProgressObservation[]>();
  rows.forEach((row) => sessions.set(row.sessionId, [...(sessions.get(row.sessionId) ?? []), row]));
  return [...sessions.entries()].map(([sessionId, items]) => ({
    sessionId,
    answeredAt: items.reduce((latest, item) => item.answeredAt > latest ? item.answeredAt : latest, items[0].answeredAt),
    accuracy: items.filter((item) => item.correct).length / items.length * 100,
    attempts: items.length,
    source: items[0].source,
  })).sort((a, b) => b.answeredAt.localeCompare(a.answeredAt));
}

export function trendFor(rows: readonly ProgressObservation[]): Trend {
  const sessions = aggregateSessions(rows);
  if (sessions.length < 4 || rows.length < 12) return "insufficient_data";
  const recent = sessions.slice(0, Math.min(3, Math.floor(sessions.length / 2)));
  const prior = sessions.slice(recent.length, recent.length * 2);
  if (prior.length < 2) return "insufficient_data";
  const weighted = (values: typeof recent) => values.reduce((sum, value) => sum + value.accuracy * value.attempts, 0)
    / values.reduce((sum, value) => sum + value.attempts, 0);
  const delta = weighted(recent) - weighted(prior);
  return delta >= 10 ? "improving" : delta <= -10 ? "declining" : "stable";
}

function recentWindow(rows: readonly ProgressObservation[]) {
  const bySession = new Map<string, ProgressObservation[]>();
  [...rows].sort((a, b) => b.answeredAt.localeCompare(a.answeredAt)).forEach((row) => {
    bySession.set(row.sessionId, [...(bySession.get(row.sessionId) ?? []), row]);
  });
  return [...bySession.values()].slice(0, 4).flatMap((session) => session.slice(0, 5));
}

function metricFor(rows: readonly ProgressObservation[]): ProgressMetric {
  const ordered = [...rows].sort((a, b) => b.answeredAt.localeCompare(a.answeredAt));
  const attempts = rows.length;
  const correct = rows.filter((row) => row.correct).length;
  const difficultyMix = emptyDifficulty();
  const sourceMix = emptySources();
  rows.forEach((row) => {
    difficultyMix[row.difficulty].attempts += 1;
    if (row.correct) difficultyMix[row.difficulty].correct += 1;
    sourceMix[row.source].attempts += 1;
    if (row.correct) sourceMix[row.source].correct += 1;
  });
  Object.values(difficultyMix).forEach((value) => { value.accuracy = percentage(value.correct, value.attempts); });
  Object.values(sourceMix).forEach((value) => { value.accuracy = percentage(value.correct, value.attempts); });
  const recent = recentWindow(ordered);
  const recentIds = new Set(recent.map((row) => row.id));
  const historical = ordered.filter((row) => !recentIds.has(row.id));
  const normalized = attempts
    ? Math.min(100, rows.reduce((sum, row) => sum + (row.correct ? 100 * DIFFICULTY_CREDIT[row.difficulty] : 0), 0) / attempts)
    : null;
  const validTimes = rows.map((row) => row.responseTimeSeconds).filter((value) => Number.isFinite(value) && value >= 0);
  const paceRows = rows.filter((row) => row.expectedTimeSeconds && row.expectedTimeSeconds > 0);
  const paceRatio = paceRows.length
    ? median(paceRows.map((row) => row.responseTimeSeconds / (row.expectedTimeSeconds ?? 1)))
    : null;
  const accuracy = percentage(correct, attempts);
  const confidence = confidenceFor(attempts);
  const speedState = attempts < 3 || paceRatio === null || accuracy === null
    ? "insufficient_data"
    : accuracy >= 70 && paceRatio <= 0.9 ? "accurate_fast"
      : accuracy >= 70 && paceRatio >= 1.2 ? "accurate_slower"
        : accuracy < 60 && paceRatio <= 0.9 ? "fast_inaccurate"
          : "on_pace";
  return {
    attemptCount: attempts,
    correctCount: correct,
    accuracy,
    normalizedAccuracy: normalized,
    averageResponseTime: validTimes.length ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : null,
    medianResponseTime: median(validTimes),
    difficultyMix,
    sourceMix,
    recentAccuracy: percentage(recent.filter((row) => row.correct).length, recent.length),
    historicalAccuracy: percentage(historical.filter((row) => row.correct).length, historical.length),
    trend: trendFor(rows),
    confidence: confidence.label,
    confidenceScore: confidence.score,
    speedState,
  };
}

function statusFor(metric: ProgressMetric, evidenceCount = metric.attemptCount): { status: PerformanceStatus; weaknessScore: number } {
  if (evidenceCount <= 2) return { status: "insufficient_data", weaknessScore: 0 };
  const recent = metric.recentAccuracy ?? metric.accuracy ?? 0;
  const normalized = metric.normalizedAccuracy ?? metric.accuracy ?? 0;
  const incorrectRate = 100 - (metric.accuracy ?? 0);
  const sourceValues = Object.values(metric.sourceMix).filter((source) => source.attempts >= 3 && source.accuracy !== null);
  const sourceConsistency = sourceValues.length >= 2 && sourceValues.every((source) => (source.accuracy ?? 100) < 65);
  const weaknessScore = Math.min(100,
    (100 - recent) * 0.4 + (100 - normalized) * 0.3 + incorrectRate * 0.15
    + (metric.trend === "declining" ? 10 : 0) + (sourceConsistency ? 5 : 0));
  if (evidenceCount <= 5) return { status: "developing", weaknessScore };
  if (weaknessScore >= 50 && (recent < 60 || metric.trend === "declining")) return { status: "needs_attention", weaknessScore };
  if (evidenceCount >= 12 && recent >= 80 && normalized >= 80 && metric.trend !== "declining") {
    return { status: "strong", weaknessScore };
  }
  return { status: weaknessScore >= 30 ? "developing" : "stable", weaknessScore };
}

function skillMetric(skillId: CoreSkillId, rows: readonly ProgressObservation[]): SkillPerformance {
  const skill = coreSkill(skillId)!;
  const relevant = rows.filter((row) => row.skills.includes(skillId));
  const metric = metricFor(relevant);
  const effectiveAttemptCount = relevant.reduce((sum, row) => sum + 1 / Math.max(1, row.skills.length), 0);
  const confidence = confidenceFor(effectiveAttemptCount);
  const confidenceAdjustedMetric = { ...metric, confidence: confidence.label, confidenceScore: confidence.score };
  const status = statusFor(confidenceAdjustedMetric, effectiveAttemptCount);
  return { ...confidenceAdjustedMetric, ...status, skillId, label: skill.label, module: skill.module, effectiveAttemptCount };
}

function recommendationFor(skill: SkillPerformance): PracticeRecommendation {
  const hardAttempts = skill.difficultyMix.hard.attempts;
  const mediumAttempts = skill.difficultyMix.medium.attempts;
  const inferredDifficulty: GenerationDifficulty = hardAttempts >= 3 && (skill.difficultyMix.hard.accuracy ?? 100) < 65
    ? "hard" : mediumAttempts >= 3 || skill.attemptCount >= 6 ? "medium" : "easy";
  const minimumDifficulty: Partial<Record<CoreSkillId, GenerationDifficulty>> = {
    figure_progressive_movement: "medium",
    figure_progressive_rotation: "medium",
    figure_multi_object: "medium",
    figure_combined_transformations: "medium",
    equation_chains: "medium",
    equation_branching: "hard",
    equation_multi_variable: "hard",
    equation_substitution: "medium",
    equation_multi_variable_balance: "hard",
    latin_single_intermediate: "medium",
    latin_chained: "hard",
    latin_multi_stage: "hard",
  };
  const order: GenerationDifficulty[] = ["easy", "medium", "hard"];
  const minimum = minimumDifficulty[skill.skillId] ?? "easy";
  const difficulty = order[Math.max(order.indexOf(inferredDifficulty), order.indexOf(minimum))];
  const recent = Math.round(skill.recentAccuracy ?? skill.accuracy ?? 0);
  const reason = skill.status === "needs_attention"
    ? `Recent accuracy is ${recent}% across ${skill.attemptCount} relevant questions, which is enough evidence to focus here.`
    : `${skill.attemptCount} relevant questions show an early pattern. A short set will make the estimate more reliable.`;
  const params = new URLSearchParams({ module: skill.module, difficulty, count: "10", focus: skill.skillId });
  return {
    skillId: skill.skillId,
    skill: skill.label,
    module: skill.module,
    difficulty,
    questionCount: 10,
    reason,
    priority: skill.status === "needs_attention" ? "high" : "medium",
    href: `/practice?${params.toString()}`,
  };
}

export function buildCoreProgress(observations: readonly ProgressObservation[], now = new Date()): CoreProgress {
  const modules = CORE_MODULES.map((module): ModuleProgress => {
    const rows = observations.filter((row) => row.module === module);
    return {
      ...metricFor(rows),
      module,
      label: MODULE_LABELS[module],
      skills: skillsForModule(module).map((skill) => skillMetric(skill.id, observations)),
      recentSessions: aggregateSessions(rows).slice(0, 8),
    };
  });
  const allSkills = modules.flatMap((module) => module.skills);
  const weakAreas = allSkills.filter((skill) => skill.status === "needs_attention")
    .sort((a, b) => b.weaknessScore - a.weaknessScore);
  const developing = allSkills.filter((skill) => skill.status === "developing" && skill.attemptCount >= 3)
    .sort((a, b) => b.weaknessScore - a.weaknessScore);
  return {
    generatedAt: now.toISOString(),
    totalQuestions: observations.length,
    modules,
    weakAreas,
    strongAreas: allSkills.filter((skill) => skill.status === "strong").sort((a, b) => (b.normalizedAccuracy ?? 0) - (a.normalizedAccuracy ?? 0)),
    recommendations: [...weakAreas, ...developing].slice(0, 3).map(recommendationFor),
  };
}

export function getModuleFromProgress(progress: CoreProgress, module: PracticeModule) {
  return progress.modules.find((item) => item.module === module) ?? null;
}

export function getSkillFromProgress(progress: CoreProgress, skillId: CoreSkillId) {
  return progress.modules.flatMap((module) => module.skills).find((skill) => skill.skillId === skillId) ?? null;
}
