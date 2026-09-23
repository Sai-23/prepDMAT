import { z } from "zod";

import {
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_SKILLS,
  type GeneralAcademicDomain,
  type GeneralAcademicSkill,
} from "./registries";

export const GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS = 3;
export const GENERAL_ACADEMIC_WEAK_ACCURACY_PERCENT = 70;
export const GENERAL_ACADEMIC_RECENT_ATTEMPTS = 5;

const metricFields = {
  attempted: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  unanswered: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(100),
};

export const generalAcademicLearningAnalyticsSchema = z.object({
  completedPacks: z.number().int().nonnegative(),
  attempted: metricFields.attempted,
  answered: metricFields.answered,
  correct: metricFields.correct,
  incorrect: metricFields.incorrect,
  unanswered: metricFields.unanswered,
  accuracy: metricFields.accuracy,
  recentAccuracy: metricFields.accuracy,
  skills: z.array(z.object({ skill: z.enum(GENERAL_ACADEMIC_SKILLS), ...metricFields }).strict()),
  domains: z.array(z.object({ domain: z.enum(GENERAL_ACADEMIC_DOMAINS), ...metricFields }).strict()),
}).strict();

export type GeneralAcademicMetric = {
  attempted: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
};

export type GeneralAcademicSkillMetric = GeneralAcademicMetric & {
  skill: GeneralAcademicSkill;
  isWeak: boolean;
};

export type GeneralAcademicDomainMetric = GeneralAcademicMetric & {
  domain: GeneralAcademicDomain;
  isWeak: boolean;
};

export type GeneralAcademicLearningAnalytics = {
  completedPacks: number;
  attempted: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  recentAccuracy: number;
  skills: GeneralAcademicSkillMetric[];
  domains: GeneralAcademicDomainMetric[];
};

export type GeneralAcademicLearningObservation = {
  attemptId: string;
  submittedAt: string;
  domain: GeneralAcademicDomain;
  skill: GeneralAcademicSkill;
  result: "correct" | "incorrect" | "unanswered";
};

export type GeneralAcademicInventory = {
  skills: readonly GeneralAcademicSkill[];
  domains: readonly GeneralAcademicDomain[];
};

export type GeneralAcademicActiveMistakeSummary = {
  skill: GeneralAcademicSkill;
  count: number;
  lastMissedAt: string;
};

type GeneralAcademicRecommendationBase = {
  reason: string;
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  href: "/practice/general-academic"
    | `/practice/general-academic?skill=${GeneralAcademicSkill}`
    | `/practice/general-academic?domain=${GeneralAcademicDomain}`;
};

export type GeneralAcademicPracticeRecommendation = GeneralAcademicRecommendationBase & (
  | { type: "skill"; target: GeneralAcademicSkill }
  | { type: "domain"; target: GeneralAcademicDomain }
  | { type: "mixed"; target: null }
);

function accuracy(correct: number, attempted: number) {
  return attempted ? (correct / attempted) * 100 : 0;
}

export function isWeakGeneralAcademicMetric(metric: GeneralAcademicMetric) {
  return metric.attempted >= GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS
    && metric.accuracy < GENERAL_ACADEMIC_WEAK_ACCURACY_PERCENT;
}

export function parseGeneralAcademicLearningAnalytics(value: unknown): GeneralAcademicLearningAnalytics {
  const parsed = generalAcademicLearningAnalyticsSchema.parse(value);
  return {
    ...parsed,
    skills: parsed.skills.map((metric) => ({ ...metric, isWeak: isWeakGeneralAcademicMetric(metric) })),
    domains: parsed.domains.map((metric) => ({ ...metric, isWeak: isWeakGeneralAcademicMetric(metric) })),
  };
}

export function buildGeneralAcademicLearningAnalytics(
  observations: readonly GeneralAcademicLearningObservation[],
): GeneralAcademicLearningAnalytics {
  const aggregate = <Key extends string>(values: readonly GeneralAcademicLearningObservation[], key: (row: GeneralAcademicLearningObservation) => Key) => {
    const groups = new Map<Key, GeneralAcademicLearningObservation[]>();
    for (const row of values) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
    return [...groups.entries()].map(([id, rows]) => {
      const correct = rows.filter((row) => row.result === "correct").length;
      const incorrect = rows.filter((row) => row.result === "incorrect").length;
      const unanswered = rows.filter((row) => row.result === "unanswered").length;
      return { id, attempted: rows.length, answered: correct + incorrect, correct, incorrect, unanswered, accuracy: accuracy(correct, rows.length) };
    });
  };
  const attemptIds = [...new Set([...observations]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt) || right.attemptId.localeCompare(left.attemptId))
    .map((row) => row.attemptId))];
  const recentIds = new Set(attemptIds.slice(0, GENERAL_ACADEMIC_RECENT_ATTEMPTS));
  const recent = observations.filter((row) => recentIds.has(row.attemptId));
  const correct = observations.filter((row) => row.result === "correct").length;
  const incorrect = observations.filter((row) => row.result === "incorrect").length;
  const unanswered = observations.filter((row) => row.result === "unanswered").length;
  return {
    completedPacks: attemptIds.length,
    attempted: observations.length,
    answered: correct + incorrect,
    correct,
    incorrect,
    unanswered,
    accuracy: accuracy(correct, observations.length),
    recentAccuracy: accuracy(recent.filter((row) => row.result === "correct").length, recent.length),
    skills: aggregate(observations, (row) => row.skill).map(({ id, ...metric }) => ({ skill: id, ...metric, isWeak: isWeakGeneralAcademicMetric(metric) })),
    domains: aggregate(observations, (row) => row.domain).map(({ id, ...metric }) => ({ domain: id, ...metric, isWeak: isWeakGeneralAcademicMetric(metric) })),
  };
}

export function getGeneralAcademicPracticeRecommendations(
  analytics: GeneralAcademicLearningAnalytics,
  inventory: GeneralAcademicInventory,
  activeMistakes: readonly GeneralAcademicActiveMistakeSummary[],
): GeneralAcademicPracticeRecommendation[] {
  const recommendations: GeneralAcademicPracticeRecommendation[] = [];
  const availableSkills = new Set(inventory.skills);
  const availableDomains = new Set(inventory.domains);
  const mistakeBySkill = new Map(activeMistakes.map((item) => [item.skill, item]));
  const weakSkills = analytics.skills
    .filter((metric) => metric.isWeak && availableSkills.has(metric.skill))
    .sort((left, right) => left.accuracy - right.accuracy || right.attempted - left.attempted
      || (mistakeBySkill.get(right.skill)?.lastMissedAt ?? "").localeCompare(mistakeBySkill.get(left.skill)?.lastMissedAt ?? "")
      || left.skill.localeCompare(right.skill));
  const weakWithMistakes = weakSkills.filter((metric) => (mistakeBySkill.get(metric.skill)?.count ?? 0) > 0);
  for (const metric of weakWithMistakes) {
    const mistakes = mistakeBySkill.get(metric.skill)!.count;
    recommendations.push({ type: "skill", target: metric.skill, reason: `${mistakes} active mistake${mistakes === 1 ? "" : "s"} and ${Math.round(metric.accuracy)}% accuracy`, priority: 1, href: `/practice/general-academic?skill=${metric.skill}` });
  }
  for (const metric of weakSkills.filter((item) => !weakWithMistakes.some((weak) => weak.skill === item.skill))) {
    recommendations.push({ type: "skill", target: metric.skill, reason: `${metric.correct} of ${metric.attempted} correct (${Math.round(metric.accuracy)}%)`, priority: 2, href: `/practice/general-academic?skill=${metric.skill}` });
  }
  for (const metric of analytics.domains.filter((item) => item.isWeak && availableDomains.has(item.domain)).sort((left, right) => left.accuracy - right.accuracy || right.attempted - left.attempted || left.domain.localeCompare(right.domain))) {
    recommendations.push({ type: "domain", target: metric.domain, reason: `${metric.correct} of ${metric.attempted} correct (${Math.round(metric.accuracy)}%)`, priority: 3, href: `/practice/general-academic?domain=${metric.domain}` });
  }
  const practisedSkills = new Set(analytics.skills.map((metric) => metric.skill));
  for (const skill of GENERAL_ACADEMIC_SKILLS.filter((item) => availableSkills.has(item) && !practisedSkills.has(item))) {
    recommendations.push({ type: "skill", target: skill, reason: "No completed practice for this skill yet", priority: 4, href: `/practice/general-academic?skill=${skill}` });
  }
  const practisedDomains = new Set(analytics.domains.map((metric) => metric.domain));
  for (const domain of GENERAL_ACADEMIC_DOMAINS.filter((item) => availableDomains.has(item) && !practisedDomains.has(item))) {
    recommendations.push({ type: "domain", target: domain, reason: "No completed practice in this domain yet", priority: 5, href: `/practice/general-academic?domain=${domain}` });
  }
  recommendations.push({ type: "mixed", target: null, reason: analytics.completedPacks ? "Continue with another published source pack" : "Start with a published source pack", priority: 6, href: "/practice/general-academic" });
  return recommendations.slice(0, 3);
}
