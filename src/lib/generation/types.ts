export const GENERATED_QUESTION_TYPES = [
  "mathematical_equation",
  "latin_square",
  "figure_sequence",
] as const;

export const GENERATION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const QUESTION_MODULES = ["core"] as const;

export type GeneratedQuestionType = (typeof GENERATED_QUESTION_TYPES)[number];
export type GenerationDifficulty = (typeof GENERATION_DIFFICULTIES)[number];
export type QuestionModule = (typeof QUESTION_MODULES)[number];
export type GenerationSeed = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type PresentationBlock =
  | { kind: "text"; text: string }
  | { kind: "code"; code: string; language?: string }
  | { kind: "formula"; expression: string }
  | { kind: "table"; data: JsonValue }
  | { kind: "diagram"; data: JsonValue };

export type AnswerOption<TContent extends JsonValue = JsonValue> = {
  id: string;
  label: string;
  content: TContent;
};

export type ResponseSpecification<TAnswer extends JsonValue = JsonValue> =
  | { kind: "single_choice"; options: AnswerOption[] }
  | { kind: "symbol_assignment"; symbols: string[] }
  | { kind: "two_stage_single_choice"; stages: [AnswerOption[], AnswerOption[]] }
  | { kind: "custom"; schema: JsonValue; answerShape?: TAnswer };

export type GenerationConfiguration = {
  difficulty: GenerationDifficulty;
  seed: GenerationSeed;
  maxAttempts?: number;
  options?: Readonly<Record<string, JsonValue>>;
};

export type GenerationMetadata = {
  seed: GenerationSeed;
  generatorVersion: string;
  validatorVersion: string;
  requestedDifficulty: GenerationDifficulty;
  calculatedDifficulty: GenerationDifficulty;
  generatedAt: string;
  attemptCount: number;
  fingerprint: string;
  /** Normalized reasoning structure; excludes cosmetic values such as symbols and colours. */
  ruleFingerprint?: string;
  structuralProfile?: JsonValue;
  novelty?: {
    maximumReferenceSimilarity: number | null;
    maximumRecentSimilarity: number | null;
    referenceThreshold: number;
    recentThreshold: number;
  };
};

export type GeneratedQuestion<
  TStructuredData extends JsonValue = JsonValue,
  TAnswer extends JsonValue = JsonValue,
> = {
  questionType: GeneratedQuestionType;
  module: QuestionModule;
  topic: string;
  subtopic?: string;
  presentation: {
    prompt: string;
    blocks: PresentationBlock[];
  };
  structuredData: TStructuredData;
  response: ResponseSpecification<TAnswer>;
  correctAnswer: TAnswer;
  explanation: string;
  estimatedSolveTimeSeconds: number;
  metadata: GenerationMetadata;
  validation: ValidationMetadata;
};

export type GenerationCandidate<
  TStructuredData extends JsonValue = JsonValue,
  TAnswer extends JsonValue = JsonValue,
> = Omit<GeneratedQuestion<TStructuredData, TAnswer>, "metadata" | "validation">;

export type ValidationStage =
  | "solve"
  | "format"
  | "domain"
  | "uniqueness"
  | "safety"
  | "explanation"
  | "difficulty"
  | "duplicate";

export type ValidationIssue = {
  stage: ValidationStage;
  code: string;
  message: string;
  path?: string;
};

export type ValidationCheck = {
  stage: ValidationStage;
  passed: boolean;
  validatorVersion: string;
  details?: JsonValue;
};

export type ValidationResult<TSolution extends JsonValue = JsonValue> =
  | { valid: true; solution: TSolution; checks: ValidationCheck[] }
  | { valid: false; issues: ValidationIssue[]; checks: ValidationCheck[] };

export type ValidationMetadata = {
  valid: true;
  validatedAt: string;
  checks: ValidationCheck[];
};

export interface QuestionGenerator<
  TConfiguration extends GenerationConfiguration = GenerationConfiguration,
  TCandidate extends GenerationCandidate = GenerationCandidate,
> {
  readonly questionType: GeneratedQuestionType;
  readonly version: string;
  generate(configuration: TConfiguration, attempt: number): TCandidate;
}

export interface QuestionSolver<
  TCandidate extends GenerationCandidate = GenerationCandidate,
  TSolution extends JsonValue = JsonValue,
> {
  readonly questionType: GeneratedQuestionType;
  readonly version: string;
  solve(candidate: TCandidate): TSolution;
}

export interface QuestionValidator<
  TCandidate extends GenerationCandidate = GenerationCandidate,
  TSolution extends JsonValue = JsonValue,
> {
  readonly questionType: GeneratedQuestionType;
  readonly version: string;
  validate(
    candidate: TCandidate,
    requestedDifficulty: GenerationDifficulty,
  ): ValidationResult<TSolution>;
}
