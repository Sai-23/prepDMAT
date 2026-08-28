"use client";

import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import type { MistakeQuestion } from "@/lib/learning/schemas";

export function MistakeQuestionReview({ mistake }: { mistake: MistakeQuestion }) {
  return (
    <NativePracticeResponse
      answer={mistake.answer}
      correctAnswer={mistake.correctAnswer}
      disabled
      onChange={() => undefined}
      question={mistake.question}
    />
  );
}
