"use client";

import { ArrowDown, Check } from "lucide-react";
import { useMemo } from "react";

import type {
  MathematicalEquationStructuredData,
  VariableAssignment,
} from "@/lib/generation/mathematical-equations";
import {
  buildMathematicalEquationWalkthrough,
  presentationEquationText,
  type EquationExplanationStep,
} from "@/lib/practice/mathematical-equation-explanation";
import {
  buildEquationEducationalExplanation,
  diagnoseEquationMistake,
  type EducationalExplanation,
} from "@/lib/practice/educational-explanation";
import { cn } from "@/lib/utils";
import { MathematicalEquationAnswerReview } from "./mathematical-equation-answer-review";
import { PracticeExplanationShell } from "./practice-explanation-shell";

export function MathematicalEquationPracticeFeedback({
  data,
  trace,
  selectedAnswer,
  correctAnswer,
  isCorrect,
  initiallyOpen = false,
  initialView = "step",
  initialStep = 0,
  showOutcomeHeader = true,
  onExplanationOpen,
  educationalExplanation,
  difficulty,
}: {
  data: MathematicalEquationStructuredData;
  trace: unknown;
  selectedAnswer: Partial<VariableAssignment>;
  correctAnswer: unknown;
  isCorrect: boolean;
  initiallyOpen?: boolean;
  initialView?: "step" | "all";
  initialStep?: number;
  showOutcomeHeader?: boolean;
  onExplanationOpen?: () => void;
  educationalExplanation?: EducationalExplanation;
  difficulty?: "easy" | "medium" | "hard";
}) {
  const walkthrough = useMemo(
    () => buildMathematicalEquationWalkthrough(data, trace, correctAnswer),
    [correctAnswer, data, trace],
  );
  const education = useMemo(
    () => educationalExplanation ?? buildEquationEducationalExplanation(data, trace, correctAnswer, difficulty),
    [correctAnswer, data, difficulty, educationalExplanation, trace],
  );
  const mistake = useMemo(
    () => isCorrect ? null : diagnoseEquationMistake(data, trace, selectedAnswer, correctAnswer),
    [correctAnswer, data, isCorrect, selectedAnswer, trace],
  );
  const assignment = walkthrough.assignment ?? {};

  return (
    <PracticeExplanationShell
      answerConclusion={education?.answerConclusion}
      dataFeedbackInterface="mathematical-equation-guided"
      fallbackMessage={walkthrough.fallbackMessage}
      getStepKey={(step) => step.id}
      initialStep={initialStep}
      initialView={initialView}
      initiallyOpen={initiallyOpen}
      isCorrect={isCorrect}
      mistakeFeedback={mistake}
      observation={education?.observation}
      onExplanationOpen={onExplanationOpen}
      renderStep={(step, index, total) => (
        <EquationStepCard
          assignment={assignment}
          data={data}
          index={index}
          step={step}
          total={total}
        />
      )}
      renderVisual={(step, index) => (
        <EquationSystemVisual
          data={data}
          step={step}
          stepIndex={index}
          steps={walkthrough.steps}
        />
      )}
      resultDetails={(
        <MathematicalEquationAnswerReview
          correctAnswer={walkthrough.assignment}
          selectedAnswer={selectedAnswer}
          symbols={data.variables}
        />
      )}
      quickSummary={education?.summary}
      showOutcomeHeader={showOutcomeHeader}
      steps={walkthrough.valid ? walkthrough.steps : []}
      takeaway={education?.takeaway}
    />
  );
}

function EquationSystemVisual({
  data,
  step,
  steps,
  stepIndex,
}: {
  data: MathematicalEquationStructuredData;
  step: EquationExplanationStep;
  steps: readonly EquationExplanationStep[];
  stepIndex: number;
}) {
  const solvedEquations = new Set(
    steps.slice(0, stepIndex).flatMap((item) => item.activeEquationIndices),
  );
  const activeEquations = new Set(step.activeEquationIndices);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-workspace-border bg-code-background p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Equation system
        </p>
        <div className="space-y-2" role="list" aria-label="Equation system with active equation">
          {data.equations.map((equation, index) => {
            const active = activeEquations.has(index);
            const solved = solvedEquations.has(index);
            return (
              <div
                aria-label={`Equation ${index + 1}${active ? ", active" : solved ? ", used" : ""}`}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-3 font-mono text-base font-semibold transition-colors motion-reduce:transition-none",
                  active
                    ? "border-primary bg-primary-muted text-on-surface ring-2 ring-primary/20"
                    : "border-workspace-border bg-surface-lowest text-code-foreground",
                )}
                key={index}
                role="listitem"
              >
                <span aria-hidden="true" className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full border",
                  active
                    ? "border-primary bg-primary"
                    : solved
                      ? "border-success bg-success"
                      : "border-workspace-border",
                )} />
                <span className="min-w-0 flex-1 text-center">
                  {presentationEquationText(equation)}
                </span>
                {solved ? (
                  <Check aria-label="Used to solve a value" className="h-4 w-4 shrink-0 text-success" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <SolvedValues values={step.solvedValues} />
    </div>
  );
}

function SolvedValues({ values }: { values: VariableAssignment }) {
  const entries = Object.entries(values);
  return (
    <div className="rounded-lg border border-workspace-border bg-surface-lowest p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Solved values
      </p>
      {entries.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {entries.map(([symbol, value]) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-success bg-success-container px-3 py-1.5 text-sm font-semibold text-success-container-foreground"
              key={symbol}
            >
              {symbol} = {value}
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No values yet. Start with the highlighted equation.
        </p>
      )}
    </div>
  );
}

function EquationStepCard({
  step,
  index,
  total,
  data,
  assignment,
}: {
  step: EquationExplanationStep;
  index: number;
  total: number;
  data: MathematicalEquationStructuredData;
  assignment: VariableAssignment;
}) {
  const substitutionChanged = step.originalEquation !== step.substitutedEquation;
  return (
    <article
      className="rounded-xl border border-workspace-border bg-surface-lowest p-5"
      data-step-type={step.type}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {step.eyebrow} · Step {index + 1} of {total}
      </p>
      <h5 className="mt-2 text-lg font-semibold text-on-surface">{step.title}</h5>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.instruction}</p>
      <div className="mt-4 space-y-2" aria-label={`Substitution for ${step.targetSymbol}`}>
        <EquationLine label="Start" text={step.originalEquation} />
        {substitutionChanged ? (
          <>
            <ArrowDown aria-hidden="true" className="mx-auto h-4 w-4 text-primary" />
            <EquationLine
              emphasized
              label="Substitute known values"
              text={step.substitutedEquation}
            />
          </>
        ) : null}
        <ArrowDown aria-hidden="true" className="mx-auto h-4 w-4 text-primary" />
        <div className="rounded-md border border-success bg-success-container px-4 py-3 text-center font-mono text-lg font-semibold text-success-container-foreground">
          {step.targetSymbol} = {step.solvedValue}
          <Check aria-label={`${step.targetSymbol} solved`} className="ml-2 inline h-4 w-4" />
        </div>
      </div>
      {step.isFinal ? (
        <div className="mt-5 border-t border-workspace-separator pt-5">
          <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Final answer
          </h6>
          <FinalAnswer assignment={assignment} variables={data.variables} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Keep {step.targetSymbol} = {step.solvedValue}; use it in the next highlighted equation.
        </p>
      )}
    </article>
  );
}

function EquationLine({
  label,
  text,
  emphasized = false,
}: {
  label: string;
  text: string;
  emphasized?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-md border px-4 py-3",
      emphasized
        ? "border-primary bg-primary-muted"
        : "border-workspace-border bg-code-background",
    )}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-center font-mono text-lg font-semibold text-on-surface">{text}</p>
    </div>
  );
}

function FinalAnswer({
  variables,
  assignment,
}: {
  variables: readonly string[];
  assignment: VariableAssignment;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2" data-final-answer="mathematical-equation">
      {variables.map((symbol) => (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-success bg-success-container px-3 py-1.5 font-mono text-sm font-semibold text-success-container-foreground"
          key={symbol}
        >
          {symbol} = {assignment[symbol]}
          <Check aria-label={`${symbol} final value`} className="h-3.5 w-3.5" />
        </span>
      ))}
    </div>
  );
}
