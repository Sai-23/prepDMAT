"use client";

import { ArrowRight, Check, RotateCw, X } from "lucide-react";
import { useMemo, useState } from "react";

import { FigureMatrixSvg } from "@/components/questions/figure-matrix-svg";
import { cn } from "@/lib/utils";
import {
  buildFigureSequenceWalkthrough,
  type FigureExplanationStep,
  type FigureRulePresentation,
} from "@/lib/practice/figure-sequence-explanation";
import {
  buildFigureEducationalExplanation,
  diagnoseFigureMistake,
  type EducationalExplanation,
} from "@/lib/practice/educational-explanation";
import type { FigureSequencePresentation } from "@/lib/generation/figure-sequences";
import { PracticeExplanationShell } from "./practice-explanation-shell";

export function FigureSequencePracticeFeedback({
  sequence,
  trace,
  selectedAnswer,
  correctAnswer,
  isCorrect,
  initiallyOpen = false,
  initialView = "step",
  initialStep = 0,
  onExplanationOpen,
  educationalExplanation,
  difficulty,
}: {
  sequence: FigureSequencePresentation;
  trace: unknown;
  selectedAnswer: string[];
  correctAnswer: unknown;
  isCorrect: boolean;
  initiallyOpen?: boolean;
  initialView?: "step" | "all";
  initialStep?: number;
  onExplanationOpen?: () => void;
  educationalExplanation?: EducationalExplanation;
  difficulty?: "easy" | "medium" | "hard";
}) {
  const walkthrough = useMemo(
    () => buildFigureSequenceWalkthrough(sequence, trace, correctAnswer),
    [correctAnswer, sequence, trace],
  );
  const education = useMemo(
    () => educationalExplanation ?? buildFigureEducationalExplanation(sequence, trace, correctAnswer, difficulty),
    [correctAnswer, difficulty, educationalExplanation, sequence, trace],
  );
  const mistake = useMemo(
    () => isCorrect ? null : diagnoseFigureMistake(sequence, selectedAnswer, correctAnswer),
    [correctAnswer, isCorrect, selectedAnswer, sequence],
  );
  const [inspectedSymbolId, setInspectedSymbolId] = useState<string | null>(null);
  const selectedLabels = sequence.missingMatrices.map((matrix, index) =>
    matrix.candidates.find((candidate) => candidate.id === selectedAnswer[index])?.label ?? "Unanswered",
  );

  return (
    <PracticeExplanationShell
      answerConclusion={education?.answerConclusion}
      dataFeedbackInterface="figure-sequence-guided"
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
        <FigureStepCard
          correctAnswer={correctAnswer}
          index={index}
          selectedAnswer={selectedAnswer}
          sequence={sequence}
          step={step}
          total={total}
        />
      )}
      renderVisual={(step) => (
        <FigureStepVisual
          inspectedSymbolId={inspectedSymbolId}
          onInspect={setInspectedSymbolId}
          sequence={sequence}
          step={step}
        />
      )}
      resultDetails={isCorrect ? (
        <p className="text-sm text-muted-foreground">
          You selected: <strong className="text-on-surface">Matrix 1 · {selectedLabels[0]}, Matrix 2 · {selectedLabels[1]}</strong>
          <Check aria-label="Correct answers" className="ml-1 inline h-4 w-4 text-success" />
        </p>
      ) : (
        <dl className="grid max-w-xl gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-error-container px-3 py-2 text-error-container-foreground">
            <dt className="text-xs font-semibold uppercase tracking-wide">Your answers</dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold">
              Matrix 1 · {selectedLabels[0]}, Matrix 2 · {selectedLabels[1]}
              <X aria-label="Incorrect answer" className="h-4 w-4 shrink-0" />
            </dd>
          </div>
          <div className="rounded-md bg-success-container px-3 py-2 text-success-container-foreground">
            <dt className="text-xs font-semibold uppercase tracking-wide">Correct answers</dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold">
              Matrix 1 · {walkthrough.correctLabels[0] ?? "Unavailable"}, Matrix 2 · {walkthrough.correctLabels[1] ?? "Unavailable"}
              <Check aria-label="Correct answers" className="h-4 w-4 shrink-0" />
            </dd>
          </div>
        </dl>
      )}
      quickSummary={education?.summary}
      steps={walkthrough.valid ? walkthrough.steps : []}
      takeaway={education?.takeaway}
    />
  );
}

function FigureStepVisual({
  sequence,
  step,
  inspectedSymbolId,
  onInspect,
}: {
  sequence: FigureSequencePresentation;
  step: FigureExplanationStep;
  inspectedSymbolId: string | null;
  onInspect(symbolId: string | null): void;
}) {
  const highlightId = inspectedSymbolId ?? step.activeSymbolId;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <FigureFrameCard
          frame={step.beforeFrame}
          grid={sequence.grid}
          highlightSymbolId={highlightId}
          label={step.type === "track_symbol" ? "Old position" : "Previous state"}
        />
        <ArrowRight aria-hidden="true" className="h-5 w-5 text-primary" />
        <FigureFrameCard
          frame={step.afterFrame}
          grid={sequence.grid}
          highlightSymbolId={highlightId}
          label={step.type === "track_symbol" ? "New position" : "Result"}
        />
      </div>
      <RuleChips
        activeSymbolId={highlightId}
        onInspect={onInspect}
        rules={step.rulesFound}
      />
    </div>
  );
}

function FigureFrameCard({
  frame,
  grid,
  label,
  highlightSymbolId,
}: {
  frame: FigureExplanationStep["beforeFrame"];
  grid: FigureSequencePresentation["grid"];
  label: string;
  highlightSymbolId: string | null;
}) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-md border border-workspace-border bg-white">
      <FigureMatrixSvg
        frame={frame}
        grid={grid}
        highlightSymbolId={highlightSymbolId}
        label={`${label} matrix`}
      />
      <figcaption className="border-t border-workspace-border px-2 py-1.5 text-center text-xs font-semibold text-slate-700">
        {label}
      </figcaption>
    </figure>
  );
}

function RuleChips({
  rules,
  activeSymbolId,
  onInspect,
}: {
  rules: FigureRulePresentation[];
  activeSymbolId: string | null;
  onInspect(symbolId: string | null): void;
}) {
  return (
    <div className="rounded-lg border border-workspace-border bg-surface-lowest p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rules found</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {rules.map((rule) => {
          const active = activeSymbolId === rule.symbolId;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "min-h-10 rounded-full border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
                active ? "border-primary bg-primary-muted text-primary" : "border-workspace-border bg-surface-low hover:border-primary",
              )}
              key={rule.symbolId}
              onClick={() => onInspect(active ? null : rule.symbolId)}
              type="button"
            >
              <Check aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 text-success" />
              {rule.summary}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FigureStepCard({
  step,
  index,
  total,
  sequence,
  selectedAnswer,
  correctAnswer,
}: {
  step: FigureExplanationStep;
  index: number;
  total: number;
  sequence: FigureSequencePresentation;
  selectedAnswer: string[];
  correctAnswer: unknown;
}) {
  return (
    <article className="rounded-xl border border-workspace-border bg-surface-lowest p-5" data-step-type={step.type}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {step.eyebrow} · Step {index + 1} of {total}
      </p>
      <h5 className="mt-2 text-lg font-semibold text-on-surface">{step.title}</h5>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.instruction}</p>
      {step.type === "track_symbol" ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {step.changes.map((change) => (
              <div className="rounded-md border border-workspace-border bg-surface-low p-3" key={change.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{change.label}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{change.before} → {change.after}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verified across every transition
            </p>
            <ol className="mt-2 grid gap-2 sm:grid-cols-2" aria-label={`All transitions for ${step.symbolLabel}`}>
              {step.transitions.map((transition) => (
                <li className="rounded-md border border-workspace-border bg-surface-low p-3 text-sm text-on-surface" key={`${transition.fromFrame}:${transition.toFrame}`}>
                  <span className="font-semibold">Frame {transition.fromFrame + 1} → {transition.toFrame + 1}:</span>{" "}
                  {transition.changes.length
                    ? transition.changes.map((change) => `${change.label.toLowerCase()} ${change.before} → ${change.after}`).join("; ")
                    : "state remains unchanged"}
                  {transition.boundaryBehavior === "bounce" ? "; edge reached, so direction reverses" : ""}
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-4 rounded-md border border-success bg-success-container px-3 py-2.5 text-sm font-semibold text-success-container-foreground">
            <Check aria-hidden="true" className="mr-2 inline h-4 w-4" />
            {step.ruleSummary}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-md border border-primary bg-primary-muted px-3 py-3 text-sm text-on-surface">
            <RotateCw aria-hidden="true" className="mr-2 inline h-4 w-4 text-primary" />
            Apply {step.rulesFound.length === 1 ? "the discovered rule" : `all ${step.rulesFound.length} discovered rules`}.
          </div>
          <p className="mt-4 text-sm font-semibold text-on-surface">
            The result matches Option {step.correctOptionLabel}.
            <Check aria-label="Matching option" className="ml-1 inline h-4 w-4 text-success" />
          </p>
          {step.isFinal ? (
            <FigureAnswerComparison
              correctAnswer={correctAnswer}
              selectedAnswer={selectedAnswer}
              sequence={sequence}
            />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Use this result as the starting point for missing matrix 2.
            </p>
          )}
        </>
      )}
    </article>
  );
}

function FigureAnswerComparison({
  sequence,
  selectedAnswer,
  correctAnswer,
}: {
  sequence: FigureSequencePresentation;
  selectedAnswer: string[];
  correctAnswer: unknown;
}) {
  const correctIds = Array.isArray(correctAnswer) ? correctAnswer.map(String) : [];
  return (
    <div className="mt-5 space-y-4 border-t border-workspace-separator pt-5" data-answer-comparison="figure-sequence">
      <h6 className="font-semibold text-on-surface">Your choices and the solution</h6>
      {sequence.missingMatrices.map((matrix, index) => {
        const selected = matrix.candidates.find((candidate) => candidate.id === selectedAnswer[index]);
        const correct = matrix.candidates.find((candidate) => candidate.id === correctIds[index]);
        const matches = selected?.id === correct?.id;
        return (
          <div className="grid grid-cols-2 gap-3" key={matrix.sequenceIndex}>
            <FigureChoiceCard candidate={selected} correct={matches} heading={`Your matrix ${index + 1}`} sequence={sequence} />
            <FigureChoiceCard candidate={correct} correct heading={`Correct matrix ${index + 1}`} sequence={sequence} />
          </div>
        );
      })}
    </div>
  );
}

function FigureChoiceCard({
  candidate,
  correct,
  heading,
  sequence,
}: {
  candidate: FigureSequencePresentation["missingMatrices"][number]["candidates"][number] | undefined;
  correct: boolean;
  heading: string;
  sequence: FigureSequencePresentation;
}) {
  return (
    <figure className={cn(
      "min-w-0 overflow-hidden rounded-md border-2 bg-white",
      correct ? "border-success" : "border-error",
    )}>
      {candidate ? (
        <FigureMatrixSvg frame={candidate.frame} grid={sequence.grid} label={`${heading}, Option ${candidate.label}`} />
      ) : (
        <div className="flex aspect-square items-center justify-center text-sm text-slate-500">Unanswered</div>
      )}
      <figcaption className="flex items-center justify-between gap-2 border-t border-slate-200 px-2 py-2 text-xs font-semibold text-slate-800">
        <span>{heading}<br />{candidate ? `Option ${candidate.label}` : "Unanswered"}</span>
        {correct ? <Check aria-label="Correct" className="h-4 w-4 text-success" /> : <X aria-label="Incorrect" className="h-4 w-4 text-error" />}
      </figcaption>
    </figure>
  );
}
