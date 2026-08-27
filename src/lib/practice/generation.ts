import "server-only";

import {
  figureSequenceStructuralProfile,
  generateValidatedFigureSequence,
  type FigureSequenceQuestion,
} from "@/lib/generation/figure-sequences";
import {
  generateValidatedLatinSquare,
  latinSquareStructuralProfile,
  type LatinSquareQuestion,
} from "@/lib/generation/latin-squares";
import {
  generateValidatedMathematicalEquation,
  mathematicalEquationStructuralProfile,
  mathematicalEquationStructuralSignature,
  type MathematicalEquationQuestion,
} from "@/lib/generation/mathematical-equations";
import type { StructuralProfile } from "@/lib/generation/novelty";
import { SeededRandom } from "@/lib/generation/random";
import type { GenerationDifficulty } from "@/lib/generation/types";
import { DMAT_CURRENT_CORE_PROTOCOL } from "@/lib/protocol";
import { coreSkill, mapQuestionToSkills, type CoreSkillId } from "@/lib/progress/skills";

import { createPracticeSnapshots } from "./native";
import type { PracticeDifficulty, PracticeModule } from "./schemas";

type Generated = FigureSequenceQuestion | MathematicalEquationQuestion | LatinSquareQuestion;

export type PracticeItemManifest = {
  source_question_id: string | null;
  question_key: string;
  position: number;
  question_type: PracticeModule;
  difficulty: GenerationDifficulty;
  public_snapshot: unknown;
  private_snapshot: unknown;
  generator_version: string;
  validator_version: string;
  seed: string;
  fingerprint: string;
  structural_profile: StructuralProfile;
  reasoning_family: string;
  reasoning_classification: string;
};

function profileFor(question: Generated): StructuralProfile {
  if (question.questionType === "figure_sequence") return figureSequenceStructuralProfile(question);
  if (question.questionType === "mathematical_equation") return mathematicalEquationStructuralProfile(question);
  return latinSquareStructuralProfile(question);
}

export function practiceReasoningFamily(module: PracticeModule, profile: StructuralProfile): string {
  const features = profile.features;
  if (module === "figure_sequence") {
    const value = features.movementKinds;
    return Array.isArray(value) ? value.join("+") : String(value ?? "unknown");
  }
  if (module === "mathematical_equation") {
    const relationships = features.relationships;
    return `${String(features.graph ?? "unknown")}|${Array.isArray(relationships) ? relationships.join("+") : String(relationships ?? "unknown")}`;
  }
  return `${String(features.targetReasoning ?? "unknown")}|depth-${String(features.targetDepth ?? "unknown")}`;
}

function reasoningClassification(module: PracticeModule, profile: StructuralProfile): string {
  if (module === "figure_sequence") {
    const value = profile.features.movementKinds;
    return Array.isArray(value) ? value.join(" + ") : String(value ?? "unknown");
  }
  if (module === "mathematical_equation") return String(profile.features.graph ?? "unknown");
  return String(profile.features.targetReasoning ?? "unknown");
}

export function practiceDifficultyOrder(
  difficulty: PracticeDifficulty,
  count: number,
  seed: string,
): GenerationDifficulty[] {
  if (difficulty !== "mixed") return Array.from({ length: count }, () => difficulty);
  const values = Array.from({ length: count }, (_, index) =>
    (["easy", "medium", "hard"] as const)[index % 3]);
  return new SeededRandom(`${seed}\u001fdifficulty`).shuffle(values);
}

function generate(
  module: PracticeModule,
  difficulty: GenerationDifficulty,
  seed: string,
  fingerprints: ReadonlySet<string>,
  equationSignatures: ReadonlySet<string>,
  recentProfiles: readonly StructuralProfile[],
): Generated {
  if (module === "figure_sequence") {
    return generateValidatedFigureSequence({ seed, difficulty, maxAttempts: 5_000 }, fingerprints, recentProfiles);
  }
  if (module === "mathematical_equation") {
    return generateValidatedMathematicalEquation(
      { seed, difficulty, maxAttempts: 100 }, fingerprints, equationSignatures, recentProfiles,
    );
  }
  return generateValidatedLatinSquare({ seed, difficulty, maxAttempts: 5_000 }, fingerprints, recentProfiles);
}

function storedStructuredData(question: Generated): Record<string, unknown> {
  const base = {
    schemaVersion: 1,
    task: question.structuredData,
    presentation: question.presentation,
    response: question.response,
  };
  if (question.questionType === "figure_sequence") {
    return { ...base, sequence: question.sequence, solutionFrames: question.solutionFrames };
  }
  if (question.questionType === "mathematical_equation") {
    return {
      ...base,
      solutionPath: question.solutionPath,
      reasoningPath: question.reasoningPath,
      fastestMethod: question.fastestMethod,
    };
  }
  return {
    ...base,
    deductionTrace: question.deductionTrace,
    completedGrid: question.completedGrid,
  };
}

export function generatePracticeManifest(input: {
  module: PracticeModule;
  difficulty: PracticeDifficulty;
  questionCount: 5 | 10 | 20;
  masterSeed: string;
  focusSkills?: CoreSkillId[];
  blockedFingerprints?: readonly string[];
  recentProfiles?: readonly StructuralProfile[];
  createId?: () => string;
}): PracticeItemManifest[] {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const difficulties = practiceDifficultyOrder(input.difficulty, input.questionCount, input.masterSeed);
  const fingerprints = new Set<string>(input.blockedFingerprints ?? []);
  const equationSignatures = new Set<string>();
  const profiles: StructuralProfile[] = [...(input.recentProfiles ?? [])];
  const result: PracticeItemManifest[] = [];
  let previousFamily: string | null = null;
  const focusSkills = (input.focusSkills ?? []).filter((skillId) => coreSkill(skillId)?.module === input.module);

  difficulties.forEach((difficulty, index) => {
    type Candidate = { question: Generated; profile: StructuralProfile; family: string; seed: string };
    let accepted: Candidate | null = null;
    let spacingFallback: Candidate | null = null;
    let lastGenerationError: unknown = null;
    const targetSkill = focusSkills.length ? focusSkills[index % focusSkills.length] : null;
    for (let retry = 1; retry <= (targetSkill ? 36 : 12); retry += 1) {
      const seed = `${input.masterSeed}/${input.module}/${index + 1}/retry-${retry}`;
      let question: Generated;
      try {
        question = generate(
          input.module,
          difficulty,
          seed,
          fingerprints,
          equationSignatures,
          profiles.slice(-3),
        );
      } catch (error) {
        lastGenerationError = error;
        continue;
      }
      const profile = profileFor(question);
      const family = practiceReasoningFamily(input.module, profile);
      const candidate = { question, profile, family, seed };
      spacingFallback ??= candidate;
      const trace = question.questionType === "figure_sequence"
        ? { rules: question.structuredData.rules }
        : question.questionType === "mathematical_equation"
          ? question.solutionPath
          : question.deductionTrace;
      const skills = mapQuestionToSkills({
        module: input.module,
        structuralProfile: profile,
        publicSnapshot: { structuredData: question.structuredData },
        explanationTrace: trace,
      });
      if ((!targetSkill || skills.includes(targetSkill)) && family !== previousFamily) {
        accepted = candidate;
        break;
      }
    }
    accepted ??= spacingFallback;
    if (!accepted) {
      throw new Error(`Unable to generate practice question ${index + 1}.`, {
        cause: lastGenerationError,
      });
    }
    const questionKey = createId();
    const snapshot = createPracticeSnapshots({
      id: questionKey,
      module: "core",
      questionType: accepted.question.questionType,
      topic: accepted.question.topic,
      subtopic: accepted.question.subtopic ?? null,
      difficulty,
      questionText: accepted.question.presentation.prompt,
      passage: null,
      code: null,
      formula: null,
      tableData: null,
      imageUrl: null,
      estimatedTimeSeconds: accepted.question.estimatedSolveTimeSeconds,
      structuredData: storedStructuredData(accepted.question),
      metadata: {
        generation: accepted.question.metadata,
        validation: accepted.question.validation,
        correctAnswer: accepted.question.correctAnswer,
      },
      explanation: accepted.question.explanation,
      options: [],
      correctOptionId: null,
      sourceType: "generated",
    });
    fingerprints.add(accepted.question.metadata.fingerprint);
    profiles.push(accepted.profile);
    if (accepted.question.questionType === "mathematical_equation") {
      equationSignatures.add(mathematicalEquationStructuralSignature(accepted.question));
    }
    previousFamily = accepted.family;
    result.push({
      source_question_id: null,
      question_key: questionKey,
      position: index + 1,
      question_type: input.module,
      difficulty,
      public_snapshot: snapshot.publicQuestion,
      private_snapshot: snapshot.privateSnapshot,
      generator_version: accepted.question.metadata.generatorVersion,
      validator_version: accepted.question.metadata.validatorVersion,
      seed: accepted.seed,
      fingerprint: accepted.question.metadata.fingerprint,
      structural_profile: accepted.profile,
      reasoning_family: accepted.family,
      reasoning_classification: reasoningClassification(input.module, accepted.profile),
    });
  });
  return result;
}

export function practiceDurationSeconds(
  module: PracticeModule,
  count: number,
  timingMode: "untimed" | "timed",
  items: readonly PracticeItemManifest[],
): number | null {
  if (timingMode === "untimed") return null;
  if (count === 20) {
    return DMAT_CURRENT_CORE_PROTOCOL.core.find((section) => section.sectionType === module)?.durationSeconds ?? 25 * 60;
  }
  return items.reduce((total, item) => {
    const snapshot = item.public_snapshot as { estimatedTimeSeconds?: number };
    return total + Math.max(1, Math.round(snapshot.estimatedTimeSeconds ?? 60));
  }, 0);
}
