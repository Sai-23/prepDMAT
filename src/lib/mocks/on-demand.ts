import "server-only";

import type { StructuralProfile } from "../generation/novelty";
import type { DmatCoreSectionType } from "../protocol";
import { DMAT_CURRENT_CORE_PROTOCOL } from "../protocol";
import { createPracticeSnapshots } from "../practice/native";
import { createSupabaseAdminClient } from "../supabase/admin";
import { correlationReference } from "../security/logging";
import { buildCoreAttemptSnapshot } from "./persistence";
import {
  CORE_MOCK_ASSEMBLER_VERSION,
  CoreMockAssemblyError,
  type CoreMock,
  type CoreMockQuestion,
} from "./core-mock";
import {
  assembleCoreMockWithHistory,
  compactCoreMockHistory,
  type CompactCoreMockHistory,
} from "./history";

export type GeneratedCoreMockActionResult =
  | { state: "ready"; mockId: string; attemptId: string }
  | { state: "generating"; mockId: string }
  | { state: "failed"; error: string; retryAfterSeconds?: number };

type Reservation = {
  mockId: string;
  status: "generating" | "ready" | "failed";
  attemptId: string | null;
  reserved: boolean;
};

type PersistedGeneratedItem = {
  question_key: string;
  position: number;
  section_key: string;
  section_position: number;
  question_type: DmatCoreSectionType;
  public_snapshot: unknown;
  private_snapshot: unknown;
  generator_version: string;
  validator_version: string;
  seed: string;
  fingerprint: string;
};

export type OnDemandCoreMockRepository = {
  reserve(input: {
    userId: string;
    requestId: string;
    mockSeed: string;
    cooldownSeconds: number;
  }): Promise<Reservation>;
  loadHistory(userId: string, limit: number): Promise<CompactCoreMockHistory[]>;
  persist(input: Record<string, unknown>): Promise<void>;
  fail(input: {
    mockId: string;
    userId: string;
    reasonCode: string;
    durationMs: number;
  }): Promise<void>;
};

export type GenerateOnDemandCoreMockOptions = {
  userId: string;
  requestId: string;
  historyWindow: number;
  cooldownSeconds: number;
  repository?: OnDemandCoreMockRepository;
  assemble?: typeof assembleCoreMockWithHistory;
  now?: () => Date;
  createId?: () => string;
};

class SafeGenerationError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

function isStructuralProfile(value: unknown): value is StructuralProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { namespace?: unknown; features?: unknown };
  return (
    ["figure_sequence", "mathematical_equation", "latin_square"].includes(String(candidate.namespace)) &&
    !!candidate.features &&
    typeof candidate.features === "object" &&
    !Array.isArray(candidate.features)
  );
}

function stringArrays(value: unknown): Record<DmatCoreSectionType, string[]> {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(DMAT_CURRENT_CORE_PROTOCOL.core.map((section) => {
    const values = record[section.sectionType];
    return [
      section.sectionType,
      Array.isArray(values)
        ? values.filter((item): item is string => typeof item === "string")
        : [],
    ];
  })) as Record<DmatCoreSectionType, string[]>;
}

function profileArrays(value: unknown): Record<DmatCoreSectionType, StructuralProfile[]> {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(DMAT_CURRENT_CORE_PROTOCOL.core.map((section) => {
    const values = record[section.sectionType];
    return [
      section.sectionType,
      Array.isArray(values) ? values.filter(isStructuralProfile) : [],
    ];
  })) as Record<DmatCoreSectionType, StructuralProfile[]>;
}

function defaultRepository(): OnDemandCoreMockRepository {
  return {
    async reserve(input) {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin.rpc("reserve_generated_core_mock", {
        p_user_id: input.userId,
        p_generation_request_id: input.requestId,
        p_mock_seed: input.mockSeed,
        p_cooldown_seconds: input.cooldownSeconds,
        p_protocol_version: DMAT_CURRENT_CORE_PROTOCOL.version,
        p_assembler_version: CORE_MOCK_ASSEMBLER_VERSION,
      });
      if (error) {
        const message = String(error.message ?? "");
        if (message.includes("generation_in_progress")) {
          throw new SafeGenerationError("A Core mock is already being generated for your account.");
        }
        const cooldown = message.match(/generation_cooldown:(\d+)/);
        if (cooldown) {
          const seconds = Number(cooldown[1]);
          throw new SafeGenerationError(`Please wait ${seconds} seconds before generating another mock.`, seconds);
        }
        throw new SafeGenerationError("Unable to reserve a Core mock generation request.");
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new SafeGenerationError("Unable to reserve a Core mock generation request.");
      return {
        mockId: String(row.mock_id),
        status: String(row.generation_status) as Reservation["status"],
        attemptId: row.attempt_id ? String(row.attempt_id) : null,
        reserved: row.was_reserved === true,
      };
    },
    async loadHistory(userId, limit) {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin
        .from("generated_core_mocks")
        .select("fingerprints, structural_profiles, family_sequences, difficulty_sequences")
        .eq("user_id", userId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new SafeGenerationError("Unable to load recent generated-mock history.");
      return (data ?? []).reverse().map((row) => ({
        fingerprints: stringArrays(row.fingerprints),
        structuralProfiles: profileArrays(row.structural_profiles),
        familySequences: stringArrays(row.family_sequences),
        difficultySequences: stringArrays(row.difficulty_sequences),
      }));
    },
    async persist(input) {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.rpc("persist_generated_core_mock_attempt", input);
      if (error) throw new SafeGenerationError("Unable to atomically save the generated Core mock.");
    },
    async fail(input) {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.rpc("fail_generated_core_mock", {
        p_mock_id: input.mockId,
        p_user_id: input.userId,
        p_reason_code: input.reasonCode,
        p_duration_ms: input.durationMs,
        p_protocol_version: DMAT_CURRENT_CORE_PROTOCOL.version,
        p_assembler_version: CORE_MOCK_ASSEMBLER_VERSION,
      });
      if (error) console.error("Unable to persist generated Core mock failure telemetry", {
        mockRef: correlationReference(input.mockId),
        reasonCode: input.reasonCode,
      });
    },
  };
}

function storedStructuredData(question: CoreMockQuestion): Record<string, unknown> {
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

function buildAttempt(mock: CoreMock, createId: () => string, startedAt: Date) {
  const sectionKeys = Object.fromEntries(mock.sections.map((section) => [
    section.sectionType,
    createId(),
  ])) as Record<DmatCoreSectionType, string>;
  const sectionSnapshots = mock.sections.map((section) => ({
    id: sectionKeys[section.sectionType],
    title: section.title,
    sectionType: section.sectionType,
    durationSeconds: section.durationSeconds,
    sortOrder: section.position,
  }));
  let globalPosition = 0;
  const items: PersistedGeneratedItem[] = mock.sections.flatMap((section) =>
    section.questions.map((item) => {
      globalPosition += 1;
      const questionKey = createId();
      const question = item.question;
      const snapshot = createPracticeSnapshots({
        id: questionKey,
        module: "core",
        questionType: question.questionType,
        topic: question.topic,
        subtopic: question.subtopic ?? null,
        difficulty: item.difficulty,
        questionText: question.presentation.prompt,
        passage: null,
        code: null,
        formula: null,
        tableData: null,
        imageUrl: null,
        estimatedTimeSeconds: question.estimatedSolveTimeSeconds,
        structuredData: storedStructuredData(question),
        metadata: {
          generation: question.metadata,
          validation: question.validation,
          correctAnswer: question.correctAnswer,
        },
        explanation: question.explanation,
        options: [],
        correctOptionId: null,
        sourceType: "generated",
      });
      return {
        question_key: questionKey,
        position: globalPosition,
        section_key: sectionKeys[section.sectionType],
        section_position: item.position,
        question_type: section.sectionType,
        public_snapshot: snapshot.publicQuestion,
        private_snapshot: snapshot.privateSnapshot,
        generator_version: item.generatorVersion,
        validator_version: item.validatorVersion,
        seed: item.seed,
        fingerprint: item.fingerprint,
      };
    }),
  );
  const compact = compactCoreMockHistory(mock);
  const snapshot = buildCoreAttemptSnapshot({
    title: "Generated Core Mock",
    origin: "generated",
    mockSeed: mock.mockSeed,
    assemblerVersion: mock.assemblerVersion,
    generationQuality: {
      score: mock.quality.score,
      criticalGatePassed: mock.quality.passed,
    },
    createdAt: mock.createdAt,
    sections: sectionSnapshots,
    questions: items.map((item) => ({
      questionId: item.question_key,
      sectionType: item.question_type,
      position: item.position,
      generatorVersion: item.generator_version,
      validatorVersion: item.validator_version,
      seed: item.seed,
      fingerprint: item.fingerprint,
    })),
  });
  const durationSeconds = sectionSnapshots.reduce((sum, section) => sum + section.durationSeconds, 0);
  const firstSection = sectionSnapshots[0];
  const questions = mock.sections.flatMap((section) => section.questions);
  const retries = questions.reduce((sum, item) => sum + Math.max(0, item.diagnostics.slotGenerationCalls - 1), 0);
  const noveltyRejections = questions.reduce((sum, item) => sum + item.diagnostics.mockNoveltyRejections, 0);
  const validationRejections = questions.reduce(
    (sum, item) => sum + Math.max(0, item.diagnostics.generatorAttempts - item.diagnostics.slotGenerationCalls),
    0,
  );
  return {
    items,
    compact,
    snapshot,
    expiresAt: new Date(startedAt.getTime() + durationSeconds * 1000),
    sectionExpiresAt: new Date(startedAt.getTime() + firstSection.durationSeconds * 1000),
    firstSectionKey: firstSection.id,
    firstQuestionKey: items[0].question_key,
    retries,
    noveltyRejections,
    validationRejections,
    spacingRelaxations: questions.filter((item) => item.diagnostics.spacingRelaxed).length,
    moduleTelemetry: Object.fromEntries(mock.sections.map((section) => {
      const sectionQuestions = section.questions;
      return [section.sectionType, {
        durationMs: section.generationDurationMs,
        retryCount: sectionQuestions.reduce((sum, item) => sum + Math.max(0, item.diagnostics.slotGenerationCalls - 1), 0),
        noveltyRejectionCount: sectionQuestions.reduce((sum, item) => sum + item.diagnostics.mockNoveltyRejections, 0),
        validationRejectionCount: sectionQuestions.reduce((sum, item) => sum + Math.max(0, item.diagnostics.generatorAttempts - item.diagnostics.slotGenerationCalls), 0),
        spacingRelaxationCount: sectionQuestions.filter((item) => item.diagnostics.spacingRelaxed).length,
        generatorVersion: mock.generatorVersions[section.sectionType],
      }];
    })),
  };
}

function failureReason(error: unknown, stage: "history" | "generation" | "persistence"): string {
  if (stage === "persistence") return "transaction_error";
  if (stage === "history") return "history_load_error";
  if (error instanceof CoreMockAssemblyError) return error.reason;
  return "generation_exception";
}

/**
 * Entitlement hook. Product policy is currently unspecified, so authenticated
 * students retain the same access behavior as free curated mocks.
 */
export async function authorizeGeneratedCoreMock(userId: string): Promise<{ allowed: true; policy: "authenticated" }> {
  void userId;
  return { allowed: true, policy: "authenticated" };
}

export async function generateOnDemandCoreMock(
  options: GenerateOnDemandCoreMockOptions,
): Promise<GeneratedCoreMockActionResult> {
  await authorizeGeneratedCoreMock(options.userId);
  const repository = options.repository ?? defaultRepository();
  const assemble = options.assemble ?? assembleCoreMockWithHistory;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());
  const mockSeed = createId();
  let reservation: Reservation;
  try {
    reservation = await repository.reserve({
      userId: options.userId,
      requestId: options.requestId,
      mockSeed,
      cooldownSeconds: options.cooldownSeconds,
    });
  } catch (error) {
    if (error instanceof SafeGenerationError) {
      return { state: "failed", error: error.message, ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) };
    }
    return { state: "failed", error: "Unable to begin Core mock generation." };
  }
  if (!reservation.reserved) {
    if (reservation.status === "ready" && reservation.attemptId) {
      return { state: "ready", mockId: reservation.mockId, attemptId: reservation.attemptId };
    }
    if (reservation.status === "generating") return { state: "generating", mockId: reservation.mockId };
    return { state: "failed", error: "This generation request failed. You can request a new mock." };
  }

  const generationStarted = performance.now();
  let stage: "history" | "generation" | "persistence" = "history";
  try {
    const history = await repository.loadHistory(options.userId, Math.max(5, options.historyWindow));
    stage = "generation";
    const createdAt = now();
    const mock = assemble({
      mockSeed,
      createdAt: createdAt.toISOString(),
      history,
      historyWindow: options.historyWindow,
    });
    const attemptStartedAt = now();
    const attempt = buildAttempt(mock, createId, attemptStartedAt);
    const attemptId = createId();
    const durationMs = Number((performance.now() - generationStarted).toFixed(3));
    stage = "persistence";
    await repository.persist({
      p_mock_id: reservation.mockId,
      p_user_id: options.userId,
      p_attempt_id: attemptId,
      p_mock_seed: mock.mockSeed,
      p_protocol_version: mock.protocolVersion,
      p_assembler_version: mock.assemblerVersion,
      p_generator_versions: mock.generatorVersions,
      p_fingerprints: attempt.compact.fingerprints,
      p_structural_profiles: attempt.compact.structuralProfiles,
      p_family_sequences: attempt.compact.familySequences,
      p_difficulty_sequences: attempt.compact.difficultySequences,
      p_quality_score: mock.quality.score,
      p_critical_gate_passed: mock.quality.passed,
      p_test_snapshot: attempt.snapshot,
      p_items: attempt.items,
      p_started_at: attemptStartedAt.toISOString(),
      p_expires_at: attempt.expiresAt.toISOString(),
      p_current_section_key: attempt.firstSectionKey,
      p_section_expires_at: attempt.sectionExpiresAt.toISOString(),
      p_current_question_key: attempt.firstQuestionKey,
      p_duration_ms: durationMs,
      p_retry_count: attempt.retries,
      p_novelty_rejection_count: attempt.noveltyRejections,
      p_validation_rejection_count: attempt.validationRejections,
      p_spacing_relaxation_count: attempt.spacingRelaxations,
      p_module_telemetry: attempt.moduleTelemetry,
    });
    return { state: "ready", mockId: reservation.mockId, attemptId };
  } catch (error) {
    const reasonCode = failureReason(error, stage);
    const durationMs = Number((performance.now() - generationStarted).toFixed(3));
    console.error("Generated Core mock failed", {
      mockRef: correlationReference(reservation.mockId),
      userRef: correlationReference(options.userId),
      reasonCode,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    await repository.fail({
      mockId: reservation.mockId,
      userId: options.userId,
      reasonCode,
      durationMs,
    });
    return {
      state: "failed",
      error: "The Core mock could not be generated safely. No partial attempt was created; please retry.",
    };
  }
}

export async function getRecentGeneratedCoreMocksForAdmin(limit = 20) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("generated_core_mocks")
    .select("id, user_id, status, created_at, ready_at, assembler_version, generator_versions, quality_score, critical_gate_passed, failure_reason_code")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, limit)));
  if (error) throw new Error("Unable to load generated Core mock administration data.");
  return data ?? [];
}
