import type { GenerationDifficulty } from "@/lib/generation/types";
import type { PracticeModule } from "@/lib/practice/schemas";
import { MODULE_LABELS } from "@/lib/progress/model";
import { coreSkill, type CoreSkillId } from "@/lib/progress/skills";

import type { AttemptResult, ResultQuestion } from "./schemas";

export type MockTimingClassification =
  | "fast_correct"
  | "fast_incorrect"
  | "slow_correct"
  | "slow_incorrect"
  | "typical"
  | "unavailable";

export type RawBreakdown = {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number | null;
  scoreAccuracy: number | null;
};

export type MockQuestionAnalysis = {
  questionId: string;
  questionNumber: number;
  module: PracticeModule;
  skillIds: CoreSkillId[];
  timing: MockTimingClassification;
  paceRatio: number | null;
};

export type MockSkillLoss = {
  skillId: CoreSkillId;
  label: string;
  module: PracticeModule;
  incorrectQuestions: number;
  weightedMarkLoss: number;
  difficulties: Record<GenerationDifficulty, number>;
};

export type MockSectionAnalysis = RawBreakdown & {
  module: PracticeModule;
  label: string;
  medianResponseTimeSeconds: number | null;
  recordedQuestionTimeSeconds: number;
  timingSampleCount: number;
  difficulty: Record<GenerationDifficulty, RawBreakdown>;
  skills: MockSkillLoss[];
};

export type MockRecommendation = {
  skillId: CoreSkillId;
  skill: string;
  module: PracticeModule;
  difficulty: GenerationDifficulty;
  questionCount: 5 | 10;
  reason: string;
  href: string;
};

export type MockAnalysis = {
  attemptId: string;
  eligible: boolean;
  limitation: string | null;
  origin: AttemptResult["origin"];
  autoSubmitted: boolean;
  overall: RawBreakdown & { totalTimeSeconds: number };
  sections: MockSectionAnalysis[];
  strongestSection: PracticeModule | null;
  weakestSection: PracticeModule | null;
  skillLosses: MockSkillLoss[];
  timingAvailable: boolean;
  questionAnalysis: MockQuestionAnalysis[];
  insights: string[];
  longitudinalContext: string[];
  recommendations: MockRecommendation[];
  practiceMistakesHref: string | null;
};

const MODULES: PracticeModule[] = ["figure_sequence", "mathematical_equation", "latin_square"];
const DIFFICULTIES: GenerationDifficulty[] = ["easy", "medium", "hard"];

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function breakdown(questions: readonly ResultQuestion[]): RawBreakdown {
  const attempted = questions.filter((question) => question.responseStatus === "answered").length;
  const correct = questions.filter((question) => question.responseStatus === "answered" && question.isCorrect).length;
  return {
    total: questions.length,
    attempted,
    correct,
    incorrect: attempted - correct,
    unanswered: questions.length - attempted,
    accuracy: attempted ? correct / attempted * 100 : null,
    scoreAccuracy: questions.length ? correct / questions.length * 100 : null,
  };
}

function emptyDifficulty(): Record<GenerationDifficulty, number> {
  return { easy: 0, medium: 0, hard: 0 };
}

function skillLosses(questions: readonly ResultQuestion[]): MockSkillLoss[] {
  const losses = new Map<CoreSkillId, MockSkillLoss>();
  questions.filter((question) => question.responseStatus === "answered" && !question.isCorrect && question.skillIds?.length)
    .forEach((question) => {
      const skills = question.skillIds ?? [];
      skills.forEach((skillId) => {
        const skill = coreSkill(skillId);
        if (!skill) return;
        const current = losses.get(skillId) ?? {
          skillId, label: skill.label, module: skill.module, incorrectQuestions: 0,
          weightedMarkLoss: 0, difficulties: emptyDifficulty(),
        };
        current.incorrectQuestions += 1;
        current.weightedMarkLoss += 1 / skills.length;
        current.difficulties[question.difficulty] += 1 / skills.length;
        losses.set(skillId, current);
      });
    });
  return [...losses.values()].sort((left, right) =>
    right.weightedMarkLoss - left.weightedMarkLoss || right.incorrectQuestions - left.incorrectQuestions || left.label.localeCompare(right.label));
}

function classifyTiming(question: ResultQuestion, correctBaseline: number | null): { timing: MockTimingClassification; ratio: number | null } {
  if (question.responseStatus !== "answered" || question.timeSpentSeconds <= 0 || correctBaseline === null) {
    return { timing: "unavailable", ratio: null };
  }
  const ratio = question.timeSpentSeconds / correctBaseline;
  if (ratio <= 0.65) return { timing: question.isCorrect ? "fast_correct" : "fast_incorrect", ratio };
  if (ratio >= 1.5) return { timing: question.isCorrect ? "slow_correct" : "slow_incorrect", ratio };
  return { timing: "typical", ratio };
}

function dominantDifficulty(loss: MockSkillLoss): GenerationDifficulty {
  return DIFFICULTIES.reduce((best, current) => loss.difficulties[current] > loss.difficulties[best] ? current : best, "easy");
}

function recommendations(losses: MockSkillLoss[]): MockRecommendation[] {
  return losses.filter((loss) => loss.incorrectQuestions >= 2 && loss.weightedMarkLoss >= 1)
    .slice(0, 3).map((loss) => {
      const difficulty = dominantDifficulty(loss);
      const questionCount = loss.incorrectQuestions >= 4 ? 10 : 5;
      const params = new URLSearchParams({ module: loss.module, difficulty, count: String(questionCount) });
      return {
        skillId: loss.skillId,
        skill: MODULE_LABELS[loss.module],
        module: loss.module,
        difficulty,
        questionCount,
        reason: `${loss.incorrectQuestions} incorrect questions in this mock point to more practice in ${MODULE_LABELS[loss.module]}.`,
        href: `/practice?${params.toString()}`,
      };
    });
}

export function analyzeMockAttempt(attempt: AttemptResult): MockAnalysis {
  const overall = { ...breakdown(attempt.questions), totalTimeSeconds: attempt.totalTimeSeconds };
  if (!attempt.hasImmutableSnapshots || !attempt.questions.length) {
    return {
      attemptId: attempt.id, eligible: false,
      limitation: "Advanced analysis is unavailable because this legacy attempt does not have a complete immutable snapshot.",
      origin: attempt.origin, autoSubmitted: attempt.status === "auto_submitted", overall,
      sections: [], strongestSection: null, weakestSection: null, skillLosses: [], timingAvailable: false,
      questionAnalysis: [], insights: [], longitudinalContext: [], recommendations: [], practiceMistakesHref: null,
    };
  }

  const baselines = new Map<PracticeModule, number | null>();
  MODULES.forEach((module) => {
    const correctTimes = attempt.questions.filter((question) => question.questionType === module && question.isCorrect && question.timeSpentSeconds > 0)
      .map((question) => question.timeSpentSeconds);
    baselines.set(module, correctTimes.length >= 3 ? median(correctTimes) : null);
  });
  const questionAnalysis = attempt.questions.map((question, index): MockQuestionAnalysis => {
    const questionModule = question.questionType;
    const timing = classifyTiming(question, baselines.get(questionModule) ?? null);
    return {
      questionId: question.id,
      questionNumber: question.questionNumber ?? index + 1,
      module: questionModule,
      skillIds: question.skillIds ?? [],
      timing: timing.timing,
      paceRatio: timing.ratio,
    };
  });
  const losses = skillLosses(attempt.questions);
  const sections = MODULES.map((module): MockSectionAnalysis => {
    const questions = attempt.questions.filter((question) => question.questionType === module);
    const times = questions.filter((question) => question.responseStatus === "answered" && question.timeSpentSeconds > 0)
      .map((question) => question.timeSpentSeconds);
    return {
      module,
      label: MODULE_LABELS[module],
      ...breakdown(questions),
      medianResponseTimeSeconds: median(times),
      recordedQuestionTimeSeconds: times.reduce((sum, value) => sum + value, 0),
      timingSampleCount: times.length,
      difficulty: Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, breakdown(questions.filter((question) => question.difficulty === difficulty))])) as Record<GenerationDifficulty, RawBreakdown>,
      skills: losses.filter((loss) => loss.module === module),
    };
  });
  const comparable = sections.filter((section) => section.total >= 5);
  const ordered = [...comparable].sort((left, right) => (right.scoreAccuracy ?? -1) - (left.scoreAccuracy ?? -1));
  const meaningfulDifference = ordered.length >= 2 && (ordered[0].scoreAccuracy ?? 0) - (ordered.at(-1)?.scoreAccuracy ?? 0) >= 7;
  const strongestSection = meaningfulDifference ? ordered[0].module : null;
  const weakestSection = meaningfulDifference ? ordered.at(-1)!.module : null;
  const timingAvailable = questionAnalysis.filter((question) => question.timing !== "unavailable").length >= 3;
  const insights: string[] = [];
  if (weakestSection) {
    const section = sections.find((value) => value.module === weakestSection)!;
    insights.push(`${section.label} was the lowest-scoring section at ${section.correct}/${section.total} correct.`);
  }
  const leadingLoss = losses.find((loss) => loss.incorrectQuestions >= 2 && loss.weightedMarkLoss >= 1);
  if (leadingLoss) insights.push(`${leadingLoss.label} appeared in ${leadingLoss.incorrectQuestions} incorrect answers (${leadingLoss.weightedMarkLoss.toFixed(1)} weighted marks).`);
  const fastIncorrect = questionAnalysis.filter((question) => question.timing === "fast_incorrect");
  if (fastIncorrect.length >= 3) insights.push(`${fastIncorrect.length} incorrect answers were substantially faster than your correct-answer pace in their section.`);
  const slowIncorrect = questionAnalysis.filter((question) => question.timing === "slow_incorrect");
  if (slowIncorrect.length >= 3) insights.push(`${slowIncorrect.length} incorrect answers took substantially longer than your correct-answer pace in their section.`);
  if (attempt.status === "auto_submitted" && overall.unanswered > 0) {
    insights.push(`The mock was submitted automatically with ${overall.unanswered} unanswered question${overall.unanswered === 1 ? "" : "s"}.`);
  }
  for (const section of sections) {
    const medium = section.difficulty.medium;
    const hard = section.difficulty.hard;
    if (medium.attempted >= 3 && hard.attempted >= 3 && (hard.accuracy ?? 0) - (medium.accuracy ?? 0) >= 15 && insights.length < 5) {
      insights.push(`Hard ${section.label} questions were stronger than Medium in this mock.`);
      break;
    }
  }
  const next = recommendations(losses);
  return {
    attemptId: attempt.id,
    eligible: true,
    limitation: null,
    origin: attempt.origin,
    autoSubmitted: attempt.status === "auto_submitted",
    overall,
    sections,
    strongestSection,
    weakestSection,
    skillLosses: losses.filter((loss) => loss.incorrectQuestions >= 2 && loss.weightedMarkLoss >= 1),
    timingAvailable,
    questionAnalysis,
    insights: insights.slice(0, 5),
    longitudinalContext: [],
    recommendations: next,
    practiceMistakesHref: next[0]?.href ?? null,
  };
}

export function getSectionAnalysis(analysis: MockAnalysis, module: PracticeModule) {
  return analysis.sections.find((section) => section.module === module) ?? null;
}

export function getMockMistakes(analysis: MockAnalysis) {
  return analysis.skillLosses;
}

export function getMockRecommendations(analysis: MockAnalysis) {
  return analysis.recommendations;
}
