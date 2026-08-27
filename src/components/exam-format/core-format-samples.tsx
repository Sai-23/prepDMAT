"use client";

import { useState } from "react";

import { NativePracticeResponse } from "@/components/practice/native-practice-response";
import { FIGURE_RENDERER_FIXTURE } from "@/lib/generation/figure-sequences/fixtures";
import type { PracticeAnswer, PracticeQuestion } from "@/lib/practice/schemas";

const symbols = ["A", "B", "C", "D", "E"] as const;

const samples: PracticeQuestion[] = [
  {
    id: "exam-format-figure", module: "core", questionType: "figure_sequence", topic: "Figure Sequences", subtopic: null,
    difficulty: "medium", questionText: "Choose the two matrices that continue the sequence.", passage: null, code: null,
    formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 75, structuredData: FIGURE_RENDERER_FIXTURE,
    response: { kind: "two_stage_single_choice" }, options: [],
  },
  {
    id: "exam-format-equation", module: "core", questionType: "mathematical_equation", topic: "Mathematical Equations", subtopic: null,
    difficulty: "medium", questionText: "Enter the value of each letter.", passage: null, code: null, formula: null,
    tableData: null, imageUrl: null, estimatedTimeSeconds: 75,
    structuredData: {
      variables: ["A", "B"], domain: { minimum: 1, maximum: 20, integersOnly: true },
      equations: [
        { left: { kind: "operation", operator: "add", left: { kind: "variable", symbol: "A" }, right: { kind: "variable", symbol: "B" } }, right: { kind: "constant", value: 14 } },
        { left: { kind: "variable", symbol: "A" }, right: { kind: "operation", operator: "multiply", left: { kind: "constant", value: 2 }, right: { kind: "variable", symbol: "B" } } },
      ],
    },
    response: { kind: "symbol_assignment", symbols: ["A", "B"] }, options: [],
  },
  {
    id: "exam-format-latin", module: "core", questionType: "latin_square", topic: "Latin Squares", subtopic: null,
    difficulty: "medium", questionText: "Which letter belongs in the highlighted cell?", passage: null, code: null,
    formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 75,
    structuredData: {
      size: 5, symbols: [...symbols], target: { row: 1, column: 3 },
      grid: [
        ["A", "B", "C", "D", "E"], ["B", "C", "D", null, "A"], ["C", "D", null, "A", "B"],
        ["D", null, "A", "B", "C"], [null, "A", "B", "C", "D"],
      ],
    },
    response: { kind: "single_choice", options: symbols.map((symbol) => ({ id: symbol, label: symbol, content: symbol })) },
    options: symbols.map((symbol) => ({ id: symbol, label: symbol, content: symbol })),
  },
];

export function CoreFormatSamples() {
  const [answers, setAnswers] = useState<Record<string, PracticeAnswer | null>>({});

  return (
    <div className="space-y-12">
      {samples.map((question, index) => (
        <article className="border-t border-workspace-separator pt-8 first:border-0 first:pt-0" key={question.id}>
          <div className="mb-6 grid gap-2 md:grid-cols-[12rem_1fr] md:items-start">
            <p className="text-sm font-semibold text-primary">{index + 1}. {question.topic}</p>
            <div>
              <h3 className="text-xl font-semibold">{question.questionText}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {question.questionType === "figure_sequence"
                  ? "Follow how the shapes change, then select one candidate for each missing matrix."
                  : question.questionType === "mathematical_equation"
                    ? "Solve the system and type a number from 1 to 20 for every letter."
                    : "Use each letter once per row and column, then select A, B, C, D, or E."}
              </p>
            </div>
          </div>
          <NativePracticeResponse
            answer={answers[question.id] ?? null}
            disabled={false}
            onChange={(answer) => setAnswers((current) => ({ ...current, [question.id]: answer }))}
            question={question}
          />
        </article>
      ))}
    </div>
  );
}
