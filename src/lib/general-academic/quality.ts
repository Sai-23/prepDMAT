import { renderGeneralAcademicLatex } from "./math";
import { normalizeComparableText } from "./normalization";
import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_SKILLS,
} from "./registries";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";
import { findingsFromZodIssues } from "./validation";

export type GeneralAcademicQualityFinding = {
  code: string;
  path: string;
  message: string;
  severity: "blocking" | "warning" | "info";
};

export type GeneralAcademicAnswerVerification = {
  questionId: string;
  status: "verified" | "manual" | "mismatch";
  message: string;
};

export type GeneralAcademicQualityMetrics = {
  questionCount: number;
  skills: Record<string, number>;
  difficulties: Record<string, number>;
  representations: { text: boolean; formula: number; table: number; graph: number; figure: number };
  answerPositions: Record<string, number>;
  answerVerification: GeneralAcademicAnswerVerification[];
  math: { rendered: number; fallback: number };
};

export type GeneralAcademicQualityResult = {
  validStructure: boolean;
  blocking: GeneralAcademicQualityFinding[];
  warnings: GeneralAcademicQualityFinding[];
  info: GeneralAcademicQualityFinding[];
  metrics: GeneralAcademicQualityMetrics;
};

const countRecord = (values: readonly string[]) => Object.fromEntries(values.map((value) => [value, 0]));

function emptyMetrics(): GeneralAcademicQualityMetrics {
  return {
    questionCount: 0,
    skills: countRecord(GENERAL_ACADEMIC_SKILLS),
    difficulties: countRecord(GENERAL_ACADEMIC_DIFFICULTIES),
    representations: { text: false, formula: 0, table: 0, graph: 0, figure: 0 },
    answerPositions: countRecord(GENERAL_ACADEMIC_OPTION_IDS),
    answerVerification: [],
    math: { rendered: 0, fallback: 0 },
  };
}

function parseNumericOption(text: string) {
  const normalized = text.trim().replaceAll(",", "");
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(%)?(?:\s*[A-Za-z°/()·.*^-]+)?$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value / (match[2] ? 100 : 1) : null;
}

function verifyAnswer(question: CanonicalGeneralAcademicPack["questions"][number]): GeneralAcademicAnswerVerification {
  const option = question.options.find((item) => item.id === question.correctOption);
  if (!option || !question.validation || question.validation.answerType === "manual") {
    return { questionId: question.id, status: "manual", message: "Manual verification required." };
  }
  const validation = question.validation;
  if (validation.answerType === "numeric") {
    const actual = parseNumericOption(option.text);
    if (actual === null) return { questionId: question.id, status: "manual", message: "The keyed option is not safely numeric; manual verification is required." };
    const verified = Math.abs(actual - validation.expectedValue) <= validation.tolerance;
    return { questionId: question.id, status: verified ? "verified" : "mismatch", message: verified ? "Keyed numeric option matches expected value within tolerance." : "Keyed numeric option does not match expected value within tolerance." };
  }
  const actual = normalizeComparableText(option.text);
  if (validation.answerType === "boolean") {
    const expected = validation.expectedValue ? "true" : "false";
    const verified = actual === expected;
    return { questionId: question.id, status: verified ? "verified" : "manual", message: verified ? "Keyed Boolean option matches exactly." : "Boolean wording requires manual verification." };
  }
  const expected = normalizeComparableText(validation.expectedValue);
  const verified = actual === expected || normalizeComparableText(question.correctOption) === expected;
  return { questionId: question.id, status: verified ? "verified" : "manual", message: verified ? "Keyed option matches expected text exactly after normalization." : "Semantic equivalence was not assumed; manual verification is required." };
}

function warning(code: string, path: string, message: string): GeneralAcademicQualityFinding {
  return { code, path, message, severity: "warning" };
}

export function evaluateGeneralAcademicPackQuality(input: unknown): GeneralAcademicQualityResult {
  const parsed = canonicalGeneralAcademicPackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      validStructure: false,
      blocking: findingsFromZodIssues(parsed.error.issues).map((finding) => ({ ...finding, severity: "blocking" as const })),
      warnings: [],
      info: [],
      metrics: emptyMetrics(),
    };
  }

  const pack = parsed.data;
  const metrics = emptyMetrics();
  metrics.questionCount = pack.questions.length;
  metrics.representations = {
    text: Boolean(pack.stimulus.text.trim()),
    formula: pack.stimulus.formulas.length,
    table: pack.stimulus.tables.length,
    graph: pack.stimulus.graphs.length,
    figure: pack.stimulus.figures.length,
  };
  const warnings: GeneralAcademicQualityFinding[] = [];
  const blocking: GeneralAcademicQualityFinding[] = [];

  pack.questions.forEach((question, index) => {
    metrics.skills[question.skill] += 1;
    metrics.difficulties[question.difficulty] += 1;
    metrics.answerPositions[question.correctOption] += 1;
    const verification = verifyAnswer(question);
    metrics.answerVerification.push(verification);
    if (verification.status === "mismatch") {
      blocking.push({ code: "ANSWER_VALIDATION_MISMATCH", path: `questions[${index}].validation`, message: verification.message, severity: "blocking" });
    }
    if (question.prompt.length < 20) warnings.push(warning("SHORT_PROMPT", `questions[${index}].prompt`, "Question prompt is unusually short."));
    if (question.explanation.summary.length < 25) warnings.push(warning("SHORT_EXPLANATION", `questions[${index}].explanation.summary`, "Explanation summary is unusually short."));
    if (question.explanation.takeaway.length < 20) warnings.push(warning("SHORT_TAKEAWAY", `questions[${index}].explanation.takeaway`, "Explanation takeaway is unusually short."));
    if (question.options.some((option) => /^(?:todo|tbd|placeholder|option\s+[a-d])$/i.test(option.text.trim()))) {
      blocking.push({ code: "PLACEHOLDER_OPTION", path: `questions[${index}].options`, message: "Replace placeholder answer options before review.", severity: "blocking" });
    }
  });

  const questionCount = pack.questions.length;
  const usedSkills = Object.values(metrics.skills).filter(Boolean);
  if (questionCount >= 4 && usedSkills.length === 1) warnings.push(warning("SKILL_CONCENTRATION", "questions", "Every question uses the same skill; confirm this matches the reasoning required."));
  if (questionCount >= 4 && metrics.skills.source_information / questionCount > 0.5) warnings.push(warning("EXCESSIVE_SOURCE_INFORMATION", "questions", "More than half of the questions use source_information; confirm the pack includes sufficient application or transfer reasoning."));
  if (questionCount >= 4 && Math.max(...Object.values(metrics.answerPositions)) / questionCount >= 0.8) warnings.push(warning("ANSWER_POSITION_CONCENTRATION", "questions", "Correct answers are extremely concentrated in one option position."));
  if (questionCount >= 4 && Object.values(metrics.difficulties).filter(Boolean).length === 1) warnings.push(warning("QUESTION_DIFFICULTY_CONCENTRATION", "questions", "Every question has the same difficulty; confirm the profile is intentional."));
  if (pack.difficulty === "hard" && metrics.difficulties.easy / questionCount >= 0.75) warnings.push(warning("PACK_DIFFICULTY_MISMATCH", "difficulty", "A hard pack is dominated by easy questions."));
  if (pack.difficulty === "easy" && metrics.difficulties.hard / questionCount >= 0.5) warnings.push(warning("PACK_DIFFICULTY_MISMATCH", "difficulty", "An easy pack contains an unusually high proportion of hard questions."));

  pack.stimulus.formulas.forEach((formula, index) => {
    if (formula.display?.latex) {
      const assessment = renderGeneralAcademicLatex(formula.display.latex, true);
      if (assessment.valid) metrics.math.rendered += 1;
      else {
        metrics.math.fallback += 1;
        warnings.push(warning(
          assessment.reason === "unsafe_command" ? "UNSUPPORTED_MATH_COMMAND" : "BROKEN_DISPLAY_MATH",
          `stimulus.formulas[${index}].display.latex`,
          "Display math cannot be rendered safely; the machine expression fallback will be shown.",
        ));
      }
    }
    formula.variables.forEach((variable, variableIndex) => {
      if (!variable.displaySymbol) return;
      if (!renderGeneralAcademicLatex(variable.displaySymbol).valid) warnings.push(warning("BROKEN_DISPLAY_SYMBOL", `stimulus.formulas[${index}].variables[${variableIndex}].displaySymbol`, "Variable display symbol cannot be rendered safely; the canonical symbol will be shown."));
    });
  });

  const manual = metrics.answerVerification.filter((item) => item.status === "manual").length;
  const verified = metrics.answerVerification.filter((item) => item.status === "verified").length;
  return {
    validStructure: true,
    blocking,
    warnings,
    info: [{ code: "ANSWER_VERIFICATION_SUMMARY", path: "questions", message: `${verified} deterministically verified; ${manual} require manual verification.`, severity: "info" }],
    metrics,
  };
}
