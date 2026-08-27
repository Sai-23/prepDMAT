"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useMemo } from "react";

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
  const selectedLabels = sequence.missingMatrices.map((matrix, index) =>
    matrix.candidates.find((candidate) => candidate.id === selectedAnswer[index])?.label ?? "Unanswered",
  );

  return (
    <PracticeExplanationShell
      dataFeedbackInterface="figure-sequence-guided"
      fallbackMessage={walkthrough.fallbackMessage}
      getStepKey={(step) => step.id}
      initialStep={initialStep}
      initialView={initialView}
      initiallyOpen={initiallyOpen}
      isCorrect={isCorrect}
      mistakeFeedback={mistake}
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
    />
  );
}

function FigureStepVisual({
  sequence,
  step,
}: {
  sequence: FigureSequencePresentation;
  step: FigureExplanationStep;
}) {
  const visibleRules = step.type === "track_symbol"
    ? step.rulesFound.slice(-1)
    : step.rulesFound;
  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        data-figure-comparison="before-after"
      >
        <FigureFrameCard
          frame={step.beforeFrame}
          grid={sequence.grid}
          highlightSymbolId={step.activeSymbolId}
          label={step.type === "track_symbol" ? "Old position" : "Previous state"}
        />
        <ArrowRight aria-hidden="true" className="mx-auto h-5 w-5 rotate-90 text-primary sm:rotate-0" />
        <FigureFrameCard
          frame={step.afterFrame}
          grid={sequence.grid}
          highlightSymbolId={step.activeSymbolId}
          label={step.type === "track_symbol" ? "New position" : "Result"}
        />
      </div>
      <RuleSummary rules={visibleRules} />
      <SequenceStrip sequence={sequence} step={step} />
    </div>
  );
}

function SequenceStrip({
  sequence,
  step,
}: {
  sequence: FigureSequencePresentation;
  step: FigureExplanationStep;
}) {
  const activeIndices = new Set([step.beforeFrame.index, step.afterFrame.index]);
  return (
    <figure className="rounded-lg border border-workspace-border bg-surface-lowest p-3">
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sequence overview
      </figcaption>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Original four frames followed by two missing matrices">
        {sequence.visibleFrames.map((frame) => (
          <div className={cn("overflow-hidden rounded border-2 bg-white", activeIndices.has(frame.index) ? "border-primary" : "border-workspace-border")} key={frame.index}>
            <FigureMatrixSvg frame={frame} grid={sequence.grid} label={`Frame ${frame.index + 1}`} />
            <p className="border-t border-workspace-border py-1 text-center text-[10px] font-semibold text-slate-700">Frame {frame.index + 1}</p>
          </div>
        ))}
        {sequence.missingMatrices.map((matrix, index) => (
          <div className={cn("flex aspect-square items-center justify-center rounded border-2 bg-surface-low text-xl font-bold", activeIndices.has(matrix.sequenceIndex) ? "border-primary text-primary" : "border-workspace-border text-muted-foreground")} key={matrix.sequenceIndex} aria-label={`Missing matrix ${index + 1}`}>
            ?
          </div>
        ))}
      </div>
    </figure>
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

function RuleSummary({
  rules,
}: {
  rules: FigureRulePresentation[];
}) {
  return (
    <div className="border-t border-workspace-separator pt-3" data-rule-summary="figure-sequence">
      <p className="text-sm font-semibold text-on-surface">{rules.length === 1 ? "Rule" : "Rules"}</p>
      <ul className="mt-2 space-y-2 text-sm text-on-surface">
        {rules.map((rule) => (
          <li className="flex items-start gap-2" key={rule.symbolId}>
            <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{rule.summary}</span>
          </li>
        ))}
      </ul>
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
        <dl className="mt-4 divide-y divide-workspace-separator border-y border-workspace-separator text-sm">
          {step.changes.map((change) => (
            <div className="grid gap-1 py-2.5 sm:grid-cols-[6rem_1fr]" key={change.label}>
              <dt className="font-medium text-muted-foreground">{change.label}</dt>
              <dd className="font-semibold text-on-surface">{change.before} → {change.after}</dd>
            </div>
          ))}
        </dl>
      ) : step.type === "predict_matrix" ? (
        <p className="mt-4 text-sm font-semibold text-on-surface">
          Apply {step.rulesFound.length === 1 ? "the rule" : "the rules"} once to get missing matrix {step.missingIndex + 1}.
        </p>
      ) : (
        <>
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
            <p className="mt-3 text-sm text-muted-foreground">Continue from this constructed frame to predict missing matrix 2.</p>
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
