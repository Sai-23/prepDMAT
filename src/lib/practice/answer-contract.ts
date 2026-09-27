import type { PracticeAnswer, PracticeQuestion } from "@/lib/practice/schemas";

export function answerMatchesQuestion(
  answer: PracticeAnswer,
  question: PracticeQuestion,
): boolean {
  const response = question.response ?? {
    kind: "single_choice" as const,
    options: question.options,
  };
  if (response.kind !== answer.kind) return false;
  if (answer.kind === "single_choice" && response.kind === "single_choice") {
    return response.options.some((option) => option.id === answer.optionId);
  }
  if (answer.kind === "symbol_assignment" && response.kind === "symbol_assignment") {
    const supplied = Object.keys(answer.values).sort();
    const expected = [...response.symbols].sort();
    return supplied.length === expected.length
      && supplied.every((symbol, index) => symbol === expected[index]);
  }
  if (answer.kind === "two_stage_single_choice") {
    const matrices = (question.structuredData as {
      missingMatrices?: Array<{ candidates?: Array<{ id?: string }> }>;
    })?.missingMatrices ?? [];
    return matrices.length === 2 && answer.optionIds.every((optionId, index) =>
      matrices[index]?.candidates?.some((candidate) => candidate.id === optionId));
  }
  return false;
}
