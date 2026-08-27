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
  return (
    <article
      className="rounded-xl border border-workspace-border bg-surface-lowest p-5"
      data-step-type={step.operation.toLowerCase()}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {step.eyebrow} · Step {index + 1} of {total}
      </p>
      <h5 className="mt-2 text-lg font-semibold text-on-surface">{step.title}</h5>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.instruction}</p>
      <EquationTransformation step={step} />
      {step.resolvedVariable ? (
        <div className="mt-4 rounded-md border border-success bg-success-container px-4 py-3 text-center font-mono text-lg font-semibold text-success-container-foreground">
          {step.resolvedVariable} = {assignment[step.resolvedVariable]}
          <Check aria-label={`${step.resolvedVariable} solved`} className="ml-2 inline h-4 w-4" />
        </div>
      ) : null}
      {step.isFinal ? (
        <div className="mt-5 border-t border-workspace-separator pt-5">
          <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Final answer
          </h6>
          <FinalAnswer assignment={assignment} variables={data.variables} />
        </div>
      ) : (
        step.resolvedVariable ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Keep {step.resolvedVariable} = {step.solvedValue}; it now appears in the solved-values panel and can be used in later equations.
          </p>
        ) : null
      )}
    </article>
  );
}

function EquationTransformation({ step }: { step: EquationExplanationStep }) {
  const elimination = step.supportingExpressions.length > 1 && [
    "ADD_EQUATIONS",
    "SUBTRACT_EQUATIONS",
    "ELIMINATION",
  ].includes(step.operation);
  if (elimination) {
    const operator = step.operation === "ADD_EQUATIONS" ? "+" : "−";
    return (
      <div
        aria-label={`${step.operationLabel}: ${step.supportingExpressions.join("; ")} gives ${step.expressionAfter}`}
        className="mt-4 overflow-x-auto rounded-lg border border-workspace-border bg-code-background p-4"
        data-equation-transformation="elimination"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Line up the equations
        </p>
        <div className="mx-auto mt-3 w-max min-w-52 font-mono text-base font-semibold text-code-foreground sm:text-lg">
          {step.supportingExpressions.map((expression, index) => (
            <div className="grid grid-cols-[1.25rem_auto] gap-2 py-1" key={`${expression}:${index}`}>
              <span aria-hidden="true" className="text-primary">{index === 0 ? "" : operator}</span>
              <span className="whitespace-nowrap">{expression}</span>
            </div>
          ))}
          <div aria-hidden="true" className="my-1 border-t-2 border-primary" />
          <div className="grid grid-cols-[1.25rem_auto] gap-2 py-1 text-primary">
            <span aria-hidden="true">=</span>
            <span className="whitespace-nowrap">{step.expressionAfter}</span>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-primary">{step.operationLabel}</p>
      </div>
    );
  }
  const beforeTerms = step.replacements.map((replacement) => replacement.before);
  const afterTerms = step.replacements.map((replacement) => replacement.after);
  return (
    <div className="mt-4 space-y-2" data-equation-transformation={step.operation.toLowerCase()}>
      <EquationLine highlightTerms={beforeTerms} label="Before" text={step.expressionBefore} />
      <div className="flex flex-col items-center gap-1 py-1">
        <ArrowDown aria-hidden="true" className="h-4 w-4 text-primary" />
        <span className="rounded-full border border-primary/40 bg-primary-muted px-3 py-1 text-center text-xs font-semibold text-primary">
          {step.operationLabel}
        </span>
      </div>
      <EquationLine emphasized highlightTerms={afterTerms} label="After" text={step.expressionAfter} />
      {step.replacements.length ? (
        <div className="flex flex-wrap justify-center gap-2 pt-1" aria-label="Substitution key">
          {step.replacements.map((replacement) => (
            <span className="rounded-md border border-primary bg-primary-muted px-2.5 py-1 text-xs font-semibold text-on-surface" key={replacement.before}>
              Replace {replacement.before} with {replacement.after}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EquationLine({
  label,
  text,
  emphasized = false,
  highlightTerms = [],
}: {
  label: string;
  text: string;
  emphasized?: boolean;
  highlightTerms?: readonly string[];
}) {
  return (
    <div className={cn(
      "overflow-x-auto rounded-md border px-4 py-3",
      emphasized
        ? "border-primary bg-primary-muted"
        : "border-workspace-border bg-code-background",
    )}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 min-w-max text-center font-mono text-base font-semibold text-on-surface sm:text-lg">
        <HighlightedEquation terms={highlightTerms} text={text} />
      </p>
    </div>
  );
}

function HighlightedEquation({ text, terms }: { text: string; terms: readonly string[] }) {
  const unique = [...new Set(terms.filter(Boolean))].sort((first, second) => second.length - first.length);
  if (!unique.length) return text;
  const escaped = unique.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  const highlighted = new Set(unique);
  return parts.map((part, index) => highlighted.has(part) ? (
    <mark
      className="rounded border border-primary bg-primary-muted px-1 text-on-surface"
      key={`${part}:${index}`}
    >
      {part}
    </mark>
  ) : part);
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
