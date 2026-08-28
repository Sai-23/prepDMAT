"use client";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid3X3,
  X,
  XCircle,
} from "lucide-react";
import { type Ref, useId, useMemo, useReducer, useRef } from "react";

import { Button } from "@/components/ui/button";
import type {
  LatinCoordinate,
  LatinSquareStructuredData,
  LatinSymbol,
  VisibleLatinGrid,
} from "@/lib/generation/latin-squares";
import {
  explanationNavigationReducer,
} from "@/lib/practice/explanation-navigation";
import {
  buildLatinSquareWalkthrough,
  type LatinExplanationStep,
  type LatinWalkthroughSummary,
} from "@/lib/practice/latin-square-explanation";
import {
  buildLatinEducationalExplanation,
  diagnoseLatinMistake,
  type EducationalExplanation,
} from "@/lib/practice/educational-explanation";
import { cn } from "@/lib/utils";

export function LatinSquarePracticeFeedback({
  data,
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
  data: LatinSquareStructuredData;
  trace: unknown;
  selectedAnswer: string | null;
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
    () => buildLatinSquareWalkthrough(data, trace, correctAnswer),
    [correctAnswer, data, trace],
  );
  const education = useMemo(
    () => educationalExplanation ?? buildLatinEducationalExplanation(data, trace, correctAnswer, difficulty),
    [correctAnswer, data, difficulty, educationalExplanation, trace],
  );
  const mistake = useMemo(
    () => isCorrect ? null : diagnoseLatinMistake(data, trace, selectedAnswer, correctAnswer),
    [correctAnswer, data, isCorrect, selectedAnswer, trace],
  );
  const [navigation, dispatch] = useReducer(explanationNavigationReducer, {
    open: initiallyOpen,
    view: initialView,
    stepIndex: Math.min(
      Math.max(0, walkthrough.steps.length - 1),
      Math.max(0, initialStep),
    ),
  });
  const solvedSection = useRef<HTMLDivElement>(null);
  const answer = typeof correctAnswer === "string" ? correctAnswer : "Unavailable";
  const currentStep = walkthrough.steps[navigation.stepIndex];
  const walkthroughId = useId();

  const focusSolvedMatrix = () => {
    solvedSection.current?.focus();
    solvedSection.current?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  return (
    <section
      className="overflow-hidden rounded-xl border border-workspace-border bg-surface-lowest"
      data-feedback-interface="latin-square-guided"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {isCorrect ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-success" />
          ) : (
            <XCircle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-error" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-on-surface">
              {isCorrect ? "Correct!" : "Not quite"}
            </h3>
            <AnswerResult
              answer={answer}
              isCorrect={isCorrect}
              selectedAnswer={selectedAnswer}
            />
          </div>
        </div>
        {education ? (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary-muted px-4 py-3" data-explanation-level="quick">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Quick explanation</p>
            <p className="mt-1 text-sm leading-6 text-on-surface">{education.summary}</p>
          </div>
        ) : null}
        {!isCorrect && mistake ? (
          <div className="mt-3 rounded-lg border border-warning bg-warning-container px-4 py-3" data-diagnosis-supported={mistake.supported}>
            <p className="text-sm font-semibold text-warning-container-foreground">{mistake.title}</p>
            <p className="mt-1 text-sm leading-6 text-warning-container-foreground">{mistake.description}</p>
          </div>
        ) : null}
        <Button
          aria-controls={walkthroughId}
          aria-expanded={navigation.open}
          className="mt-4"
          onClick={() => {
            if (!navigation.open) onExplanationOpen?.();
            dispatch({ type: navigation.open ? "close" : "open" });
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Eye aria-hidden="true" className="h-4 w-4" />
          {navigation.open
            ? "Hide walkthrough"
            : isCorrect ? "See how it works" : "Show me how to solve it"}
        </Button>
      </div>

      {navigation.open ? (
        <div className="border-t border-workspace-separator bg-surface-low p-4 sm:p-5" id={walkthroughId}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                How to solve it
              </p>
              <h4 className="mt-0.5 text-lg font-semibold text-on-surface">
                Simple steps to the answer
              </h4>
            </div>
            {walkthrough.steps.length > 1 ? (
              <Button
                onClick={() => dispatch(
                  navigation.view === "all"
                    ? { type: "show_step", stepCount: walkthrough.steps.length }
                    : { type: "show_all" },
                )}
                size="sm"
                type="button"
                variant="ghost"
              >
                {navigation.view === "all" ? "One step at a time" : "Show all steps"}
              </Button>
            ) : null}
          </div>
          {education ? (
            <div className="mt-4 rounded-lg border border-workspace-border bg-surface-lowest px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What to notice</p>
              <p className="mt-1 text-sm leading-6 text-on-surface">{education.observation}</p>
            </div>
          ) : null}

          {currentStep ? (
            <>
              <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(250px,340px)_minmax(0,1fr)]">
                <WorkingGrid data={data} step={currentStep} />
                <div className="min-w-0">
                  {navigation.view === "all" ? (
                    <ol className="space-y-3" data-walkthrough-view="all">
                      {walkthrough.steps.map((step, index) => (
                        <li key={step.id}>
                          <DeductionCard index={index} step={step} total={walkthrough.steps.length} />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <>
                      <CompactProgress
                        count={walkthrough.steps.length}
                        current={navigation.stepIndex}
                      />
                      <DeductionCard
                        index={navigation.stepIndex}
                        step={currentStep}
                        total={walkthrough.steps.length}
                      />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button
                          disabled={navigation.stepIndex === 0}
                          onClick={() => dispatch({ type: "previous" })}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                          Previous
                        </Button>
                        {navigation.stepIndex === walkthrough.steps.length - 1 ? (
                          <Button onClick={focusSolvedMatrix} size="sm" type="button">
                            View solved matrix
                            <Grid3X3 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => dispatch({
                              type: "next",
                              stepCount: walkthrough.steps.length,
                            })}
                            size="sm"
                            type="button"
                          >
                            Next
                            <ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {walkthrough.completedGrid && (navigation.view === "all" || currentStep.type === "final") ? (
                <SolvedSection
                  answer={answer}
                  data={data}
                  completedGrid={walkthrough.completedGrid}
                  ref={solvedSection}
                  steps={walkthrough.steps}
                  summary={walkthrough.summary}
                />
              ) : null}
            </>
          ) : (
            <div className="mt-4">
              <p className="rounded-md border border-workspace-border bg-surface-lowest p-3 text-sm leading-6 text-on-surface">
                {walkthrough.fallbackMessage}
              </p>
              {walkthrough.completedGrid ? (
                <SolvedSection
                  answer={answer}
                  data={data}
                  completedGrid={walkthrough.completedGrid}
                  ref={solvedSection}
                  steps={walkthrough.steps}
                  summary={walkthrough.summary}
                />
              ) : null}
            </div>
          )}
          {education && currentStep?.type === "final" ? (
            <aside className="mt-4 rounded-lg border border-success/40 bg-success-container px-4 py-3" aria-label="Answer and takeaway">
              <p className="text-sm font-semibold text-success-container-foreground">{education.answerConclusion}</p>
              <p className="mt-2 text-sm leading-6 text-success-container-foreground"><span className="font-semibold">Remember:</span> {education.takeaway}</p>
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AnswerResult({
  answer,
  isCorrect,
  selectedAnswer,
}: {
  answer: string;
  isCorrect: boolean;
  selectedAnswer: string | null;
}) {
  if (isCorrect) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        You selected: <strong className="text-on-surface">{answer}</strong>
        <Check aria-label="Correct answer" className="ml-1 inline h-4 w-4 text-success" />
      </p>
    );
  }
  return (
    <dl className="mt-2 grid max-w-sm gap-2 text-sm sm:grid-cols-2">
      <div className="rounded-md bg-error-container px-3 py-2 text-error-container-foreground">
        <dt className="text-xs font-semibold uppercase tracking-wide">Your answer</dt>
        <dd className="mt-1 flex items-center gap-2 font-semibold">
          {selectedAnswer ?? "Unanswered"}
          <X aria-label="Incorrect answer" className="h-4 w-4" />
        </dd>
      </div>
      <div className="rounded-md bg-success-container px-3 py-2 text-success-container-foreground">
        <dt className="text-xs font-semibold uppercase tracking-wide">Correct answer</dt>
        <dd className="mt-1 flex items-center gap-2 font-semibold">
          {answer}
          <Check aria-label="Correct answer" className="h-4 w-4" />
        </dd>
      </div>
    </dl>
  );
}

function CompactProgress({ current, count }: { current: number; count: number }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <ol aria-label="Explanation progress" className="flex items-center gap-1.5">
        {Array.from({ length: count }, (_, index) => (
          <li
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none",
              index === current
                ? "border-primary bg-primary text-primary-foreground"
                : index < current
                  ? "border-success bg-success-container text-success-container-foreground"
                  : "border-workspace-border bg-surface-lowest text-muted-foreground",
            )}
            key={index}
          >
            {index + 1}
          </li>
        ))}
      </ol>
      <span aria-live="polite" className="text-xs font-semibold text-muted-foreground">
        Step {current + 1} of {count}
      </span>
    </div>
  );
}

function WorkingGrid({
  data,
  step,
}: {
  data: LatinSquareStructuredData;
  step: LatinExplanationStep;
}) {
  const focusLabel = [
    step.highlightRow ? `Row ${step.coordinate.row + 1} highlighted` : null,
    step.highlightColumn ? `Column ${step.coordinate.column + 1} highlighted` : null,
  ].filter(Boolean).join(". ");
  return (
    <figure className="rounded-lg border border-workspace-border bg-surface-lowest p-3">
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Puzzle
      </figcaption>
      <div
        aria-label={`Progressive Latin square. ${focusLabel}`}
        className="grid grid-cols-5 gap-px overflow-hidden rounded-md border-2 border-on-surface bg-on-surface"
        role="grid"
      >
        {step.previewGrid.flatMap((row, rowIndex) => row.map((symbol, columnIndex) => {
          const isTarget = rowIndex === data.target.row && columnIndex === data.target.column;
          const isActiveRow = step.highlightRow && rowIndex === step.coordinate.row;
          const isActiveColumn = step.highlightColumn && columnIndex === step.coordinate.column;
          const isActive = isActiveRow || isActiveColumn;
          const isGiven = data.grid[rowIndex][columnIndex] !== null;
          const isInferred = symbol !== null && !isGiven;
          const state = [
            isGiven ? "given" : isInferred ? "inferred" : "open",
            isActiveRow ? "active-row" : null,
            isActiveColumn ? "active-column" : null,
            isTarget ? "target" : null,
          ].filter(Boolean).join(" ");
          const label = [
            isTarget ? "Target cell" : null,
            `Row ${rowIndex + 1} Column ${columnIndex + 1}`,
            symbol ?? "open",
            isGiven ? "given clue" : isInferred ? "inferred value" : null,
            isActiveRow ? "active row" : null,
            isActiveColumn ? "active column" : null,
          ].filter(Boolean).join(", ");
          return (
            <div
              aria-label={label}
              className={cn(
                "relative flex aspect-square items-center justify-center bg-surface-lowest text-lg font-semibold text-on-surface transition-colors motion-reduce:transition-none sm:text-xl",
                isActive && "bg-surface-high text-on-surface",
                isInferred && !isTarget && "text-success",
                isTarget && "z-10 bg-primary-muted text-on-surface ring-2 ring-inset ring-primary",
                isTarget && step.type === "final" && "bg-success-container text-success-container-foreground ring-success",
              )}
              data-cell-state={state}
              key={`${rowIndex}:${columnIndex}`}
              role="gridcell"
            >
              <span>{isTarget && step.type !== "final" ? "?" : symbol}</span>
              {isInferred && !isTarget ? <Check aria-hidden="true" className="absolute right-0.5 top-0.5 h-3 w-3" /> : null}
            </div>
          );
        }))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {focusLabel}
      </p>
    </figure>
  );
}

function DeductionCard({
  step,
  index,
  total,
}: {
  step: LatinExplanationStep;
  index: number;
  total: number;
}) {
  return (
    <article
      aria-label={`Step ${index + 1} of ${total}: ${step.title}`}
      className="rounded-lg border border-workspace-border bg-surface-lowest p-4"
      data-step-type={step.type}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {step.eyebrow} · Step {index + 1} of {total}
      </p>
      <h5 className="mt-1 text-lg font-semibold text-on-surface">{step.title}</h5>
      <StepContents step={step} />
    </article>
  );
}

function StepContents({ step }: { step: LatinExplanationStep }) {
  const row = step.coordinate.row + 1;
  const column = step.coordinate.column + 1;
  if (step.type === "target_row") {
    return (
      <div className="mt-3 space-y-3">
        <LinePreview axis="row" coordinate={step.coordinate} grid={step.previewGrid} />
        <SymbolLine label="Row already has" symbols={step.rowExisting} />
        <CandidateSet label="Missing from this row" symbols={step.rowCandidates} />
      </div>
    );
  }
  if (step.type === "target_column") {
    return (
      <div className="mt-3 space-y-3">
        <LinePreview axis="column" coordinate={step.coordinate} grid={step.previewGrid} />
        <SymbolLine label="Column already has" symbols={step.columnExisting} />
        <CandidateSet label="Missing from this column" symbols={step.columnCandidates} />
      </div>
    );
  }
  if (step.type === "compare") {
    return (
      <div className="mt-3 space-y-3">
        <CandidateSet label={`Row ${row} allows`} symbols={step.rowCandidates} />
        <CandidateSet label={`Column ${column} allows`} symbols={step.columnCandidates} />
        <CandidateSet emphasized label="Common" symbols={step.commonCandidates} />
        <EliminatedSet symbols={step.eliminatedCandidates} />
        <p className="text-sm font-semibold text-on-surface">
          {step.commonCandidates.length === 1
            ? `Only ${step.symbol} appears in both sets.`
            : `${step.commonCandidates.join(" or ")} fit this cell. One last trace check identifies ${step.symbol}.`}
        </p>
      </div>
    );
  }
  if (step.type === "resolve_target") {
    return (
      <div className="mt-3 space-y-3">
        <LinePreview axis={step.placementScope ?? "row"} coordinate={step.coordinate} grid={step.previewGrid} />
        <PositionSet options={step.placementOptions} scope={step.placementScope} symbol={step.symbol} />
        <p className="text-sm font-semibold text-on-surface">
          Only {step.placementScope === "row" ? `Column ${column}` : `Row ${row}`} can take {step.symbol} here.
        </p>
      </div>
    );
  }
  if (step.type === "final") {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-sm text-muted-foreground">Place {step.symbol} in Row {row}, Column {column}.</p>
        <LinePreview answer={step.symbol} axis="row" coordinate={step.coordinate} grid={step.previewGrid} />
        <div className="flex items-center gap-2 rounded-md border border-success bg-success-container px-3 py-2 text-sm font-semibold text-success-container-foreground">
          <Check aria-hidden="true" className="h-4 w-4" />
          Correct answer: {step.symbol}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      <LinePreview
        answer={step.symbol}
        axis={step.placementScope === "column" ? "column" : "row"}
        coordinate={step.coordinate}
        grid={step.previewGrid}
      />
      {step.placementScope ? (
        <PositionSet options={step.placementOptions} scope={step.placementScope} symbol={step.symbol} />
      ) : (
        <>
          <CandidateSet label="Row options" symbols={step.rowCandidates} />
          <CandidateSet label="Column options" symbols={step.columnCandidates} />
          <CandidateSet emphasized label="Fits both" symbols={step.commonCandidates} />
          <EliminatedSet symbols={step.eliminatedCandidates} />
        </>
      )}
      <p className="text-sm font-semibold text-on-surface">
        {step.placementScope === "row"
          ? `Only Column ${column} can take ${step.symbol} in Row ${row}.`
          : step.placementScope === "column"
            ? `Only Row ${row} can take ${step.symbol} in Column ${column}.`
            : `Only ${step.symbol} fits Row ${row}, Column ${column}.`}
      </p>
    </div>
  );
}

function LinePreview({
  axis,
  coordinate,
  grid,
  answer,
}: {
  axis: "row" | "column";
  coordinate: LatinCoordinate;
  grid: VisibleLatinGrid;
  answer?: LatinSymbol;
}) {
  const values = axis === "row"
    ? grid[coordinate.row]
    : grid.map((row) => row[coordinate.column]);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {axis === "row" ? `Row ${coordinate.row + 1}` : `Column ${coordinate.column + 1}`}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="list">
        {values.map((value, index) => {
          const isTarget = axis === "row"
            ? index === coordinate.column
            : index === coordinate.row;
          const displayed = value ?? (isTarget ? "?" : "·");
          return (
            <span
              aria-label={`${axis === "row" ? `Column ${index + 1}` : `Row ${index + 1}`}: ${displayed === "·" ? "open" : displayed}`}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-workspace-border bg-surface-low px-2 font-semibold text-on-surface",
                isTarget && "border-primary bg-primary-muted ring-1 ring-primary",
                isTarget && answer && "border-success bg-success-container text-success-container-foreground ring-success",
              )}
              key={index}
              role="listitem"
            >
              {displayed}
              {isTarget && answer ? <Check aria-hidden="true" className="ml-1 h-3.5 w-3.5" /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SymbolLine({ label, symbols }: { label: string; symbols: LatinSymbol[] }) {
  return (
    <p className="text-sm text-on-surface">
      <span className="font-semibold">{label}:</span> {symbols.length ? symbols.join(", ") : "none"}
    </p>
  );
}

function CandidateSet({
  label,
  symbols,
  emphasized = false,
}: {
  label: string;
  symbols: LatinSymbol[];
  emphasized?: boolean;
}) {
  return (
    <div data-candidate-set={label.toLowerCase().replaceAll(" ", "-")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {symbols.map((symbol) => (
          <span
            className={cn(
              "inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border px-2.5 text-sm font-semibold",
              emphasized
                ? "border-success bg-success-container text-success-container-foreground"
                : "border-primary bg-primary-muted text-primary",
            )}
            key={symbol}
          >
            {symbol}
            {emphasized && symbols.length === 1 ? <Check aria-hidden="true" className="ml-1 h-3.5 w-3.5" /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function EliminatedSet({ symbols }: { symbols: LatinSymbol[] }) {
  if (!symbols.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eliminated</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {symbols.map((symbol) => (
          <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-workspace-border bg-surface-low px-2.5 text-sm font-semibold text-muted-foreground line-through" key={symbol}>
            {symbol}
          </span>
        ))}
      </div>
    </div>
  );
}

function PositionSet({
  options,
  scope,
  symbol,
}: {
  options: LatinCoordinate[];
  scope: "row" | "column" | null;
  symbol: LatinSymbol;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Places where {symbol} can go
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((coordinate) => (
          <span className="rounded-full border border-success bg-success-container px-3 py-1.5 text-sm font-semibold text-success-container-foreground" key={coordinateKey(coordinate)}>
            {scope === "row" ? `Column ${coordinate.column + 1}` : `Row ${coordinate.row + 1}`}
            <Check aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
          </span>
        ))}
      </div>
    </div>
  );
}

function coordinateKey(coordinate: LatinCoordinate): string {
  return `${coordinate.row}:${coordinate.column}`;
}

const SolvedSection = ({
  completedGrid,
  data,
  summary,
  answer,
  steps,
  ref,
}: {
  completedGrid: VisibleLatinGrid;
  data: LatinSquareStructuredData;
  summary: LatinWalkthroughSummary | null;
  answer: string;
  steps: readonly LatinExplanationStep[];
  ref: Ref<HTMLDivElement>;
}) => (
  <div
    className="mt-4 grid scroll-mt-4 gap-4 border-t border-workspace-separator pt-4 lg:grid-cols-[minmax(250px,340px)_minmax(0,1fr)]"
    ref={ref}
    tabIndex={-1}
  >
    <SolvedMatrix completedGrid={completedGrid} data={data} steps={steps} />
    <SummaryCard answer={answer} data={data} summary={summary} />
  </div>
);

function SolvedMatrix({
  completedGrid,
  data,
  steps,
}: {
  completedGrid: VisibleLatinGrid;
  data: LatinSquareStructuredData;
  steps: readonly LatinExplanationStep[];
}) {
  const proofCells = new Set(
    steps
      .filter((step) => step.type === "intermediate" || step.isTarget)
      .map((step) => `${step.coordinate.row}:${step.coordinate.column}`),
  );
  return (
    <figure className="rounded-lg border border-workspace-border bg-surface-lowest p-3">
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface">
        Complete solved matrix
      </figcaption>
      <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-px overflow-hidden rounded-md bg-workspace-border" role="grid" aria-label="Complete solved 5 by 5 Latin square with the target highlighted">
        <span aria-hidden="true" className="bg-surface-low p-1" />
        {Array.from({ length: 5 }, (_, column) => (
          <span className="bg-surface-low p-1 text-center text-[10px] font-semibold text-muted-foreground" key={column}>C{column + 1}</span>
        ))}
        {completedGrid.flatMap((row, rowIndex) => [
          <span className="flex items-center bg-surface-low px-1 text-[10px] font-semibold text-muted-foreground" key={`row:${rowIndex}`}>R{rowIndex + 1}</span>,
          ...row.map((symbol, columnIndex) => {
            const original = data.grid[rowIndex][columnIndex] !== null;
            const target = rowIndex === data.target.row && columnIndex === data.target.column;
            const usedInProof = proofCells.has(`${rowIndex}:${columnIndex}`);
            return (
              <span
                aria-label={`${target ? "Target cell, " : ""}Row ${rowIndex + 1} Column ${columnIndex + 1}, ${symbol}, ${original ? "given clue" : target ? "final answer" : usedInProof ? "reasoning placement" : "completed value"}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center bg-surface-lowest text-base font-semibold text-on-surface sm:text-lg",
                  !original && usedInProof && "bg-primary-muted text-primary",
                  target && "z-10 bg-success-container text-success-container-foreground ring-2 ring-inset ring-success",
                )}
                data-solved-cell-origin={original ? "given" : target ? "target" : usedInProof ? "reasoning-placement" : "completed"}
                key={`${rowIndex}:${columnIndex}`}
                role="gridcell"
              >
                {symbol}
                {target ? <Check aria-hidden="true" className="absolute right-0.5 top-0.5 h-3 w-3" /> : null}
              </span>
            );
          }),
        ])}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>Regular: given clue</span>
        <span className="text-primary">Tinted: reasoning placement</span>
        <span>Filled: verified completed value</span>
        <span className="font-semibold text-success-container-foreground">Highlighted: target answer</span>
      </div>
    </figure>
  );
}

function SummaryCard({
  summary,
  data,
  answer,
}: {
  summary: LatinWalkthroughSummary | null;
  data: LatinSquareStructuredData;
  answer: string;
}) {
  return (
    <aside className="rounded-lg border border-workspace-border bg-surface-lowest p-4" aria-label="Solution summary">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-on-surface">Summary</h5>
      <ul className="mt-2 space-y-1.5 text-sm text-on-surface">
        <li>The ? cell is Row {data.target.row + 1}, Column {data.target.column + 1}.</li>
        {summary ? (
          <>
            <li>Row allows: <strong>{summary.rowCandidates.join(" or ")}</strong></li>
            <li>Column allows: <strong>{summary.columnCandidates.join(" or ")}</strong></li>
            <li>
              {summary.finalReason === "intersection"
                ? <>Only <strong>{summary.answer}</strong> appears in both.</>
                : <>The final {summary.finalReason === "only_position_in_row" ? "row" : "column"} check leaves <strong>{summary.answer}</strong>.</>}
            </li>
          </>
        ) : null}
        <li className="flex items-center gap-1.5 font-semibold text-success">
          <Check aria-hidden="true" className="h-4 w-4" />
          Correct answer: {answer}
        </li>
      </ul>
    </aside>
  );
}
